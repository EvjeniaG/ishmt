import { HomePortalPage } from "@/components/public/home-portal-page";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ raport?: string; report?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const initialReportNumber = params?.raport ?? params?.report ?? "";
  return <HomePortalPage initialReportNumber={initialReportNumber} />;
}
