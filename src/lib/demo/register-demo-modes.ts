import type { RegisterOwnerEntityType } from "@/lib/registration/owner-entity-role";
import { registerOwnerEntityTypeLabel } from "@/lib/registration/owner-entity-role";
import {
  registerDemoCompanyModeLabel,
  type RegisterDemoCompanyMode,
} from "@/lib/demo/register-demo-prefill-service";

export type RegisterDemoOwnerMode = "administrator" | "construction";

export type RegisterDemoSelection =
  | { category: "owner"; mode: RegisterDemoOwnerMode }
  | { category: "company"; mode: RegisterDemoCompanyMode };

export const REGISTER_DEMO_OWNER_OPTIONS: {
  mode: RegisterDemoOwnerMode;
  role: RegisterOwnerEntityType;
}[] = [
  { mode: "administrator", role: "ADMINISTRATOR" },
  { mode: "construction", role: "CONSTRUCTION_COMPANY" },
];

export const REGISTER_DEMO_COMPANY_OPTIONS: RegisterDemoCompanyMode[] = [
  "install",
  "om",
  "installOm",
  "maintenance",
];

export function registerDemoSelectionLabel(selection: RegisterDemoSelection): string {
  if (selection.category === "owner") {
    const role = REGISTER_DEMO_OWNER_OPTIONS.find((option) => option.mode === selection.mode)?.role;
    return role ? registerOwnerEntityTypeLabel(role) : selection.mode;
  }
  return registerDemoCompanyModeLabel(selection.mode);
}

export function ownerRoleForDemoMode(mode: RegisterDemoOwnerMode): RegisterOwnerEntityType {
  return mode === "administrator" ? "ADMINISTRATOR" : "CONSTRUCTION_COMPANY";
}

export function defaultRegisterDemoSelection(
  initial?: Partial<{ companyMode: RegisterDemoCompanyMode; ownerMode: RegisterDemoOwnerMode }>,
): RegisterDemoSelection {
  if (initial?.ownerMode) {
    return { category: "owner", mode: initial.ownerMode };
  }
  return { category: "company", mode: initial?.companyMode ?? "install" };
}
