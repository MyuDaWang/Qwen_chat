import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiError } from "@/src/shared/apiResponse";
import { configuredNewUserPlan, createSession, hashPassword } from "@/src/server/auth";
import { prisma } from "@/src/server/db";

const registerSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").max(120),
  password: z.string().min(8, "密码至少 8 位").max(80),
  name: z.string().trim().min(1).max(40)
});

function customerId() {
  return `CUST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: hashPassword(input.password),
        customerId: customerId(),
        plan: configuredNewUserPlan()
      }
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "注册参数不合法", 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("VALIDATION_ERROR", "该邮箱已注册", 400);
    }
    return apiError("INTERNAL_ERROR", "注册失败", 500);
  }
}
