import { ZodError } from "zod";
import { apiError, getErrorMessage } from "@/src/shared/apiResponse";
import { buildAgentSystemPrompt } from "@/src/ai/agents";
import { buildContext, contentToPlainText } from "@/src/ai/contextBuilder";
import { generateQwenImage } from "@/src/ai/imageGeneration";
import { getLLMProvider } from "@/src/ai/llm";
import { LLMProviderError } from "@/src/ai/llm/types";
import { getChatModel } from "@/src/ai/models";
import { createTraceId, logEvent, safeErrorName } from "@/src/server/observability";
import { composeChatSystemPrompt } from "@/src/server/chatPrompt";
import { canUsePlan } from "@/src/server/plans";
import { getConversation, touchConversation } from "@/src/server/repositories/conversationRepository";
import {
  createMessage,
  createUserMessageWithAttachments,
  recentDoneMessages,
  updateMessageDone,
  updateMessageStatus
} from "@/src/server/repositories/messageRepository";
import { authErrorResponse } from "@/src/server/routeErrors";
import { decideRollout } from "@/src/server/rollout";
import { buildPersonalizationPrompt, getPreference, listEnabledMemories, maybeRememberFromUserText } from "@/src/server/userPreferences";
import { canUseModel, getCurrentUser } from "@/src/server/users";
import { encodeStreamEvent } from "@/src/shared/streamProtocol";
import type { MessageContent } from "@/src/shared/types";
import { chatRequestSchema } from "@/src/shared/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "图片对话";
  return normalized.slice(0, 28);
}

