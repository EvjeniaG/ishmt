import { describe, expect, it } from "vitest";
import {
  installLicenseFeedbackMessage,
  isOmLicenseReadyForRegistration,
  omLicenseFeedbackMessage,
} from "@/lib/registration/om-license-feedback";

describe("omLicenseFeedbackMessage", () => {
  it("returns not found message", () => {
    expect(omLicenseFeedbackMessage({ status: "NOT_FOUND" })?.text).toContain(
      "nuk ekziston",
    );
  });

  it("returns active account message", () => {
    expect(
      omLicenseFeedbackMessage({
        status: "HAS_ACTIVE_ACCOUNT",
        orgName: "OM Certifikim Sh.p.k.",
      })?.text,
    ).toContain("llogari aktive për këtë kompani");
  });

  it("returns available message before NIPT verification", () => {
    expect(
      omLicenseFeedbackMessage({
        status: "AVAILABLE",
        orgName: "OM Demo Regjistrim Sh.p.k.",
        nipt: "M33333333E",
        niptVerified: false,
      })?.text,
    ).toContain("Plotësoni NIPT-in");
  });

  it("marks registration ready only when NIPT is verified", () => {
    expect(
      isOmLicenseReadyForRegistration({
        status: "AVAILABLE",
        orgName: "OM Demo Regjistrim Sh.p.k.",
        nipt: "M33333333E",
        niptVerified: true,
      }),
    ).toBe(true);

    expect(
      isOmLicenseReadyForRegistration({
        status: "AVAILABLE",
        orgName: "OM Demo Regjistrim Sh.p.k.",
        nipt: "M33333333E",
        niptVerified: false,
      }),
    ).toBe(false);
  });
});

describe("installLicenseFeedbackMessage", () => {
  it("returns install-specific active account message", () => {
    expect(
      installLicenseFeedbackMessage({
        status: "HAS_ACTIVE_ACCOUNT",
        orgName: "Instalim Demo Sh.p.k.",
      })?.text,
    ).toContain("llogari aktive për këtë kompani");
  });
});
