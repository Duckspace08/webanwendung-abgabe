import { describe, expect, it } from 'vitest';
import { aggregateTemperatureEntries } from '../aggregation.js';

describe('aggregateTemperatureEntries', () => {
  it('calculates averages and counts', () => {
    const result = aggregateTemperatureEntries([
      { tminC: 1, tmaxC: 5 },
      { tminC: 2, tmaxC: 6 },
      { tminC: 3, tmaxC: 7 },
    ]);

    expect(result.avgTminC).toBeCloseTo(2);
    expect(result.avgTmaxC).toBeCloseTo(6);
    expect(result.daysCountTmin).toBe(3);
    expect(result.daysCountTmax).toBe(3);
  });

  it('ignores missing values', () => {
    const result = aggregateTemperatureEntries([
      { tminC: null, tmaxC: 4 },
      { tminC: 2, tmaxC: null },
      { tminC: null, tmaxC: null },
    ]);

    expect(result.avgTminC).toBeCloseTo(2);
    expect(result.daysCountTmin).toBe(1);
    expect(result.avgTmaxC).toBeCloseTo(4);
    expect(result.daysCountTmax).toBe(1);
  });
});
