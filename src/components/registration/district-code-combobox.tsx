"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  filterLegacyDistricts,
  findLegacyDistrict,
  LEGACY_DISTRICT_CODES,
  type LegacyDistrict,
} from "@/lib/registration/legacy-district-codes";

export function DistrictCodeCombobox({
  name,
  value,
  onChange,
  required,
}: {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const safeValue = (value ?? "").toUpperCase();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(safeValue);
  const [highlight, setHighlight] = useState(0);

  const matched = findLegacyDistrict(safeValue);
  const options = query.trim() ? filterLegacyDistricts(query).slice(0, 12) : LEGACY_DISTRICT_CODES;

  useEffect(() => {
    setQuery(safeValue);
  }, [safeValue]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectDistrict(d: LegacyDistrict) {
    onChange(d.code);
    setQuery(d.code);
    setOpen(false);
  }

  function commitInput(raw: string) {
    const next = raw.trim().toUpperCase();
    onChange(next);
    setQuery(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={safeValue} required={required && !safeValue} />
      <div className="flex gap-1">
        <Input
          id={listId}
          value={query}
          onChange={(e) => {
            const next = e.target.value.toUpperCase();
            setQuery(next);
            onChange(next);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => commitInput(query)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && open && options[highlight]) {
              e.preventDefault();
              selectDistrict(options[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Shkruani ose zgjidhni (p.sh. TR)"
          autoComplete="off"
          className="uppercase"
        />
        <button
          type="button"
          aria-label="Hap listën e distrikteve"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted"
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {matched && (
        <p className="mt-1 text-xs text-green-700">
          ✓ {matched.code} - {matched.name}
        </p>
      )}
      {!matched && safeValue.trim().length >= 2 && (
        <p className="mt-1 text-xs text-muted-foreground">Kod i personalizuar - verifikoni para ruajtjes</p>
      )}

      {open && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md"
        >
          {options.map((d, i) => (
            <li key={d.code}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted ${
                  i === highlight ? "bg-muted" : ""
                } ${safeValue === d.code ? "font-medium text-gov-primary" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectDistrict(d)}
              >
                <span className="font-mono font-semibold">{d.code}</span>
                <span className="ml-3 truncate text-muted-foreground">{d.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
