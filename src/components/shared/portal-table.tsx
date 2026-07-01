import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortalTableWrap({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("portal-table-wrap", compact && "portal-table-wrap-compact")}>
      <table className={cn("portal-table", compact && "portal-table-compact")}>{children}</table>
    </div>
  );
}

export function PortalList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={`portal-list ${className ?? ""}`}>{children}</ul>;
}

export function PortalListItem({ children }: { children: ReactNode }) {
  return <li className="portal-list-item">{children}</li>;
}

export function PortalEmptyState({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="portal-empty">
      <div className="portal-empty-icon">{icon ?? <Inbox className="h-5 w-5" strokeWidth={1.75} />}</div>
      <p className="portal-empty-text">{children}</p>
    </div>
  );
}
