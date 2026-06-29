import { redirect } from "next/navigation";

export default function DirectorateInstallationsRedirect() {
  redirect("/directorate/activity?phase=installation");
}
