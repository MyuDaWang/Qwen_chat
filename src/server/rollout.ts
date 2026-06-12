function parsePercentage(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

function hashToBucket(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash % 100;
}

function allowlistContains(value: string, allowlist: string | undefined) {
  return (allowlist ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(value);
}

export type RolloutDecision = {
  enabled: boolean;
  reason: "disabled" | "allowlist" | "percentage";
  percentage: number;
};

export function decideRollout(feature: string, identity: string): RolloutDecision {
  const envPrefix = `FEATURE_${feature.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const enabled = process.env[`${envPrefix}_ENABLED`];
  if (enabled === "0" || enabled?.toLowerCase() === "false") {
    return { enabled: false, reason: "disabled", percentage: 0 };
  }

  const allowlist = process.env[`${envPrefix}_ALLOWLIST`];
  if (allowlistContains(identity, allowlist)) {
    return { enabled: true, reason: "allowlist", percentage: 100 };
  }

  const percentage = parsePercentage(process.env[`${envPrefix}_PERCENT`], 100);
  return {
    enabled: hashToBucket(`${feature}:${identity}`) < percentage,
    reason: "percentage",
    percentage
  };
}

