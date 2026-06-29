import { APPLICATION_TYPE_GUIDE, type ApplicationGuideKey } from "@/lib/constants/application-type-guide";

export function ApplicationTypeGuide({
  guideKey,
  compact = false,
}: {
  guideKey: ApplicationGuideKey;
  compact?: boolean;
}) {
  const guide = APPLICATION_TYPE_GUIDE[guideKey];

  if (compact) {
    return (
      <div className="rounded-md border border-gov-primary/20 bg-gov-primary/5 p-4 text-sm">
        <p className="font-medium text-foreground">{guide.tagline}</p>
        <p className="mt-2 text-muted-foreground">
          <span className="font-medium text-foreground">Kur ta përdorni:</span> {guide.whenToUse}
        </p>
        {guide.whenNotToUse && (
          <p className="mt-2 text-muted-foreground">
            <span className="font-medium text-foreground">Jo për:</span> {guide.whenNotToUse}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-gov-primary/20 bg-gov-primary/5 p-4 text-sm">
      <div>
        <p className="font-medium text-foreground">{guide.tagline}</p>
        <p className="mt-2 text-muted-foreground">
          <span className="font-medium text-foreground">Kur ta përdorni:</span> {guide.whenToUse}
        </p>
        {guide.whenNotToUse && (
          <p className="mt-2 text-muted-foreground">
            <span className="font-medium text-foreground">Jo për:</span> {guide.whenNotToUse}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 font-medium text-foreground">Hapat</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap gap-4 text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Miratimi:</span> {guide.approvers}
        </p>
        <p>
          <span className="font-medium text-foreground">Rezultati:</span> {guide.outcome}
        </p>
      </div>
    </div>
  );
}

export function ApplicationTypeSteps({ guideKey }: { guideKey: ApplicationGuideKey }) {
  const guide = APPLICATION_TYPE_GUIDE[guideKey];
  return (
    <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
      {guide.steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}
