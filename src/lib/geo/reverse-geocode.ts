type NominatimReverseResponse = {
  display_name?: string;
  address?: Record<string, string>;
};

function uniqueParts(parts: Array<string | undefined>): string[] {
  return [...new Set(parts.map((part) => part?.trim()).filter(Boolean) as string[])];
}

export function formatReverseGeocodeLabel(data: NominatimReverseResponse): string | null {
  const address = data.address;
  if (address) {
    const street = uniqueParts([
      address.house_number && address.road
        ? `${address.road} ${address.house_number}`
        : address.road || address.pedestrian || address.footway,
      address.building,
      address.amenity,
    ])[0];

    const parts = uniqueParts([
      street,
      address.neighbourhood || address.quarter,
      address.suburb || address.city_district || address.borough,
      address.city || address.town || address.village || address.municipality,
      address.county || address.state,
    ]);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  if (data.display_name) {
    return data.display_name.split(",").slice(0, 5).join(",").trim();
  }

  return null;
}

export function splitReverseGeocodeLabel(label: string): { headline: string; details: string[] } {
  const parts = label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { headline: label, details: [] };
  }

  return {
    headline: parts[0],
    details: parts.slice(1),
  };
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "sq,en",
        "User-Agent": "IQMT-Elevator-Registry/1.0 (citizen-report)",
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as NominatimReverseResponse;
    return formatReverseGeocodeLabel(data);
  } catch {
    return null;
  }
}
