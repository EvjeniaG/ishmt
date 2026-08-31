import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HomePortalGuideSection } from "@/components/public/home-portal-guide-section";

export default function UdhezimPage() {
  return (
    <div className="portal-canvas flex min-h-full flex-col">
      <div className="shrink-0 border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gov-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Faqja kryesore
          </Link>
        </div>
      </div>
      <HomePortalGuideSection />
    </div>
  );
}
