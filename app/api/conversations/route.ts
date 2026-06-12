import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiError } from "@/src/shared/apiResponse";
import { createConversation, listConversationsForUser } from "@/src/server/repositories/conversationRepository";
import { authErrorResponse } from "@/src/server/routeErrors";
import { getCurrentUser } from "@/src/server/users";
import { createConversationSchema } from "@/src/shared/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const conversations = await listConversationsForUser(user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return apiError("INTERNAL_ERROR", "读取会话失败", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = createConversationSchema.parse(body);
    const user = await getCurrentUser();
    const conversation = await createConversation(input.title, user.id);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "请求参数不合法", 400);
    }
    return apiError("INTERNAL_ERROR", "创建会话失败", 500);
  }
}
