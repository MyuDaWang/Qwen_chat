import { chatModels } from "@/src/ai/models";
import { apiError } from "@/src/shared/apiResponse";
import { planNames } from "@/src/server/plans";
import { authErrorResponse } from "@/src/server/routeErrors";
import { canUseModel, getCurrentUser } from "@/src/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    return Response.json({
      user: {
        id: user.id,
        customerId: user.customerId,
        name: user.name,
        plan: user.plan,
        planName: planNames[user.plan],
        authenticated: user.authenticated
      },
      models: chatModels.map((model) => ({
        id: model.id,
        allowed: canUseModel(user, model),
        requiredPlan: model.requiredPlan,
        requiredPlanName: planNames[model.requiredPlan]
      }))
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    return apiError("INTERNAL_ERROR", "读取用户信息失败", 500);
  }
}
