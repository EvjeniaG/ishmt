import { describe, expect, it } from "vitest";
import {
  defaultRegisterDemoSelection,
  ownerRoleForDemoMode,
  registerDemoSelectionLabel,
} from "@/lib/demo/register-demo-modes";

describe("registerDemoSelectionLabel", () => {
  it("labels owner and company demo modes", () => {
    expect(registerDemoSelectionLabel({ category: "owner", mode: "administrator" })).toBe(
      "Administrator Pallati",
    );
    expect(registerDemoSelectionLabel({ category: "owner", mode: "construction" })).toBe(
      "Kompani Ndërtimi",
    );
    expect(registerDemoSelectionLabel({ category: "company", mode: "install" })).toBe("Instalues");
    expect(registerDemoSelectionLabel({ category: "company", mode: "installOm" })).toBe(
      "Instalim + OM",
    );
  });
});

describe("defaultRegisterDemoSelection", () => {
  it("prefers owner mode when provided", () => {
    expect(defaultRegisterDemoSelection({ ownerMode: "construction" })).toEqual({
      category: "owner",
      mode: "construction",
    });
  });
});

describe("ownerRoleForDemoMode", () => {
  it("maps demo owner modes to registration roles", () => {
    expect(ownerRoleForDemoMode("administrator")).toBe("ADMINISTRATOR");
    expect(ownerRoleForDemoMode("construction")).toBe("CONSTRUCTION_COMPANY");
  });
});
