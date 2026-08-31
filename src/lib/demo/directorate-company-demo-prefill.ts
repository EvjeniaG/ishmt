import { db } from "@/lib/db";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";

export type DirectorateCompanyDemoMode = "install" | "om" | "installOm";

export type DirectorateCompanyDemoPrefill = {
  mode: DirectorateCompanyDemoMode;
  selectedCaps: ("capInstall" | "capOm")[];
  values: {
    name: string;
    nipt: string;
    email: string;
    phone: string;
    address: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
  };
};

const MODE_CAPS: Record<DirectorateCompanyDemoMode, DirectorateCompanyDemoPrefill["selectedCaps"]> = {
  install: ["capInstall"],
  om: ["capOm"],
  installOm: ["capInstall", "capOm"],
};

const MODE_LABELS: Record<DirectorateCompanyDemoMode, string> = {
  install: "Instalim",
  om: "OM",
  installOm: "Instalim + OM",
};

const MODE_ORG_NAMES: Record<DirectorateCompanyDemoMode, string> = {
  install: "Instalim Demo Drejtori",
  om: "OM Demo Drejtori",
  installOm: "Shërbim Ashensorë Demo Drejtori",
};

function demoSuffix() {
  return Date.now().toString(36).slice(-4).toUpperCase();
}

function demoPhoneSuffix() {
  return String(Date.now()).slice(-7);
}

export function directorateCompanyDemoModeLabel(mode: DirectorateCompanyDemoMode) {
  return MODE_LABELS[mode];
}

async function findUniqueDemoNipt() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const digits = String((Date.now() + attempt * 7919) % 100_000_000).padStart(8, "0");
    const nipt = `K${digits}K`;
    const existing = await db.organization.findFirst({
      where: { nipt, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return nipt;
  }
  throw new Error("Nuk u gjenerua dot NIPT demo i lirë.");
}

export async function buildDirectorateCompanyDemoPrefill(
  mode: DirectorateCompanyDemoMode,
): Promise<DirectorateCompanyDemoPrefill> {
  if (!isDemoToolsEnabled()) {
    throw new Error("Mjetet demo nuk janë të aktivizuara.");
  }

  const suffix = demoSuffix();
  const nipt = await findUniqueDemoNipt();
  const orgBase = MODE_ORG_NAMES[mode];

  return {
    mode,
    selectedCaps: MODE_CAPS[mode],
    values: {
      name: `${orgBase} ${suffix} Sh.p.k.`,
      nipt,
      email: `drejtori.demo.${suffix.toLowerCase()}@ishmtt.test`,
      phone: `+355682${demoPhoneSuffix()}`,
      address: "Rruga e Durrësit, Nr. 42, Tiranë",
      adminFirstName: "Bledar",
      adminLastName: "Shehu",
      adminEmail: `admin.demo.${suffix.toLowerCase()}@ishmtt.test`,
    },
  };
}
