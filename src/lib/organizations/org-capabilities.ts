import { OrgType, DelegationType } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

export type OrgCapabilities = {
  capInstall: boolean;
  capMaintenance: boolean;
  capOm: boolean;
};

export type CompanyCapabilityInput = {
  install?: boolean;
  maintenance?: boolean;
  om?: boolean;
};

export type OrganizationWithCapabilities = {
  type: OrgType;
  capInstall?: boolean | null;
  capMaintenance?: boolean | null;
  capOm?: boolean | null;
};

export function parseCompanyCapabilities(input: CompanyCapabilityInput): OrgCapabilities {
  const capInstall = Boolean(input.install);
  const capMaintenance = Boolean(input.maintenance);
  const capOm = Boolean(input.om);

  if (!capInstall && !capMaintenance && !capOm) {
    throw new Error("Zgjidhni të paktën një funksion për kompaninë (instalim, mirëmbajtje ose OM).");
  }

  return { capInstall, capMaintenance, capOm };
}

export function capabilitiesFromFormData(formData: FormData): OrgCapabilities {
  return parseCompanyCapabilities({
    install: formData.get("capInstall") === "on" || formData.get("capInstall") === "true",
    maintenance: formData.get("capMaintenance") === "on" || formData.get("capMaintenance") === "true",
    om: formData.get("capOm") === "on" || formData.get("capOm") === "true",
  });
}

/** Vetë-regjistrim: niveli i vjetër ose COMPANY me checkbox-e. */
export function capabilitiesFromRegistration(input: {
  level: string;
  capInstall?: boolean;
  capMaintenance?: boolean;
  capOm?: boolean;
}): OrgCapabilities {
  if (input.level === "COMPANY") {
    return parseCompanyCapabilities({
      install: input.capInstall,
      maintenance: input.capMaintenance,
      om: input.capOm,
    });
  }

  if (input.level === "INSTALLER") {
    return { capInstall: true, capMaintenance: false, capOm: false };
  }
  if (input.level === "CERTIFIER") {
    return { capInstall: false, capMaintenance: false, capOm: true };
  }
  if (input.level === "MAINTENANCE") {
    return { capInstall: false, capMaintenance: true, capOm: false };
  }

  throw new Error("Niveli i kompanisë nuk është i vlefshëm.");
}

export function isCompanyRegistrationLevel(level: string): boolean {
  return level === "COMPANY" || level === "INSTALLER" || level === "CERTIFIER" || level === "MAINTENANCE";
}

/** Lexon funksionet e kompanisë; për regjistrimet e vjetra përdor `type` si fallback. */
export function capabilitiesFromOrg(org: OrganizationWithCapabilities): OrgCapabilities {
  const hasExplicit =
    org.capInstall === true || org.capMaintenance === true || org.capOm === true;

  if (hasExplicit) {
    return {
      capInstall: org.capInstall === true,
      capMaintenance: org.capMaintenance === true,
      capOm: org.capOm === true,
    };
  }

  return {
    capInstall: org.type === OrgType.INSTALLER,
    capMaintenance: org.type === OrgType.MAINTENANCE,
    capOm: org.type === OrgType.CERTIFIER,
  };
}

export function resolvePrimaryOrgType(caps: OrgCapabilities): OrgType {
  if (caps.capOm) return OrgType.CERTIFIER;
  if (caps.capInstall) return OrgType.INSTALLER;
  return OrgType.MAINTENANCE;
}

export function resolvePrimaryRoleCode(caps: OrgCapabilities): RoleCode {
  if (caps.capInstall) return ROLE_CODES.INSTALLER;
  if (caps.capOm) return ROLE_CODES.CERTIFIER;
  return ROLE_CODES.MAINTENANCE;
}

export function capabilityRoleCodes(caps: OrgCapabilities): RoleCode[] {
  const roles: RoleCode[] = [];
  if (caps.capInstall) roles.push(ROLE_CODES.INSTALLER);
  if (caps.capOm) roles.push(ROLE_CODES.CERTIFIER);
  if (caps.capMaintenance) roles.push(ROLE_CODES.MAINTENANCE);
  return roles;
}

