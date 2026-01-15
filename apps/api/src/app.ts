import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { nearbyStationsQuerySchema, aggregatesQuerySchema } from '@webanwendung/shared';
import { LRUCache } from 'lru-cache';
import { prisma } from './db.js';
import pkg from '../package.json' assert { type: 'json' };

const cache = new LRUCache<string, unknown>({
  max: 500,
  ttl: 1000 * 60 * 10,
});

const buildErrorResponse = (code: string, message: string, details?: unknown) => ({
  error: { code, message, details },
});

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.WEB_ORIGIN || true,
  });

  app.get('/api/health', async () => ({
    status: 'ok',
    time: new Date().toISOString(),
    version: pkg.version,
  }));

  app.get('/api/stations/nearby', async (request, reply) => {
    try {
      const params = nearbyStationsQuerySchema.parse(request.query);
      const cacheKey = `nearby:${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const { lat, lon, radiusKm, limit, minYear, maxYear } = params;
      const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography`;
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          elevation: number | null;
          firstYear: number;
          lastYear: number;
          distancekm: number;
        }>
      >(Prisma.sql`
        SELECT
          "id",
          "name",
          "latitude",
          "longitude",
          "elevation",
          "firstYear",
          "lastYear",
          ST_Distance("geom", ${point}) / 1000 AS distanceKm
        FROM "Station"
        WHERE ST_DWithin("geom", ${point}, ${radiusKm * 1000})
          AND "firstYear" <= ${minYear}
          AND "lastYear" >= ${maxYear}
        ORDER BY distanceKm ASC
        LIMIT ${limit};
      `);

      const response = rows.map((row) => ({
        id: row.id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        elevation: row.elevation,
        firstYear: row.firstYear,
        lastYear: row.lastYear,
        distanceKm: Math.round(row.distancekm * 10) / 10,
      }));

      cache.set(cacheKey, response);
      return response;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply
          .status(400)
          .send(buildErrorResponse('INVALID_PARAMS', 'Invalid query parameters', error.issues));
      }
      request.log.error({ error }, 'Failed to fetch nearby stations');
      return reply
        .status(500)
        .send(buildErrorResponse('INTERNAL_ERROR', 'Unexpected server error'));
    }
  });

  app.get('/api/stations/:id/aggregates', async (request, reply) => {
    const stationId = (request.params as { id: string }).id;

    try {
      const params = aggregatesQuerySchema.parse(request.query);
      const cacheKey = `aggregate:${stationId}:${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const station = await prisma.station.findUnique({ where: { id: stationId } });
      if (!station) {
        return reply
          .status(404)
          .send(buildErrorResponse('NOT_FOUND', 'Station not found'));
      }

      const yearly = await prisma.yearlyAggregate.findMany({
        where: {
          stationId,
          year: {
            gte: params.fromYear,
            lte: params.toYear,
          },
        },
        orderBy: { year: 'asc' },
      });

      const seasonal = await prisma.seasonalAggregate.findMany({
        where: {
          stationId,
          year: {
            gte: params.fromYear,
            lte: params.toYear,
          },
        },
        orderBy: [{ year: 'asc' }, { season: 'asc' }],
      });

      const response = { station, yearly, seasonal };
      cache.set(cacheKey, response);
      return response;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply
          .status(400)
          .send(buildErrorResponse('INVALID_PARAMS', 'Invalid query parameters', error.issues));
      }
      request.log.error({ error }, 'Failed to fetch aggregates');
      return reply
        .status(500)
        .send(buildErrorResponse('INTERNAL_ERROR', 'Unexpected server error'));
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(buildErrorResponse('INVALID_PARAMS', 'Invalid query parameters', error.issues));
    }
    return reply
      .status(500)
      .send(buildErrorResponse('INTERNAL_ERROR', 'Unexpected server error'));
  });

  return app;
};
