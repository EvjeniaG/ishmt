"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function PortalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/portal/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-lg flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" strokeWidth={1.75} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kërko nr. regjistri, certifikate, serial, adresë…"
        className="h-10 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-4 text-sm text-white shadow-inner shadow-black/10 placeholder:text-white/45 backdrop-blur-sm transition-all focus:border-white/30 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
    </form>
  );
}
