import { describe, expect, it } from "vitest";
import {
  isNiptReadyForRegistration,
  niptRegistrationFeedbackMessage,
} from "@/lib/registration/nipt-registration-feedback";

describe("niptRegistrationFeedbackMessage", () => {
  it("explains maintenance-only path", () => {
    expect(niptRegistrationFeedbackMessage({ status: "NOT_IN_DIRECTORATE" })?.text).toContain(
      "mirëmbajtjeje",
    );
  });

  it("lists directorate capabilities", () => {
    const message = niptRegistrationFeedbackMessage({
      status: "DIRECTORATE_REGISTERED",
      orgId: "org-1",
      orgName: "Demo Sh.p.k.",
      nipt: "M33333333E",
      capabilities: { capInstall: true, capOm: true },
      licenses: {
        installLicenseNumber: "INST-001",
        omLicenseNumber: "OM-001",
      },
    });
    expect(message?.text).toContain("Demo Sh.p.k.");
    expect(message?.text).toContain("instalim");
  });
});

describe("isNiptReadyForRegistration", () => {
  it("accepts directorate and maintenance-only lookups", () => {
    expect(
      isNiptReadyForRegistration({
        status: "DIRECTORATE_REGISTERED",
        orgId: "1",
        orgName: "A",
        nipt: "M33333333E",
        capabilities: { capInstall: true, capOm: false },
        licenses: { installLicenseNumber: "INST-001" },
      }),
    ).toBe(true);

    expect(isNiptReadyForRegistration({ status: "NOT_IN_DIRECTORATE" })).toBe(true);
    expect(isNiptReadyForRegistration({ status: "TOO_SHORT" })).toBe(false);
  });
});
