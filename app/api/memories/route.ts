import { ZodError } from "zod";
import { apiError } from "@/src/shared/apiResponse";
import { createMemory, listMemories, memoryCreateSchema } from "@/src/server/userPreferences";
import { authErrorResponse } from "@/src/server/routeErrors";
import { getCurrentUser } from "@/src/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const memories = await listMemories(user.id);
    return Response.json({ memories });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return apiError("INTERNAL_ERROR", "读取记忆失败", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const input = memoryCreateSchema.parse(await request.json());
    const memory = await createMemory(user.id, input.content, "manual");
    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "记忆内容不合法", 400);
    }
    return apiError("INTERNAL_ERROR", "创建记忆失败", 500);
  }
}
