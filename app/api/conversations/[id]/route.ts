import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/src/shared/apiResponse";
import { deleteConversation, getConversationForUser } from "@/src/server/repositories/conversationRepository";
import { authErrorResponse } from "@/src/server/routeErrors";
import { getCurrentUser } from "@/src/server/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const user = await getCurrentUser();
    const conversation = await getConversationForUser(id, user.id);
    if (!conversation) {
      return apiError("NOT_FOUND", "会话不存在", 404);
    }
    await deleteConversation(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return apiError("NOT_FOUND", "会话不存在", 404);
    }
    return apiError("INTERNAL_ERROR", "删除会话失败", 500);
  }
}
