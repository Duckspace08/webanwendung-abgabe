import { parseApiError } from './errors';

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

export type ImportStatusResponse = {
  key: string;
  status: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  endYear: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
};

const apiFetch = async <T>(url: URL): Promise<T> => {
  const response = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<T>;
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
  return apiFetch<StationResult[]>(url);
};

export const fetchAggregates = async (
  stationId: string,
  params: {
    fromYear: number;
    toYear: number;
  },
): Promise<AggregateResponse> => {
  const url = new URL(`/api/stations/${stationId}/aggregates`, baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return apiFetch<AggregateResponse>(url);
};

export const fetchImportStatus = async (): Promise<ImportStatusResponse> => {
  const url = new URL('/api/import/status', baseUrl);
  return apiFetch<ImportStatusResponse>(url);
};