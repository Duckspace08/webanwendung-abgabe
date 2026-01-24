const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export type StationResult = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  firstYear: number;
  lastYear: number;
  distanceKm: number;
};

export type AggregateResponse = {
  station: StationResult;
  yearly: Array<{
    year: number;
    avgTminC: number | null;
    avgTmaxC: number | null;
    daysCountTmin: number;
    daysCountTmax: number;
  }>;
  seasonal: Array<{
    year: number;
    season: string;
    avgTminC: number | null;
    avgTmaxC: number | null;
    daysCountTmin: number;
    daysCountTmax: number;
  }>;
};

export const fetchNearbyStations = async (params: {
  lat: number;
  lon: number;
  radiusKm: number;
  limit: number;
  minYear: number;
  maxYear: number;
}): Promise<StationResult[]> => {
  const url = new URL('/api/stations/nearby', baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to load stations');
  }
  return response.json();
};

export const fetchAggregates = async (stationId: string, params: {
  fromYear: number;
  toYear: number;
}): Promise<AggregateResponse> => {
  const url = new URL(`/api/stations/${stationId}/aggregates`, baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to load aggregates');
  }
  return response.json();
};
