import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('web/lib/api', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it('fetchNearbyStations builds correct URL and returns JSON', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';

    const mockStations = [{ id: 'DE-001', name: 'Berlin', latitude: 1, longitude: 2, elevation: null, firstYear: 2015, lastYear: 2025, distanceKm: 1 }];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockStations), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    
    globalThis.fetch = fetchMock;

    const { fetchNearbyStations } = await import('../lib/api');

    const result = await fetchNearbyStations({
      lat: 52.52,
      lon: 13.405,
      radiusKm: 500,
      limit: 10,
      minYear: 2018,
      maxYear: 2025,
    });

    expect(result).toEqual(mockStations);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('http://localhost:3001/api/stations/nearby?');
    expect(calledUrl).toContain('lat=52.52');
    expect(calledUrl).toContain('lon=13.405');
    expect(calledUrl).toContain('radiusKm=500');
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('minYear=2018');
    expect(calledUrl).toContain('maxYear=2025');
  });

  it('fetchAggregates throws ApiError on non-ok response', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Station not found' } }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    );

    globalThis.fetch = fetchMock;

    const { fetchAggregates } = await import('../lib/api');

    await expect(
      fetchAggregates('UNKNOWN', { fromYear: 2018, toYear: 2025 }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'NOT_FOUND',
      message: 'Station not found',
    });
  });
});