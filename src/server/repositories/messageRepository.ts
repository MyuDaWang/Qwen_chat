import type { Message } from "@prisma/client";
import { prisma } from "@/src/server/db";
import type { MessageContent, MessageDTO, MessageRole, MessageStatus } from "@/src/shared/types";

export function serializeMessage(message: Message): MessageDTO {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as MessageRole,
    content: JSON.parse(message.content) as MessageContent,
    status: message.status as MessageStatus,
    model: message.model,
    error: message.error,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString()
  };
}

export async function listMessages(conversationId: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" }
  });
  return messages.map(serializeMessage);
}

export async function createMessage(data: {
  conversationId: string;
  role: MessageRole;
  content: MessageContent;
  status: MessageStatus;
  model?: string;
}) {
  const message = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      role: data.role,
      content: JSON.stringify(data.content),
      status: data.status,
      model: data.model
    }
  });
  return serializeMessage(message);
}

export async function createUserMessageWithAttachments(data: {
  conversationId: string;
  content: MessageContent;
}) {
  const message = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      role: "user",
      content: JSON.stringify(data.content),
      status: "done"
    }
  });

  const attachmentBlocks = data.content.filter((block) => block.type === "image" || block.type === "file");
  if (attachmentBlocks.length > 0) {
    await prisma.messageAttachment.createMany({
      data: attachmentBlocks.map((block) => ({
        messageId: message.id,
        type: block.type,
        url: block.url,
        mimeType: block.mimeType,
        size: block.size,
        width: block.type === "image" ? block.width : undefined,
        height: block.type === "image" ? block.height : undefined,
        originalName: block.originalName
      }))
    });
  }

  return serializeMessage(message);
}

export async function updateMessageDone(id: string, content: MessageContent) {
  const message = await prisma.message.update({
    where: { id },
    data: { content: JSON.stringify(content), status: "done", error: null }
  });
  return serializeMessage(message);
}

export async function updateMessageStatus(id: string, status: MessageStatus, error?: string) {
  const message = await prisma.message.update({
    where: { id },
    data: { status, error }
  });
  return serializeMessage(message);
}

export async function recentDoneMessages(conversationId: string, take = 20) {
  const messages = await prisma.message.findMany({
    where: { conversationId, status: "done" },
    orderBy: { createdAt: "desc" },
    take
  });
  return messages.reverse().map(serializeMessage);
}
