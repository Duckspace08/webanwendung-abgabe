import { describe, expect, it } from 'vitest';
import { getSeasonForMonth } from '../season.js';

describe('getSeasonForMonth', () => {
  it('maps months to meteorological seasons (northern hemisphere default)', () => {
    expect(getSeasonForMonth(2024, 3)).toEqual({ season: 'SPRING', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 7)).toEqual({ season: 'SUMMER', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 10)).toEqual({ season: 'AUTUMN', seasonYear: 2024 });

    // Dozentenvorgabe:
    // Winter x = Dezember x + Januar x+1 + Februar x+1
    // => January/February belong to the previous winter year,
    //    December belongs to the current winter year.
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

    // Analogous convention in the southern hemisphere:
    // Summer x = Dezember x + Januar x+1 + Februar x+1
    expect(getSeasonForMonth(2026, 1, s)).toEqual({ season: 'SUMMER', seasonYear: 2025 });
    expect(getSeasonForMonth(2025, 12, s)).toEqual({ season: 'SUMMER', seasonYear: 2025 });
  });
});