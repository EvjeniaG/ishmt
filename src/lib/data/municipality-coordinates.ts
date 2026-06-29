/**
 * Approximate centroids (lat, lng) for Albanian municipalities, keyed by the
 * GeoMunicipality.code values seeded from geo-albania.json. Used for the GIS map
 * when individual elevators have no GPS coordinates.
 */
export const MUNICIPALITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  TIA: { lat: 41.3275, lng: 19.8187 },
  KAM: { lat: 41.3814, lng: 19.76 },
  VOR: { lat: 41.3925, lng: 19.6553 },
  KAV: { lat: 41.1856, lng: 19.5569 },
  DUR: { lat: 41.3231, lng: 19.4414 },
  SHI: { lat: 41.3461, lng: 19.5672 },
  SUK: { lat: 41.3744, lng: 19.5269 },
  ELB: { lat: 41.1125, lng: 20.0822 },
  BEL: { lat: 40.9889, lng: 19.8917 },
  FIE: { lat: 40.7239, lng: 19.5567 },
  PAT: { lat: 40.6856, lng: 19.6175 },
  VLO: { lat: 40.4667, lng: 19.4897 },
  SAR: { lat: 39.8756, lng: 20.0053 },
  SHK: { lat: 42.0686, lng: 19.5125 },
  KOR: { lat: 40.6186, lng: 20.7808 },
  POG: { lat: 40.9025, lng: 20.6525 },
  GJI: { lat: 40.0758, lng: 20.1389 },
  BER: { lat: 40.7058, lng: 19.9522 },
  KUK: { lat: 42.0769, lng: 20.4219 },
  LEZ: { lat: 41.7836, lng: 19.6436 },
  DIB: { lat: 41.6856, lng: 20.4297 },
};

/** Geographic centre of Albania - default map view. */
export const ALBANIA_CENTER = { lat: 41.0, lng: 19.95 };
