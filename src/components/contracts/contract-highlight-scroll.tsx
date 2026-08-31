"use client";

import { useEffect } from "react";

export function ContractHighlightScroll({ contractId }: { contractId: string | null }) {
  useEffect(() => {
    if (!contractId) return;
    const element = document.getElementById(`contract-${contractId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [contractId]);

  return null;
}
