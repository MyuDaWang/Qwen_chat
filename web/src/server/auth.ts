import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/src/server/db";
import { normalizePlan } from "@/src/server/plans";

const SESSION_COOKIE = "qwen_session";
const SESSION_DAYS = 14;

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, iterationsRaw, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2_sha256" || !iterationsRaw || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, Number(iterationsRaw), 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function configuredDefaultPlan() {
  return normalizePlan(process.env.DEFAULT_USER_PLAN);
}

export function configuredNewUserPlan() {
  return normalizePlan(process.env.DEFAULT_NEW_USER_PLAN ?? process.env.DEFAULT_USER_PLAN);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionTokenHash: sha256(token),
      sessionExpiresAt: expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.user
      .updateMany({
        where: { sessionTokenHash: sha256(token) },
        data: { sessionTokenHash: null, sessionExpiresAt: null }
      })
      .catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return prisma.user.findFirst({
    where: {
      sessionTokenHash: sha256(token),
      sessionExpiresAt: { gt: new Date() }
    }
  });
}
