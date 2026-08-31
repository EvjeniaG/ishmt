"use client";

import { useState } from "react";
import { submitCitizenReportAction, reverseGeocodePlaceAction } from "@/lib/actions/citizen-report-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitReverseGeocodeLabel } from "@/lib/geo/reverse-geocode";
import { cn } from "@/lib/utils";

const REPORT_TYPES = [
  { value: "SAFETY_ISSUE", label: "Problem sigurie te një ashensor" },
  { value: "NO_QR", label: "Ashensor pa kod QR" },
  { value: "COMPLAINT", label: "Ashensor i dyshuar i paregjistruar / ankesë" },
] as const;

type LocationMode = "text" | "gps";

type GpsCoords = { latitude: number; longitude: number };

function mapsUrlForCoords(coords: GpsCoords) {
  return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
}

export function CitizenReportForm({
  defaultQrCode,
  defaultReportType,
  contactPrefill,
}: {
  defaultQrCode?: string;
  defaultReportType?: (typeof REPORT_TYPES)[number]["value"];
  /** Kontakti nga llogaria e kyçur - plotësohet automatikisht kur disponohet. */
  contactPrefill?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState<string | null>(null);
  const [type, setType] = useState<string>(defaultReportType ?? REPORT_TYPES[0].value);
  const [locationMode, setLocationMode] = useState<LocationMode>("text");
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [gpsPlaceName, setGpsPlaceName] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsPlaceLoading, setGpsPlaceLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const requiresLocation = type === "NO_QR" || type === "COMPLAINT";

  async function resolvePlaceName(coords: GpsCoords) {
    setGpsPlaceLoading(true);
    const placeName = await reverseGeocodePlaceAction(coords.latitude, coords.longitude);
    setGpsPlaceName(placeName);
    setGpsPlaceLoading(false);
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsError("Shfletuesi juaj nuk mbështet gjetjen e vendndodhjes.");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setGpsCoords(null);
    setGpsPlaceName(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setGpsCoords(coords);
        setGpsLoading(false);
        void resolvePlaceName(coords);
      },
      (positionError) => {
        setGpsLoading(false);
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setGpsError("Lejoni aksesin te vendndodhja për të vazhduar.");
        } else {
          setGpsError("Nuk u lexua vendndodhja. Provoni përsëri ose shkruani adresën.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (locationMode === "gps") {
      if (requiresLocation && !gpsCoords) {
        setError("Përdorni vendndodhjen time ose shkruani adresën para dërgimit të raportit.");
        return;
      }
    }

    setSubmitting(true);
    const result = await submitCitizenReportAction(new FormData(e.currentTarget));
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setReportNumber(result.reportNumber);
  }

  if (reportNumber) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gov-success">Raporti u dërgua</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Faleminderit. Raporti u regjistrua me numrin më poshtë. Ruajeni për referencë.
        </p>
        <p className="mt-3 text-xl font-bold tracking-wide">{reportNumber}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          IQMT do ta shqyrtojë raportin tuaj. Nuk kërkohet asnjë veprim tjetër.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-white p-6 shadow-sm">
      <input type="hidden" name="locationMode" value={locationMode} />
      <input type="hidden" name="gpsLatitude" value={gpsCoords?.latitude ?? ""} />
      <input type="hidden" name="gpsLongitude" value={gpsCoords?.longitude ?? ""} />

      <div className="space-y-1">
        <Label htmlFor="type">Lloji i raportimit</Label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex h-10 w-full rounded-md border px-3 text-sm"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qrCode">Kodi QR (nëse ekziston)</Label>
        <Input id="qrCode" name="qrCode" defaultValue={defaultQrCode} placeholder="P.sh. ABC123" />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          Vendndodhja {requiresLocation ? "*" : "(opsionale)"}
        </legend>

        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-md border px-3 py-3",
              locationMode === "text" && "border-gov-primary bg-gov-primary/5",
            )}
          >
            <input
              type="radio"
              name="locationModeChoice"
              className="mt-1"
              checked={locationMode === "text"}
              onChange={() => {
                setLocationMode("text");
                setGpsError(null);
                setGpsCoords(null);
                setGpsPlaceName(null);
              }}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Shkruaj adresën</span>
              <span className="block text-xs text-muted-foreground">Rruga, ndërtesa, qyteti</span>
            </span>
          </label>
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-md border px-3 py-3",
              locationMode === "gps" && "border-gov-primary bg-gov-primary/5",
            )}
          >
            <input
              type="radio"
              name="locationModeChoice"
              className="mt-1"
              checked={locationMode === "gps"}
              onChange={() => {
                setLocationMode("gps");
                setGpsError(null);
                setGpsCoords(null);
                setGpsPlaceName(null);
              }}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Përdor vendndodhjen time</span>
              <span className="block text-xs text-muted-foreground">Nga telefoni ose pajisja juaj</span>
            </span>
          </label>
        </div>

        {locationMode === "text" ? (
          <Input
            id="locationAddress"
            name="locationAddress"
            placeholder="Adresa, ndërtesa, qyteti"
            required={requiresLocation}
          />
        ) : (
          <div className="space-y-3 rounded-md border border-border p-3">
            {!gpsCoords ? (
              <p className="text-sm text-muted-foreground">
                Lejoni aksesin te vendndodhja kur shfletuesi e kërkon.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={captureGps}
              disabled={gpsLoading || gpsPlaceLoading}
            >
              {gpsLoading
                ? "Duke lexuar vendndodhjen…"
                : gpsCoords
                  ? "Përditëso vendndodhjen"
                  : "Përdor vendndodhjen time"}
            </Button>
            {gpsCoords ? (
              <div className="space-y-2 text-sm">
                {gpsPlaceLoading ? (
                  <p className="text-muted-foreground">Duke gjetur adresën…</p>
                ) : gpsPlaceName ? (
                  (() => {
                    const { headline, details } = splitReverseGeocodeLabel(gpsPlaceName);
                    return (
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">{headline}</p>
                        {details.length > 0 ? (
                          <p className="text-muted-foreground">{details.join(", ")}</p>
                        ) : null}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-muted-foreground">
                    Adresa nuk u gjet, por vendndodhja u ruajt.
                  </p>
                )}
                <a
                  href={mapsUrlForCoords(gpsCoords)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-primary hover:underline"
                >
                  Shiko në hartë
                </a>
              </div>
            ) : null}
            <input type="hidden" name="locationAddress" value={gpsPlaceName ?? ""} />
            {gpsError ? <p className="text-sm text-destructive">{gpsError}</p> : null}
          </div>
        )}
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="description">Përshkrimi i problemit *</Label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          rows={5}
          className="flex w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Përshkruani problemin sa më qartë…"
        />
      </div>

      <fieldset className="space-y-3 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-medium text-foreground">Kontakti juaj</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="reporterFirstName">Emri *</Label>
            <Input
              id="reporterFirstName"
              name="reporterFirstName"
              required
              autoComplete="given-name"
              defaultValue={contactPrefill?.firstName ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reporterLastName">Mbiemri *</Label>
            <Input
              id="reporterLastName"
              name="reporterLastName"
              required
              autoComplete="family-name"
              defaultValue={contactPrefill?.lastName ?? ""}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="reporterPhone">Telefoni *</Label>
            <Input
              id="reporterPhone"
              name="reporterPhone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+355 6x xxx xxxx"
              defaultValue={contactPrefill?.phone ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reporterEmail">Email (opsional)</Label>
            <Input
              id="reporterEmail"
              name="reporterEmail"
              type="email"
              autoComplete="email"
              placeholder="opsional"
              defaultValue={contactPrefill?.email ?? ""}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          IQMT mund t&apos;ju kontaktojë për sqarime mbi raportin.
        </p>
      </fieldset>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="bg-gov-primary hover:bg-gov-secondary">
        {submitting ? "Duke dërguar…" : "Dërgo raportin"}
      </Button>
    </form>
  );
}
