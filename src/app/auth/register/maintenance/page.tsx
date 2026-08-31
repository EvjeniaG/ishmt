import { redirect } from "next/navigation";

export default function RegisterMaintenancePage() {
  redirect("/auth/register?level=maintenance");
}
