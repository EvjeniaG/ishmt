import { redirect } from "next/navigation";

export default function DirectorateCertificationsRedirect() {
  redirect("/directorate/activity?phase=certification");
}
