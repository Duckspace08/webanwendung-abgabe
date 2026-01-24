'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import type { StationResult } from '../lib/api';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const StationMap = ({
  stations,
  selectedId,
  onSelect,
  center,
  radiusKm,
}: {
  stations: StationResult[];
  selectedId?: string;
  onSelect: (id: string) => void;
  center: { lat: number; lon: number };
  radiusKm: number;
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = L.map(containerRef.current).setView([center.lat, center.lon], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
  }, [center.lat, center.lon]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    const circle = L.circle([center.lat, center.lon], {
      radius: radiusKm * 1000,
      color: '#2563eb',
      fillOpacity: 0.1,
    });
    layer.addLayer(circle);

    stations.forEach((station) => {
      const marker = L.marker([station.latitude, station.longitude], {
        icon: markerIcon,
        opacity: station.id === selectedId ? 1 : 0.7,
      });
      marker.on('click', () => onSelect(station.id));
      marker.bindPopup(`${station.name} (${station.distanceKm} km)`);
      layer.addLayer(marker);
    });

    map.fitBounds(circle.getBounds().pad(0.2));
  }, [stations, center.lat, center.lon, radiusKm, selectedId, onSelect]);

  return <div ref={containerRef} className="h-[360px] w-full" aria-label="Karte" />;
};
