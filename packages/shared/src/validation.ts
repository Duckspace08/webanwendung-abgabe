import { z } from 'zod';

export const nearbyStationsQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().min(1).max(2000),
    limit: z.coerce.number().int().min(1).max(50),
    minYear: z.coerce.number().int(),
    maxYear: z.coerce.number().int(),
  })
  .refine((data) => data.minYear <= data.maxYear, {
    message: 'minYear must be <= maxYear',
    path: ['minYear'],
  });

export const aggregatesQuerySchema = z
  .object({
    fromYear: z.coerce.number().int(),
    toYear: z.coerce.number().int(),
  })
  .refine((data) => data.fromYear <= data.toYear, {
    message: 'fromYear must be <= toYear',
    path: ['fromYear'],
  });
