/**
 * Demo UI (kredenciale login, butonat «mbush me demo»).
 * Aktiv në dev, ose kur NEXT_PUBLIC_DEMO_MODE=true (p.sh. Vercel demo).
 * Çaktivizo me NEXT_PUBLIC_DEMO_MODE=false për production zyrtare.
 */
export function isDemoModeEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export const DEMO_PASSWORD_DISPLAY = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "Ishmt2026";
