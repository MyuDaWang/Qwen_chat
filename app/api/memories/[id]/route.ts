import { ZodError } from "zod";
import { apiError } from "@/src/shared/apiResponse";
import { deleteMemory, memoryPatchSchema, updateMemory } from "@/src/server/userPreferences";
import { authErrorResponse } from "@/src/server/routeErrors";
import { getCurrentUser } from "@/src/server/users";
import { conversationIdSchema } from "@/src/shared/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = conversationIdSchema.parse(await params);
    const user = await getCurrentUser();
    const input = memoryPatchSchema.parse(await request.json());
    const memory = await updateMemory(user.id, id, input);
    if (!memory) return apiError("NOT_FOUND", "记忆不存在", 404);
    return Response.json({ memory });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "记忆参数不合法", 400);
    }
    return apiError("INTERNAL_ERROR", "更新记忆失败", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = conversationIdSchema.parse(await params);
    const user = await getCurrentUser();
    await deleteMemory(user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "记忆参数不合法", 400);
    }
    return apiError("INTERNAL_ERROR", "删除记忆失败", 500);
  }
}
