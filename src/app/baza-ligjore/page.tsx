import type { Metadata } from "next";
import { LegalFrameworkPageContent } from "@/components/public/legal-framework-page-content";
import { INSTITUTION_REGISTRY_TITLE } from "@/lib/constants/institution";

export const metadata: Metadata = {
  title: `Baza ligjore · ${INSTITUTION_REGISTRY_TITLE}`,
  description:
    "Ligjet, vendimet dhe udhëzimet që formojnë bazën ligjore të regjistrit të ashensorëve dhe mbikëqyrjes së tregut - IQMT.",
};

export default function LegalFrameworkPage() {
  return <LegalFrameworkPageContent />;
}
