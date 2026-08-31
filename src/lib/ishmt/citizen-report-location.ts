export function formatCitizenReportLocationDisplay(report: {
  locationAddress?: string | null;
  gpsLatitude?: { toString(): string } | null;
  gpsLongitude?: { toString(): string } | null;
}): { placeName?: string; coords?: string; mapsUrl?: string; text: string } {
  const hasGps = report.gpsLatitude != null && report.gpsLongitude != null;
  const lat = hasGps ? Number(report.gpsLatitude) : NaN;
  const lng = hasGps ? Number(report.gpsLongitude) : NaN;
  const gpsValid = Number.isFinite(lat) && Number.isFinite(lng);
  const coords = gpsValid ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : undefined;
  const mapsUrl = gpsValid ? `https://www.google.com/maps?q=${lat},${lng}` : undefined;
  const placeName = report.locationAddress?.trim() || undefined;

  if (placeName && coords) {
    return { placeName, coords, mapsUrl, text: placeName };
  }

  if (placeName) {
    return { text: placeName };
  }

  if (coords) {
    return { coords, mapsUrl, text: coords };
  }

  return { text: "-" };
}
