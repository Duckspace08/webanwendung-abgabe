import { describe, expect, it } from 'vitest';
import { getSeasonForMonth } from '../season.js';

describe('getSeasonForMonth', () => {
  it('maps months to seasons', () => {
    expect(getSeasonForMonth(2024, 3)).toEqual({ season: 'SPRING', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 7)).toEqual({ season: 'SUMMER', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 10)).toEqual({ season: 'AUTUMN', seasonYear: 2024 });
    expect(getSeasonForMonth(2024, 1)).toEqual({ season: 'WINTER', seasonYear: 2024 });
  });

  it('assigns December to next year winter', () => {
    expect(getSeasonForMonth(2019, 12)).toEqual({ season: 'WINTER', seasonYear: 2020 });
  });
});
