import type { Metadata } from "next";
import { TermsPageContent } from "@/components/public/terms-page-content";
import { INSTITUTION_REGISTRY_TITLE } from "@/lib/constants/institution";

export const metadata: Metadata = {
  title: `Termat dhe Kushtet · ${INSTITUTION_REGISTRY_TITLE}`,
  description:
    "Termat dhe kushtet e përdorimit të platformës dixhitale të Regjistrit të Ashensorëve - IQMT.",
};

export default function TermsPage() {
  return <TermsPageContent />;
}
