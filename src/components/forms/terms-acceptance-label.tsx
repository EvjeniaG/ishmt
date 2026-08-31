import Link from "next/link";

export function TermsAcceptanceLabel({ className }: { className?: string }) {
  return (
    <span className={className}>
      E lexova dhe bie dakord me{" "}
      <Link
        href="/termat-dhe-kushtet"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-gov-primary hover:underline"
      >
        termat dhe kushtet
      </Link>{" "}
      e përdorimit të platformës
    </span>
  );
}
