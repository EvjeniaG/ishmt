"use client";

import dynamic from "next/dynamic";
import type { MunicipalityRow } from "@/lib/services/chief-geo-service";

const ChiefMap = dynamic(() => import("@/components/chief/chief-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] w-full items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
      Duke ngarkuar hartën…
    </div>
  ),
});

export function ChiefMapClient({ rows }: { rows: MunicipalityRow[] }) {
  return (
    <div className="portal-map-host relative z-0 isolate overflow-hidden rounded-lg">
      <ChiefMap rows={rows} />
    </div>
  );
}
