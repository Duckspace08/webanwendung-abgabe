export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export const SEASONS: Season[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

export const getSeasonForMonth = (
  year: number,
  month: number,
): { season: Season; seasonYear: number } => {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }

  if ([3, 4, 5].includes(month)) {
    return { season: 'SPRING', seasonYear: year };
  }
  if ([6, 7, 8].includes(month)) {
    return { season: 'SUMMER', seasonYear: year };
  }
  if ([9, 10, 11].includes(month)) {
    return { season: 'AUTUMN', seasonYear: year };
  }
  if (month === 12) {
    return { season: 'WINTER', seasonYear: year + 1 };
  }

  return { season: 'WINTER', seasonYear: year };
};
