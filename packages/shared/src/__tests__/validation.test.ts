import { describe, expect, it } from 'vitest';
import { aggregatesQuerySchema, nearbyStationsQuerySchema } from '../validation.js';

describe('validation schemas', () => {
  it('validates nearby stations query', () => {
    const parsed = nearbyStationsQuerySchema.parse({
      lat: '50',
      lon: '8',
      radiusKm: '100',
      limit: '10',
      minYear: '2015',
      maxYear: '2024',
    });

    expect(parsed.limit).toBe(10);
  });

  it('rejects invalid ranges', () => {
    expect(() =>
      nearbyStationsQuerySchema.parse({
        lat: 0,
        lon: 0,
        radiusKm: 10,
        limit: 10,
        minYear: 2025,
        maxYear: 2020,
      }),
    ).toThrow();

    expect(() =>
      aggregatesQuerySchema.parse({
        fromYear: 2024,
        toYear: 2020,
      }),
    ).toThrow();
  });
});
