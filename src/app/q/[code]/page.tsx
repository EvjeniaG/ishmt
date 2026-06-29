import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicElevatorView } from "@/components/public/public-elevator-view";
import { QrService } from "@/lib/services/qr-service";

export default async function PublicQrProfilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const hdrs = await headers();

  await QrService.recordScan(
    code,
    hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
    hdrs.get("user-agent"),
  );

  const profile = await QrService.getPublicProfile(code);

  if (!profile) {
    notFound();
  }

  return <PublicElevatorView profile={profile} code={code} />;
}
