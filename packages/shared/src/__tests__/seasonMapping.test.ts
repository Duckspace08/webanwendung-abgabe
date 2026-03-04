import { describe, expect, it } from 'vitest';
import { getSeasonForMonth } from '../season.js';

describe('getSeasonForMonth', () => {
  it('maps months to meteorological seasons (northern hemisphere default)', () => {
    expect(getSeasonForMonth(2024, 3)).toEqual({ season: 'SPRING', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 7)).toEqual({ season: 'SUMMER', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 10)).toEqual({ season: 'AUTUMN', seasonYear: 2024 });

    // Winter is named by the year of its December month:
    // Jan/Feb belong to the previous seasonYear.
    expect(getSeasonForMonth(2024, 1)).toEqual({ season: 'WINTER', seasonYear: 2023 });
    expect(getSeasonForMonth(2024, 2)).toEqual({ season: 'WINTER', seasonYear: 2023 });
    expect(getSeasonForMonth(2024, 12)).toEqual({ season: 'WINTER', seasonYear: 2024 });
  });

  it('supports southern hemisphere inversion via latitude', () => {
    const s = { latitude: -33.0 };

    // In the south, July is WINTER (meteorological inversion).
    expect(getSeasonForMonth(2025, 7, s)).toEqual({ season: 'WINTER', seasonYear: 2025 });

    // In the south, April is AUTUMN.
    expect(getSeasonForMonth(2025, 4, s)).toEqual({ season: 'AUTUMN', seasonYear: 2025 });

    // Cross-year SUMMER in the south is named by the December year.
    expect(getSeasonForMonth(2026, 1, s)).toEqual({ season: 'SUMMER', seasonYear: 2025 });
    expect(getSeasonForMonth(2025, 12, s)).toEqual({ season: 'SUMMER', seasonYear: 2025 });
  });
});