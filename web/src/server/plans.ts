export const userPlans = ["free", "pro", "enterprise"] as const;

export type UserPlan = (typeof userPlans)[number];

export const planNames: Record<UserPlan, string> = {
  free: "普通用户",
  pro: "会员",
  enterprise: "企业会员"
};

const planRank: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  enterprise: 2
};

export function normalizePlan(plan?: string | null): UserPlan {
  return userPlans.includes(plan as UserPlan) ? (plan as UserPlan) : "enterprise";
}

export function canUsePlan(currentPlan: UserPlan, requiredPlan: UserPlan) {
  return planRank[currentPlan] >= planRank[requiredPlan];
}
