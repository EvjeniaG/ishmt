import { AppShell } from "@/components/layout/app-shell";
import {
  loadOrgServiceContracts,
  OrgServiceContractsPage,
} from "@/components/contracts/org-service-contracts-page";
import { ContractHighlightScroll } from "@/components/contracts/contract-highlight-scroll";
import {
  PERIODIC_INSPECTION_CONTRACTS_LABEL,
  PERIODIC_INSPECTION_LABEL,
} from "@/lib/constants/periodic-inspection-labels";
import { requireServiceCapabilityForPage } from "@/lib/auth/page-guards";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";

export default async function OmiKontrollPeriodikKontratatPage({
  searchParams,
}: {
  searchParams: Promise<{ contract?: string }>;
}) {
  const ctx = await requireServiceCapabilityForPage("om");
  const { contract: highlightContractId } = await searchParams;
  const [pending, allContracts] = await Promise.all([
    CertifierInspectionService.listPendingContracts(ctx),
    loadOrgServiceContracts(ctx.activeOrgId, "PERIODIC_INSPECTION"),
  ]);

  return (
    <AppShell title={PERIODIC_INSPECTION_CONTRACTS_LABEL}>
      <ContractHighlightScroll contractId={highlightContractId ?? null} />
      <OrgServiceContractsPage
        eyebrow="Portali · Certifikues / OM"
        title={PERIODIC_INSPECTION_CONTRACTS_LABEL}
        description={`Kontratat me personin përgjegjës të ashensorit për ${PERIODIC_INSPECTION_LABEL.toLowerCase()} shfaqen këtu sapo ju caktohen si OM.`}
        serviceType="PERIODIC_INSPECTION"
        pending={pending}
        allContracts={allContracts}
        highlightContractId={highlightContractId ?? null}
      />
    </AppShell>
  );
}
