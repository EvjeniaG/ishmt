/**
 * Demo UI (kredenciale login, butonat «mbush me demo»).
 * Aktiv në dev, ose kur NEXT_PUBLIC_DEMO_MODE=true (p.sh. Vercel demo).
 * Çaktivizo me NEXT_PUBLIC_DEMO_MODE=false për production zyrtare.
 */
export function isDemoModeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "false") return false;
  return true;
}

export const DEMO_PASSWORD_DISPLAY = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "Ishmt2026";
