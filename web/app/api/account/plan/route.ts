import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiError } from "@/src/shared/apiResponse";
import { prisma } from "@/src/server/db";
import { authErrorResponse } from "@/src/server/routeErrors";
import { getCurrentUser } from "@/src/server/users";

const planSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"])
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser.authenticated) {
      return apiError("FORBIDDEN", "请先登录账号", 403);
    }

    const input = planSchema.parse(await request.json());
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { plan: input.plan }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "会员配置不合法", 400);
    }
    return apiError("INTERNAL_ERROR", "更新会员状态失败", 500);
  }
}
