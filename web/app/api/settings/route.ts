import { ZodError } from "zod";
import { apiError } from "@/src/shared/apiResponse";
import { getPreference, listMemories, updatePreference, updatePreferenceSchema } from "@/src/server/userPreferences";
import { authErrorResponse } from "@/src/server/routeErrors";
import { getCurrentUser } from "@/src/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const [preferences, memories] = await Promise.all([getPreference(user.id), listMemories(user.id)]);
    return Response.json({ preferences, memories });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return apiError("INTERNAL_ERROR", "读取设置失败", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    const input = updatePreferenceSchema.parse(await request.json());
    const preferences = await updatePreference(user.id, input);
    return Response.json({ preferences });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "设置参数不合法", 400);
    }
    return apiError("INTERNAL_ERROR", "保存设置失败", 500);
  }
}
