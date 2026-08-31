"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import {
  assignRegistrationCertifierAction,
  assignRegistrationInstallerAction,
} from "@/lib/actions/registration-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Company = {
  id: string;
  name: string;
  nipt: string | null;
  municipality: { nameSq: string } | null;
  licenses: { licenseNumber: string; licenseType: string | null; expiryDate: Date }[];
};

export function CompanySelectTable({
  applicationId,
  companies,
  type,
  nextPath,
}: {
  applicationId: string;
  companies: Company[];
  type: "installer" | "certifier";
  nextPath: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function invite(companyId: string) {
    setLoading(companyId);
    setError(null);
    const result =
      type === "installer"
        ? await assignRegistrationInstallerAction(applicationId, companyId)
        : await assignRegistrationCertifierAction(applicationId, companyId);
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-base text-gov-primary">
          {type === "installer" ? "Zgjidhni kompaninë instaluese" : "Zgjidhni kompaninë OM / certifikuese"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Shfaqen vetëm kompanitë me status <strong className="text-foreground">AKTIV</strong> dhe licencë të
          vlefshme, të menaxhuara nga Drejtoria.
        </p>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nuk ka kompani të disponueshme.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Emri</th>
                  <th className="px-4 py-3 font-semibold">NIPT</th>
                  <th className="px-4 py-3 font-semibold">Licenca</th>
                  <th className="px-4 py-3 font-semibold">Skadon</th>
                  <th className="px-4 py-3 font-semibold">Bashkia</th>
                  <th className="px-4 py-3 font-semibold text-right">Veprim</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const lic = c.licenses[0];
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.nipt ?? "-"}</td>
                      <td className="px-4 py-3">{lic?.licenseNumber ?? "-"}</td>
                      <td className="px-4 py-3">{lic ? new Date(lic.expiryDate).toLocaleDateString("sq-AL") : "-"}</td>
                      <td className="px-4 py-3">{c.municipality?.nameSq ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          className="bg-gov-primary hover:bg-gov-secondary"
                          disabled={loading === c.id}
                          onClick={() => invite(c.id)}
                        >
                          {loading === c.id
                            ? "Duke dërguar..."
                            : type === "installer"
                              ? "Dërgo ftesë instaluesit"
                              : "Dërgo ftesë OM"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
