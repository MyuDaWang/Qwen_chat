import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiError } from "@/src/shared/apiResponse";
import { createSession, verifyPassword } from "@/src/server/auth";
import { prisma } from "@/src/server/db";

const loginSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码")
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return apiError("VALIDATION_ERROR", "邮箱或密码不正确", 400);
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "登录参数不合法", 400);
    }
    return apiError("INTERNAL_ERROR", "登录失败", 500);
  }
}
