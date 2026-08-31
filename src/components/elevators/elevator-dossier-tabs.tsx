import Link from "next/link";
import { cn } from "@/lib/utils";

export const ELEVATOR_DOSSIER_TABS = [
  "summary",
  "technical",
  "certificate",
  "qr",
  "documents",
  "maintenance",
  "inspections",
  "history",
  "applications",
] as const;

export type ElevatorDossierTabId = (typeof ELEVATOR_DOSSIER_TABS)[number];

const TAB_LABELS: Record<ElevatorDossierTabId, string> = {
  summary: "Përmbledhje",
  technical: "Të dhënat teknike",
  certificate: "Certifikata",
  qr: "Kodi QR",
  documents: "Dokumente",
  maintenance: "Mirëmbajtje",
  inspections: "Inspektime periodike",
  history: "Historiku",
  applications: "Aplikime",
};

export function ElevatorDossierTabs({
  elevatorId,
  activeTab,
  tabs = ELEVATOR_DOSSIER_TABS,
}: {
  elevatorId: string;
  activeTab: ElevatorDossierTabId;
  tabs?: readonly ElevatorDossierTabId[];
}) {
  return (
    <nav className="portal-tab-scroll" aria-label="Skedat e dosjes së ashensorit">
      <div className="portal-tab-scroll-inner rounded-xl border border-border/80 bg-card p-1 text-sm shadow-sm">
        {tabs.map((tabId) => (
          <Link
            key={tabId}
            href={`/portal/elevators/${elevatorId}?tab=${tabId}`}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 font-medium transition-colors",
              activeTab === tabId
                ? "bg-gov-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-gov-primary",
            )}
          >
            {TAB_LABELS[tabId]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
