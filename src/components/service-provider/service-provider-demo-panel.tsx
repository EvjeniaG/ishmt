"use client";

import Link from "next/link";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/institutional";
import { seedServiceProviderPortalDemoAction } from "@/lib/actions/service-provider-demo-actions";
import {
  SERVICE_PROVIDER_DEMO,
  SERVICE_PROVIDER_DEMO_PAGES,
} from "@/lib/demo/service-provider-demo-constants";

type ServiceProviderDemoPanelProps = {
  activeNipt?: string | null;
};

export function ServiceProviderDemoPanel({ activeNipt }: ServiceProviderDemoPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isDemoSession =
    activeNipt?.trim().toUpperCase() === SERVICE_PROVIDER_DEMO.nipt.toUpperCase();
  const demoLoginHref = `/auth/login?identifier=${encodeURIComponent(SERVICE_PROVIDER_DEMO.nipt)}`;

  function runSeed() {
    setMessage(null);
    startTransition(async () => {
      const result = await seedServiceProviderPortalDemoAction();
      if (result.ok) {
        setMessage(
          isDemoSession
            ? `Demo u krijua: ${result.applicationCount} aplikime, ${result.elevatorCount} ashensorë.`
            : `Demo u krijua për NIPT ${SERVICE_PROVIDER_DEMO.nipt}. Hyni me llogarinë demo për të parë të dhënat.`,
        );
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  const groups = SERVICE_PROVIDER_DEMO_PAGES.reduce<
    Record<string, typeof SERVICE_PROVIDER_DEMO_PAGES>
  >((acc, page) => {
    if (!acc[page.group]) acc[page.group] = [];
    acc[page.group].push(page);
    return acc;
  }, {});

  return (
    <SectionCard
      title="Demo - shiko të gjitha faqet"
      className="border-l-4 border-l-gov-primary"
      padded
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Udhëzues për të parë të gjitha faqet e portalit me të dhëna të plota (instalim, mirëmbajtje,
          OM). Të dhënat krijohen për llogarinë demo më poshtë - jo për organizatën tuaj aktuale.
        </p>

        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Klikoni «Mbush me të dhëna demo».</li>
          <li>Hyni me NIPT-in demo (jo email) dhe fjalëkalimin.</li>
          <li>Përdorni lidhjet «Hap faqen →» për çdo seksion të sidebar-it.</li>
        </ol>

        {!isDemoSession && activeNipt && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
            Jeni të kyçur si <span className="font-mono">{activeNipt}</span>. KPI-t mbeten 0 derisa
            të hyni me NIPT-in demo.
          </p>
        )}

        <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs sm:text-sm">
          <p>
            <span className="text-muted-foreground">NIPT (hyrje):</span> {SERVICE_PROVIDER_DEMO.nipt}
          </p>
          <p>
            <span className="text-muted-foreground">Email (referencë):</span>{" "}
            {SERVICE_PROVIDER_DEMO.email}
          </p>
          <p>
            <span className="text-muted-foreground">Fjalëkalimi:</span>{" "}
            {SERVICE_PROVIDER_DEMO.password}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={runSeed} disabled={pending}>
            {pending ? "Duke krijuar demo…" : "Mbush me të dhëna demo"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={demoLoginHref}>Hyr si demo</Link>
          </Button>
        </div>

        {message && <p className="text-sm text-gov-primary">{message}</p>}

        <div className="space-y-4 pt-2">
          {Object.entries(groups).map(([group, pages]) => (
            <div key={group}>
              <p className="mb-2 font-medium text-foreground">{group}</p>
              <ul className="space-y-2">
                {pages.map((page) => (
                  <li
                    key={`${page.group}-${page.href}-${page.label}`}
                    className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{page.label}</p>
                      <p className="text-xs text-muted-foreground">{page.description}</p>
                    </div>
                    <Link
                      href={page.href}
                      className="shrink-0 text-sm text-gov-primary hover:underline"
                    >
                      Hap faqen →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
