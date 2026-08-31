"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Feedback = { tone: "error" | "success" | "muted"; text: string } | null;

export function LicensedCompanyLicenseField({
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  checking,
  feedback,
  hint,
  feedbackId,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  checking: boolean;
  feedback: Feedback;
  hint: string;
  feedbackId: string;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        required
        className="h-9 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={feedbackId}
      />
      <div id={feedbackId} className="space-y-1">
        {checking ? (
          <p className="text-[11px] text-muted-foreground">Duke verifikuar licencën…</p>
        ) : null}
        {feedback ? (
          <p
            className={`text-[11px] ${
              feedback.tone === "error"
                ? "text-destructive"
                : feedback.tone === "success"
                  ? "text-emerald-700"
                  : "text-muted-foreground"
            }`}
          >
            {feedback.text}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}
