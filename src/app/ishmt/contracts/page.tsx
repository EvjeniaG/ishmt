import { redirect } from "next/navigation";
import { ISHMT_COMPLIANCE_MONITOR_PATH } from "@/lib/ishmt/contract-issue-filters";

/** Adresa e vjetër — ridrejton te faqja e unifikuar e përmbledhjes. */
export default async function IshmtContractsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  const qs = query.toString();
  redirect(qs ? `${ISHMT_COMPLIANCE_MONITOR_PATH}?${qs}#alarmet-lista` : ISHMT_COMPLIANCE_MONITOR_PATH);
}
