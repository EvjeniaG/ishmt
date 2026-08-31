import { redirect } from "next/navigation";

/** Legacy route - forma e caktimit/ndryshimit është në skedën Mirëmbajtje. */
export default async function ChangeMaintenancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/portal/elevators/${id}?tab=maintenance`);
}
