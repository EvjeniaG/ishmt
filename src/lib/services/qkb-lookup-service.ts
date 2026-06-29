/**
 * QKB live-lookup (simulated).
 *
 * QKB (qkb.gov.al/kerko-per-subjekt) nuk ekspozon një API publike, prandaj ky
 * shërbim simulon një kontroll "live" të statusit të subjektit sipas NIPT-it.
 *
 * Statusi përdor qkbStatus = ACTIVE | INACTIVE | UNKNOWN (pa rregulla NIPT si "Z").
 * Në prodhim, ky shërbim do të zëvendësohej me integrimin zyrtar QKB/e-Albania.
 */

export const QKB_SOURCE_URL = "https://qkb.gov.al/kerko-per-subjekt/";
const NIPT_REGEX = /^[A-Z][0-9]{8}[A-Z]$/;

export type QkbStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "UNKNOWN";

export type QkbLookupResult = {
  nipt: string;
  qkbStatus: QkbStatus;
  /** @deprecated Use qkbStatus === "ACTIVE" */
  active: boolean;
  statusLabel: string;
  companyName: string | null;
  checkedAt: string;
  source: string;
};

function curatedInactiveNipts(): Set<string> {
  const raw = process.env.QKB_INACTIVE_NIPTS ?? "987654321B";
  return new Set(
    raw
      .split(",")
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean),
  );
}

function curatedSuspendedNipts(): Set<string> {
  const raw = process.env.QKB_SUSPENDED_NIPTS ?? "111111111C";
  return new Set(
    raw
      .split(",")
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean),
  );
}

function curatedActiveNipts(): Set<string> {
  const raw = process.env.QKB_ACTIVE_NIPTS ?? "123456789A,K33333333C";
  return new Set(
    raw
      .split(",")
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean),
  );
}

function curatedUnknownNipts(): Set<string> {
  const raw = process.env.QKB_UNKNOWN_NIPTS ?? "";
  return new Set(
    raw
      .split(",")
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean),
  );
}

function statusLabelFor(qkbStatus: QkbStatus): string {
  switch (qkbStatus) {
    case "ACTIVE":
      return "Aktiv në QKB";
    case "INACTIVE":
      return "Jo aktiv në QKB";
    case "SUSPENDED":
      return "Pezulluar në QKB";
    case "UNKNOWN":
      return "Status i panjohur në QKB";
  }
}

export class QkbLookupService {
  static isValidNiptFormat(nipt: string): boolean {
    return NIPT_REGEX.test(nipt.trim().toUpperCase());
  }

  /** Simulated live lookup against QKB by NIPT (maintenance companies only). */
  static async lookup(niptRaw: string, fallbackName?: string | null): Promise<QkbLookupResult> {
    const nipt = niptRaw.trim().toUpperCase();
    const base = {
      nipt,
      checkedAt: new Date().toISOString(),
      source: QKB_SOURCE_URL,
    };

    if (!this.isValidNiptFormat(nipt)) {
      return {
        ...base,
        qkbStatus: "UNKNOWN",
        active: false,
        statusLabel: "Format i pavlefshëm NIPT",
        companyName: null,
      };
    }

    let qkbStatus: QkbStatus = "UNKNOWN";
    if (curatedActiveNipts().has(nipt)) {
      qkbStatus = "ACTIVE";
    } else if (curatedSuspendedNipts().has(nipt)) {
      qkbStatus = "SUSPENDED";
    } else if (curatedInactiveNipts().has(nipt)) {
      qkbStatus = "INACTIVE";
    } else if (curatedUnknownNipts().has(nipt)) {
      qkbStatus = "UNKNOWN";
    } else if (this.isValidNiptFormat(nipt)) {
      // Default demo behaviour: unknown NIPTs are treated as active unless listed above.
      qkbStatus = "ACTIVE";
    }

    return {
      ...base,
      qkbStatus,
      active: qkbStatus === "ACTIVE",
      statusLabel: statusLabelFor(qkbStatus),
      companyName: fallbackName ?? `Subjekt ${nipt}`,
    };
  }
}