export async function POST(request: Request) {
  const traceId = request.headers.get("x-trace-id") || createTraceId("chat");
  const startedAt = Date.now();
  let body: unknown;

  try {
    body = await request.json();
    const input = chatRequestSchema.parse(body);
    const currentUser = await getCurrentUser();

    logEvent("info", "chat.request.started", {
      traceId,
      conversationId: input.conversationId,
      customerId: currentUser.customerId,
      modelId: input.modelId ?? null,
      agentId: input.agentId ?? null,
      hasText: Boolean(input.text.trim()),
      attachmentCount: input.images.length
    });

    const conversation = await getConversation(input.conversationId);
    if (!conversation) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "conversation_not_found" });
      return apiError("NOT_FOUND", "会话不存在", 404);
    }
    if (conversation.userId !== currentUser.id) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "conversation_owner_mismatch" });
      return apiError("NOT_FOUND", "会话不存在", 404);
    }

    const userContent: MessageContent = [
      ...(input.text.trim() ? [{ type: "text" as const, text: input.text.trim() }] : []),
      ...input.images
    ];
    const latestUserText = contentToPlainText(userContent);

    const selectedModel = getChatModel(input.modelId);
    const provider = getLLMProvider();
    const hasImage = userContent.some((block) => block.type === "image");
    const isImageGeneration = input.agentId === "image_generation";

    if (isImageGeneration) {
      const rollout = decideRollout("image_generation", currentUser.customerId);
      logEvent("info", "chat.rollout.checked", {
        traceId,
        feature: "image_generation",
        enabled: rollout.enabled,
        reason: rollout.reason,
        percentage: rollout.percentage
      });
      if (!rollout.enabled) {
        return apiError("FORBIDDEN", "图像生成 Agent 暂未对当前客户开放。", 403);
      }
    }

    if (isImageGeneration && !canUsePlan(currentUser.plan, "pro")) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "plan_forbidden", requiredPlan: "pro" });
      return apiError("FORBIDDEN", "图像生成 Agent 需要会员及以上账号。", 403);
    }
    if (isImageGeneration && !input.text.trim()) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "image_generation_empty_prompt" });
      return apiError("VALIDATION_ERROR", "请输入图像生成提示词。", 400);
    }
    if (!isImageGeneration && !canUseModel(currentUser, selectedModel)) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "model_forbidden", model: selectedModel.id });
      return apiError("FORBIDDEN", `当前客户等级不能使用 ${selectedModel.name}，请切换可用模型或升级会员。`, 403);
    }
    if (!isImageGeneration && hasImage && !selectedModel.supportsImages) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "model_without_image_support", model: selectedModel.id });
      return apiError("LLM_PROVIDER_ERROR", `当前选择的 ${selectedModel.name} 不支持图片输入，请切换到 Qwen3 VL Plus。`, 400);
    }
    if (!isImageGeneration && hasImage && !provider.supportsImages) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "provider_without_image_support", provider: provider.name });
      return apiError("LLM_PROVIDER_ERROR", "当前 provider 未启用图片能力，请配置视觉模型并设置 MODEL_SUPPORTS_IMAGES=1。", 400);
    }

    await createUserMessageWithAttachments({
      conversationId: input.conversationId,
      content: userContent
    });

    if (conversation.title === "新会话") {
      await touchConversation(conversation.id, titleFromText(latestUserText));
    } else {
      await touchConversation(conversation.id);
    }
    if (latestUserText) {
      await maybeRememberFromUserText(currentUser.id, latestUserText).catch(() => null);
    }

    const assistantMessage = await createMessage({
      conversationId: input.conversationId,
      role: "assistant",
      content: [],
      status: "streaming",
      model: isImageGeneration ? process.env.IMAGE_GENERATION_MODEL || "qwen-image-2.0-pro" : selectedModel.providerModel
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        const requestSignal = request.signal;

        const write = (event: string) => {
          controller.enqueue(encoder.encode(event));
        };
        const writeStatus = (message: string) => {
          write(
            encodeStreamEvent({
              event: "status",
              data: {
                conversationId: input.conversationId,
                messageId: assistantMessage.id,
                message
              }
            })
          );
        };

        write(
          encodeStreamEvent({
            event: "message_created",
            data: {
              conversationId: input.conversationId,
              assistantMessageId: assistantMessage.id
            }
          })
        );

        try {
          if (isImageGeneration) {
            logEvent("info", "chat.image_generation.started", {
              traceId,
              conversationId: input.conversationId,
              messageId: assistantMessage.id
            });
            writeStatus("正在准备图像生成任务");

            const generated = await generateQwenImage(input.text.trim(), writeStatus);
            const finalText = [
              "图像生成完成。",
              `模型：${generated.model}`,
              generated.requestId ? `请求 ID：${generated.requestId}` : ""
            ]
              .filter(Boolean)
              .join("\n");
            const delta = `\n${finalText}`;
            fullText += delta;
            write(
              encodeStreamEvent({
                event: "delta",
                data: {
                  conversationId: input.conversationId,
                  messageId: assistantMessage.id,
                  delta
                }
              })
            );

            const finalContent: MessageContent = [
              { type: "image", url: generated.url, mimeType: generated.mimeType, size: generated.size, width: generated.width, height: generated.height, alt: input.text.trim() },
              { type: "text", text: finalText }
            ];
            await updateMessageDone(assistantMessage.id, finalContent);
            await touchConversation(input.conversationId);
            logEvent("info", "chat.image_generation.completed", {
              traceId,
              conversationId: input.conversationId,
              messageId: assistantMessage.id,
              durationMs: Date.now() - startedAt
            });
            write(
              encodeStreamEvent({
                event: "done",
                data: {
                  conversationId: input.conversationId,
                  messageId: assistantMessage.id,
                  content: finalContent
                }
              })
            );
            controller.close();
            return;
          }

          writeStatus("正在构建上下文");
          logEvent("info", "chat.context.started", { traceId, conversationId: input.conversationId });
          const history = await recentDoneMessages(input.conversationId, 20);
          const [preference, memories] = await Promise.all([getPreference(currentUser.id), listEnabledMemories(currentUser.id, 12)]);
          const context = buildContext(history.map((message) => ({
            role: message.role,
            content: message.content,
            status: message.status,
            createdAt: message.createdAt
          })));
          const agentSystemPrompt = await buildAgentSystemPrompt(input.agentId, latestUserText);
          const personalizationPrompt = buildPersonalizationPrompt(preference, memories);
          const systemContext = [
            {
              role: "system" as const,
              content: [
                {
                  type: "text" as const,
                  text: composeChatSystemPrompt({
                    agentSystemPrompt,
                    personalizationPrompt,
                    customerId: currentUser.customerId,
                    plan: currentUser.plan,
                    modelName: selectedModel.name
                  })
                }
              ]
            },
            ...context
          ];
          logEvent("info", "chat.context.completed", {
            traceId,
            conversationId: input.conversationId,
            historyMessages: history.length,
            contextMessages: context.length,
            memories: memories.length
          });

          writeStatus("正在等待模型响应");
          logEvent("info", "chat.provider.started", {
            traceId,
            provider: provider.name,
            model: selectedModel.providerModel,
            supportsImages: provider.supportsImages
          });
          let hasReasoning = false;
          for await (const event of provider.streamChat({
            messages: systemContext,
            model: selectedModel.providerModel,
            enableThinking: input.enableThinking,
            signal: requestSignal
          })) {
            if (requestSignal.aborted) {
              throw new DOMException("Aborted", "AbortError");
            }
            if (event.type === "reasoning_delta") {
              if (!hasReasoning) {
                hasReasoning = true;
                writeStatus("思考中：");
              }
            }
            if (event.type === "delta") {
              fullText += event.delta;
              write(
                encodeStreamEvent({
                  event: "delta",
                  data: {
                    conversationId: input.conversationId,
                    messageId: assistantMessage.id,
                    delta: event.delta
                  }
                })
              );
            }
          }

          await updateMessageDone(assistantMessage.id, [{ type: "text", text: fullText }]);
          await touchConversation(input.conversationId);
          logEvent("info", "chat.request.completed", {
            traceId,
            conversationId: input.conversationId,
            messageId: assistantMessage.id,
            outputChars: fullText.length,
            durationMs: Date.now() - startedAt
          });
          write(
            encodeStreamEvent({
              event: "done",
              data: {
                conversationId: input.conversationId,
                messageId: assistantMessage.id
              }
            })
          );
          controller.close();
        } catch (error) {
          const aborted = error instanceof DOMException && error.name === "AbortError";
          if (aborted || requestSignal.aborted) {
            await updateMessageStatus(assistantMessage.id, "cancelled", "用户停止生成");
            logEvent("warn", "chat.request.cancelled", {
              traceId,
              conversationId: input.conversationId,
              messageId: assistantMessage.id,
              durationMs: Date.now() - startedAt
            });
            write(
              encodeStreamEvent({
                event: "cancelled",
                data: {
                  conversationId: input.conversationId,
                  messageId: assistantMessage.id
                }
              })
            );
            controller.close();
            return;
          }

          const message = error instanceof LLMProviderError ? error.message : getErrorMessage(error);
          await updateMessageStatus(assistantMessage.id, "error", message);
          logEvent("error", "chat.request.failed", {
            traceId,
            conversationId: input.conversationId,
            messageId: assistantMessage.id,
            errorName: safeErrorName(error),
            message,
            durationMs: Date.now() - startedAt
          });
          write(
            encodeStreamEvent({
              event: "error",
              data: {
                conversationId: input.conversationId,
                messageId: assistantMessage.id,
                message
              }
            })
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Trace-Id": traceId
      }
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;

    if (error instanceof ZodError) {
      logEvent("warn", "chat.request.rejected", { traceId, reason: "validation_error", message: error.issues[0]?.message ?? "请求参数不合法" });
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "请求参数不合法", 400);
    }
    logEvent("error", "chat.request.failed_before_stream", {
      traceId,
      errorName: safeErrorName(error),
      message: getErrorMessage(error),
      durationMs: Date.now() - startedAt
    });
    return apiError("INTERNAL_ERROR", "发送消息失败", 500);
  }
}
