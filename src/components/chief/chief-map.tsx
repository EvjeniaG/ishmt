"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { ALBANIA_CENTER } from "@/lib/data/municipality-coordinates";
import type { MunicipalityRow } from "@/lib/services/chief-geo-service";

function markerColor(row: MunicipalityRow) {
  if (row.red > 0 && row.red >= row.green && row.red >= row.yellow) return "#dc2626";
  if (row.yellow > 0 && row.yellow >= row.green) return "#d97706";
  return "#059669";
}

function markerRadius(total: number, max: number) {
  if (max <= 0) return 8;
  const min = 8;
  const span = 28;
  return min + Math.sqrt(total / max) * span;
}

export default function ChiefMap({ rows }: { rows: MunicipalityRow[] }) {
  const points = rows.filter((r) => r.lat !== null && r.lng !== null);
  const max = points.reduce((m, r) => Math.max(m, r.total), 0);

  return (
    <MapContainer
      center={[ALBANIA_CENTER.lat, ALBANIA_CENTER.lng]}
      zoom={7}
      scrollWheelZoom
      style={{ height: "520px", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((row) => (
        <CircleMarker
          key={row.municipalityId}
          center={[row.lat as number, row.lng as number]}
          radius={markerRadius(row.total, max)}
          pathOptions={{
            color: markerColor(row),
            fillColor: markerColor(row),
            fillOpacity: 0.55,
            weight: 1.5,
          }}
        >
          <Popup>
            <div style={{ minWidth: "180px" }}>
              <strong>{row.name}</strong>
              <div style={{ fontSize: "12px", color: "#666" }}>{row.regionName}</div>
              <hr style={{ margin: "6px 0" }} />
              <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
                <div>
                  Ashensorë total: <strong>{row.total}</strong>
                </div>
                <div>Aktivë: {row.active}</div>
                <div style={{ color: "#059669" }}>Në përputhje: {row.green}</div>
                <div style={{ color: "#d97706" }}>Kujdes: {row.yellow}</div>
                <div style={{ color: "#dc2626" }}>Jo në përputhje: {row.red}</div>
                <div>Kërkojnë vëmendje: {row.attention}</div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
