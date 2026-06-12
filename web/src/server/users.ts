import { getAuthenticatedUser } from "@/src/server/auth";
import type { ChatModel } from "@/src/ai/models";
import { canUsePlan, normalizePlan, type UserPlan } from "@/src/server/plans";

export type CurrentUser = {
  id: string;
  customerId: string;
  name: string;
  plan: UserPlan;
};

export class AuthRequiredError extends Error {
  constructor() {
    super("请先登录账号");
    this.name = "AuthRequiredError";
  }
}

export function isAuthRequiredError(error: unknown): error is AuthRequiredError {
  return error instanceof AuthRequiredError;
}

function allowAnonymousLocalUser() {
  if (process.env.ALLOW_ANONYMOUS_LOCAL_USER === "1") return true;
  if (process.env.ALLOW_ANONYMOUS_LOCAL_USER === "0") return false;
  return process.env.NODE_ENV !== "production";
}

export async function getCurrentUser(): Promise<CurrentUser & { authenticated: boolean }> {
  const authUser = await getAuthenticatedUser();
  if (authUser) {
    return {
      id: authUser.id,
      customerId: authUser.customerId,
      name: authUser.name,
      plan: normalizePlan(authUser.plan),
      authenticated: true
    };
  }

  if (!allowAnonymousLocalUser()) {
    throw new AuthRequiredError();
  }

  return {
    id: process.env.DEFAULT_USER_ID || "local-user",
    customerId: process.env.DEFAULT_CUSTOMER_ID || "CUST-LOCAL-001",
    name: process.env.DEFAULT_USER_NAME || "本地企业用户",
    plan: normalizePlan(process.env.DEFAULT_USER_PLAN),
    authenticated: false
  };
}

export function canUseModel(user: CurrentUser, model: ChatModel) {
  return canUsePlan(user.plan, model.requiredPlan);
}
