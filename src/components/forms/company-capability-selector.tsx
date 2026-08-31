"use client";

const CAPABILITY_OPTIONS = [
  {
    name: "capInstall",
    label: "Instalim",
    description: "Montim dhe regjistrim i ashensorëve të rinj.",
  },
  {
    name: "capMaintenance",
    label: "Mirëmbajtje",
    description:
      "Ashensorët në mirëmbajtje, kontratat e mirëmbajtjes, ndërhyrjet dhe defektet, si dhe kontrollet periodike.",
  },
  {
    name: "capOm",
    label: "OM (inspektim periodik)",
    description: "Inspektim dhe certifikim periodik - pa instalim të detyrueshëm.",
  },
] as const;

export type CompanyCapabilityName = (typeof CAPABILITY_OPTIONS)[number]["name"];

export function CompanyCapabilitySelector({
  selected,
  onChange,
  legend = "Funksionet e kompanisë *",
  hint = "Instalim dhe OM janë funksione të ndara - kompania mund të regjistrohet vetëm për instalim, vetëm për OM (inspektim periodik), ose për të dyja.",
  excludeCapabilities = [],
}: {
  selected: CompanyCapabilityName[];
  onChange: (next: CompanyCapabilityName[]) => void;
  legend?: string;
  hint?: string;
  excludeCapabilities?: CompanyCapabilityName[];
}) {
  function toggle(name: CompanyCapabilityName) {
    onChange(
      selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name],
    );
  }

  return (
    <fieldset className="space-y-3 rounded-2xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{legend}</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="space-y-2">
        {CAPABILITY_OPTIONS.filter((option) => !excludeCapabilities.includes(option.name)).map((option) => (
          <label
            key={option.name}
            className="flex cursor-pointer gap-3 rounded-xl border border-border p-3 text-sm transition-colors hover:border-gov-primary/40"
          >
            <input
              type="checkbox"
              name={option.name}
              checked={selected.includes(option.name)}
              onChange={() => toggle(option.name)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export { CAPABILITY_OPTIONS };
