import { afterEach, describe, expect, it } from "vitest";
import { decideRollout } from "@/src/server/rollout";

describe("feature rollout", () => {
  afterEach(() => {
    delete process.env.FEATURE_IMAGE_GENERATION_ENABLED;
    delete process.env.FEATURE_IMAGE_GENERATION_PERCENT;
    delete process.env.FEATURE_IMAGE_GENERATION_ALLOWLIST;
  });

  it("allows features by default", () => {
    expect(decideRollout("image_generation", "CUST-1")).toMatchObject({
      enabled: true,
      reason: "percentage",
      percentage: 100
    });
  });

  it("can disable a feature globally", () => {
    process.env.FEATURE_IMAGE_GENERATION_ENABLED = "0";

    expect(decideRollout("image_generation", "CUST-1")).toMatchObject({
      enabled: false,
      reason: "disabled"
    });
  });

  it("allows listed customers even when percentage is zero", () => {
    process.env.FEATURE_IMAGE_GENERATION_PERCENT = "0";
    process.env.FEATURE_IMAGE_GENERATION_ALLOWLIST = "CUST-2,CUST-3";

    expect(decideRollout("image_generation", "CUST-2")).toMatchObject({
      enabled: true,
      reason: "allowlist"
    });
    expect(decideRollout("image_generation", "CUST-4")).toMatchObject({
      enabled: false,
      reason: "percentage",
      percentage: 0
    });
  });
});

