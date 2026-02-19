import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db.js';

const app = buildApp();

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('API integration', () => {
  it('returns health', async () => {
    const response = await request(app.server).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });


  it('returns import status', async () => {
    const response = await request(app.server).get('/api/import/status');
    expect(response.status).toBe(200);
    expect(response.body.key).toBe('noaa_ghcn_daily');
    expect(response.body.endYear).toBeDefined();
  });

  it('returns nearby stations', async () => {
    const response = await request(app.server)
      .get('/api/stations/nearby')
      .query({
        lat: 52.52,
        lon: 13.405,
        radiusKm: 500,
        limit: 5,
        minYear: 2018,
        maxYear: 2024,
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('rejects invalid query params', async () => {
    const response = await request(app.server)
      .get('/api/stations/nearby')
      .query({ lat: 200, lon: 0, radiusKm: 10, limit: 5, minYear: 2020, maxYear: 2019 });

    expect(response.status).toBe(400);
  });

  it('returns aggregates for station', async () => {
    const station = await prisma.station.findFirst();
    expect(station).not.toBeNull();

    const response = await request(app.server)
      .get(`/api/stations/${station?.id}/aggregates`)
      .query({ fromYear: station?.firstYear, toYear: station?.lastYear });

    expect(response.status).toBe(200);
    expect(response.body.station.id).toBe(station?.id);
  });

  it('returns 404 for unknown station', async () => {
    const response = await request(app.server)
      .get('/api/stations/UNKNOWN/aggregates')
      .query({ fromYear: 2018, toYear: 2024 });

    expect(response.status).toBe(404);
  });

  it('rejects invalid year ranges', async () => {
    const station = await prisma.station.findFirst();
    const response = await request(app.server)
      .get(`/api/stations/${station?.id}/aggregates`)
      .query({ fromYear: 2024, toYear: 2020 });

    expect(response.status).toBe(400);
  });
});
