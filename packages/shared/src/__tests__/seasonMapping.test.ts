import { describe, expect, it } from 'vitest';
import { getSeasonForMonth } from '../season.js';

describe('getSeasonForMonth', () => {
  it('maps months to meteorological seasons (northern hemisphere default)', () => {
    expect(getSeasonForMonth(2024, 3)).toEqual({ season: 'SPRING', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 7)).toEqual({ season: 'SUMMER', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 10)).toEqual({ season: 'AUTUMN', seasonYear: 2024 });

    // Formeln.yaml: WI(Y) = Dec(Y-1) + Jan..Feb(Y)
    // => December belongs to the next seasonYear, Jan/Feb to the same seasonYear.
    expect(getSeasonForMonth(2024, 1)).toEqual({ season: 'WINTER', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 2)).toEqual({ season: 'WINTER', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 12)).toEqual({ season: 'WINTER', seasonYear: 2025 });
  });

  it('supports southern hemisphere inversion via latitude', () => {
    const s = { latitude: -33.0 };

    // In the south, July is WINTER (meteorological inversion).
    expect(getSeasonForMonth(2025, 7, s)).toEqual({ season: 'WINTER', seasonYear: 2025 });

    // In the south, April is AUTUMN.
    expect(getSeasonForMonth(2025, 4, s)).toEqual({ season: 'AUTUMN', seasonYear: 2025 });

    // Formeln.yaml-aligned SeasonYear convention: SUMMER(Y) = Dec(Y-1) + Jan..Feb(Y)
    expect(getSeasonForMonth(2026, 1, s)).toEqual({ season: 'SUMMER', seasonYear: 2026 });
    expect(getSeasonForMonth(2025, 12, s)).toEqual({ season: 'SUMMER', seasonYear: 2026 });
  });
});