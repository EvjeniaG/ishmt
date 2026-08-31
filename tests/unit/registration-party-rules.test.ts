import { describe, expect, it } from "vitest";
import {
  assertInstallerDistinctFromCertifier,
  INSTALLER_CERTIFIER_CONFLICT_MESSAGE,
} from "@/lib/registration/registration-party-rules";

describe("assertInstallerDistinctFromCertifier", () => {
  it("allows distinct org ids", () => {
    expect(() =>
      assertInstallerDistinctFromCertifier("installer-1", "certifier-2"),
    ).not.toThrow();
  });

  it("allows missing org ids", () => {
    expect(() => assertInstallerDistinctFromCertifier(null, "certifier-2")).not.toThrow();
    expect(() => assertInstallerDistinctFromCertifier("installer-1", undefined)).not.toThrow();
  });

  it("rejects same org for installer and certifier", () => {
    expect(() => assertInstallerDistinctFromCertifier("same-org", "same-org")).toThrow(
      INSTALLER_CERTIFIER_CONFLICT_MESSAGE,
    );
  });
});