export function capabilityLabels(caps: OrgCapabilities): string[] {
  const labels: string[] = [];
  if (caps.capInstall) labels.push("Instalim");
  if (caps.capMaintenance) labels.push("Mirëmbajtje");
  if (caps.capOm) labels.push("OM");
  return labels;
}

export function isLicensedServiceProvider(org: OrganizationWithCapabilities): boolean {
  const caps = capabilitiesFromOrg(org);
  return caps.capInstall || caps.capMaintenance || caps.capOm;
}

export function countActiveCapabilities(caps: OrgCapabilities): number {
  return Number(caps.capInstall) + Number(caps.capMaintenance) + Number(caps.capOm);
}

export type ServiceCapability = "install" | "maintenance" | "om";

type CapabilityContext = {
  roleCode: RoleCode;
  orgCapabilities?: OrgCapabilities | null;
};

/** Akses sipas funksionit të licencuar (jo vetëm roli primar i sesionit). */
export function hasServiceCapability(ctx: CapabilityContext, cap: ServiceCapability): boolean {
  const caps = ctx.orgCapabilities;
  if (cap === "install") {
    return ctx.roleCode === ROLE_CODES.INSTALLER || caps?.capInstall === true;
  }
  if (cap === "maintenance") {
    return ctx.roleCode === ROLE_CODES.MAINTENANCE || caps?.capMaintenance === true;
  }
  return ctx.roleCode === ROLE_CODES.CERTIFIER || caps?.capOm === true;
}

/** Mund të veprojë si roli i caktuar kur ka funksionin përkatës. */
export function canActAsRole(ctx: CapabilityContext, role: RoleCode): boolean {
  if (ctx.roleCode === role) return true;
  if (role === ROLE_CODES.INSTALLER) return hasServiceCapability(ctx, "install");
  if (role === ROLE_CODES.MAINTENANCE) return hasServiceCapability(ctx, "maintenance");
  if (role === ROLE_CODES.CERTIFIER) return hasServiceCapability(ctx, "om");
  return false;
}

export function isMultiCapabilityProvider(caps: OrgCapabilities | null | undefined): boolean {
  if (!caps) return false;
  return countActiveCapabilities(caps) > 1;
}

type ApplicationRoleContext = CapabilityContext & {
  activeOrgId: string;
};

/** Roli efektiv për workflow kur kompania ka më shumë se një funksion. */
export function resolveWorkflowRoleForApplication(
  ctx: ApplicationRoleContext,
  app: {
    installerOrgId?: string | null;
    certifierOrgId?: string | null;
    delegations?: {
      organizationId: string;
      accessType: DelegationType;
    }[];
  },
): RoleCode {
  const orgId = ctx.activeOrgId;
  const hasCertifierAssignment =
    app.certifierOrgId === orgId ||
    app.delegations?.some(
      (d) => d.organizationId === orgId && d.accessType === DelegationType.CERTIFIER,
    );
  const hasInstallerAssignment =
    app.installerOrgId === orgId ||
    app.delegations?.some(
      (d) => d.organizationId === orgId && d.accessType === DelegationType.INSTALLER,
    );

  if (canActAsRole(ctx, ROLE_CODES.CERTIFIER) && hasCertifierAssignment) {
    return ROLE_CODES.CERTIFIER;
  }
  if (canActAsRole(ctx, ROLE_CODES.INSTALLER) && hasInstallerAssignment) {
    return ROLE_CODES.INSTALLER;
  }
  if (canActAsRole(ctx, ROLE_CODES.OWNER)) return ROLE_CODES.OWNER;
  if (canActAsRole(ctx, ROLE_CODES.INSTALLER)) return ROLE_CODES.INSTALLER;
  if (canActAsRole(ctx, ROLE_CODES.CERTIFIER)) return ROLE_CODES.CERTIFIER;
  return ctx.roleCode;
}
