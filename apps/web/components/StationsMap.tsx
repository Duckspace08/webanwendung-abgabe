'use client';

import L from 'leaflet';
import React, { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

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
      <Circle center={center} radius={props.radiusKm * 1000} />

      {props.stations.slice(0, 200).map((s) => (
        <Marker key={s.id} position={[s.lat, s.lon]}>
          <Popup>
            <div className="text-sm font-semibold">{s.name}</div>
            <div className="text-xs text-slate-600">{s.id}</div>
            <div className="text-xs">
              {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
            </div>
            {typeof s.distanceKm === 'number' ? <div className="text-xs">{s.distanceKm.toFixed(1)} km</div> : null}
            {s.firstYear && s.lastYear ? <div className="text-xs">{s.firstYear}–{s.lastYear}</div> : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}