import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DelegationCompletePanel({
  roleLabel,
  applicationNumber,
  description,
}: {
  roleLabel: "instalues" | "certifikues";
  applicationNumber: string;
  description: string;
}) {
  return (
    <div className="workflow-panel border-l-[3px] border-l-gov-success">
      <div className="border-b border-border bg-gov-surface/40 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-gov-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="workflow-eyebrow mb-1">Përfunduar</p>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Pjesa juaj si {roleLabel}
            </h2>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{applicationNumber}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 text-sm leading-snug text-muted-foreground sm:px-6">
        <p className="text-foreground">{description}</p>
        <p>Procesi vazhdon te personi përgjegjës i ashensorit. Do të njoftoheni nëse kërkohet korrigjim.</p>
        <Button asChild variant="outline" className="border-border text-gov-primary hover:bg-gov-primary/[0.04]">
          <Link href="/portal/applications">Kthehu te aplikimet</Link>
        </Button>
      </div>
    </div>
  );
}
