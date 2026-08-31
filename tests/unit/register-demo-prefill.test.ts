import { describe, expect, it } from "vitest";
import {
  registerDemoCompanyModeLabel,
  type RegisterDemoCompanyMode,
} from "@/lib/demo/register-demo-prefill-service";

describe("registerDemoCompanyModeLabel", () => {
  it("maps demo modes to Albanian labels", () => {
    const modes: RegisterDemoCompanyMode[] = ["install", "om", "installOm", "maintenance"];
    expect(modes.map(registerDemoCompanyModeLabel)).toEqual([
      "Instalues",
      "OM / certifikues",
      "Instalim + OM",
      "Mirëmbajtje",
    ]);
  });
});
