'use client';

import L from 'leaflet';
import Link from 'next/link';
import React, { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  firstYear?: number;
  lastYear?: number;
  distanceKm?: number;
};

export default function StationsMap(props: {
  center: { lat: number; lon: number };
  radiusKm: number;
  stations: Station[];
  /**
   * Zeitraum aus der Explore Page.
   * Wird beim Öffnen der Station als Query-Parameter weitergegeben,
   * damit die erste Datenabfrage im Detail diesen Zeitraum nutzt.
   */
  minYear?: number;
  maxYear?: number;
  /**
   * Wird bei jedem Klick auf "Stationen suchen" inkrementiert.
   * Dadurch wird der automatische Zoom (fitBounds) nur nach einer Suche ausgeführt.
   */
  fitToRadiusNonce?: number;
}) {
  useEffect(() => {
    type IconDefaultProto = { _getIconUrl?: unknown };
    const proto = L.Icon.Default.prototype as unknown as IconDefaultProto;
    if (proto._getIconUrl) delete proto._getIconUrl;

    const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString();
    const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString();
    const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();

    L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
  }, []);

  const center: [number, number] = [props.center.lat, props.center.lon];

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <FitToRadius center={props.center} radiusKm={props.radiusKm} fitToRadiusNonce={props.fitToRadiusNonce ?? 0} />

      <Circle center={center} radius={props.radiusKm * 1000} />

      {props.stations.slice(0, 200).map((s) => (
        <Marker key={s.id} position={[s.lat, s.lon]}>
          <Popup>
            <div className="text-sm font-semibold">
              <Link
                href={makeStationDetailHref(s.id, props.minYear, props.maxYear)}
                className="text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded"
                aria-label={`Station öffnen: ${s.name} (${s.id})`}
              >
                {s.name}
              </Link>
            </div>

            <div className="text-xs text-slate-600">{s.id}</div>
            <div className="text-xs">
              {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
            </div>
            {typeof s.distanceKm === 'number' ? <div className="text-xs">{s.distanceKm.toFixed(1)} km</div> : null}
            {s.firstYear && s.lastYear ? (
              <div className="text-xs">
                {s.firstYear}–{s.lastYear}
              </div>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function makeStationDetailHref(stationId: string, minYear?: number, maxYear?: number): string {
  const base = `/station/${encodeURIComponent(stationId)}`;
  if (typeof minYear !== 'number' || typeof maxYear !== 'number') return base;

  const usp = new URLSearchParams();
  usp.set('minYear', String(minYear));
  usp.set('maxYear', String(maxYear));
  return `${base}?${usp.toString()}`;
}

function FitToRadius(props: { center: { lat: number; lon: number }; radiusKm: number; fitToRadiusNonce: number }) {
  const map = useMap();

  useEffect(() => {
    // Nicht beim initialen Render auto-zoomen, sondern erst nach expliziter Suche.
    if (!props.fitToRadiusNonce) return;

    const radiusMeters = Math.max(0, props.radiusKm) * 1000;
    const bounds = L.circle([props.center.lat, props.center.lon], { radius: radiusMeters }).getBounds();

    // Slightly delayed, damit Leaflet die Containergröße sicher kennt.
    const id = window.requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15,
        animate: true,
      });
    });

    return () => window.cancelAnimationFrame(id);
  }, [map, props.center.lat, props.center.lon, props.radiusKm, props.fitToRadiusNonce]);

  return null;
}