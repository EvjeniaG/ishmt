import { redirect } from "next/navigation";

/** Redirect legacy QR links that encoded `/q/q/{code}` (misconfigured base URL). */
export default async function LegacyQrRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/q/${code.toUpperCase()}`);
}
