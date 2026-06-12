import { NextResponse } from "next/server";
import { apiError } from "@/src/shared/apiResponse";
import { getConversationForUser } from "@/src/server/repositories/conversationRepository";
import { listMessages } from "@/src/server/repositories/messageRepository";
import { authErrorResponse } from "@/src/server/routeErrors";
import { getCurrentUser } from "@/src/server/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    const conversation = await getConversationForUser(id, user.id);
    if (!conversation) {
      return apiError("NOT_FOUND", "会话不存在", 404);
    }

    const messages = await listMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return apiError("INTERNAL_ERROR", "读取消息失败", 500);
  }
}
