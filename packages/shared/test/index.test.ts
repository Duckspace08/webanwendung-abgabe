import { describe, expect, it } from 'vitest';
import { aggregatesQuerySchema, nearbyStationsQuerySchema } from '../src/index';

describe('shared/src/index exports', () => {
  it('exports nearbyStationsQuerySchema and validates typical input', () => {
    const result = nearbyStationsQuerySchema.safeParse({
      lat: 52.52,
      lon: 13.405,
      radiusKm: 500,
      limit: 10,
      minYear: 2018,
      maxYear: 2025,
    });

    expect(result.success).toBe(true);
  });

  it('exports aggregatesQuerySchema and validates typical input', () => {
    const result = aggregatesQuerySchema.safeParse({
      fromYear: 2018,
      toYear: 2025,
    });

    expect(result.success).toBe(true);
  });
});