export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type Hemisphere = 'N' | 'S';

export const SEASONS: Season[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

export const getHemisphereForLatitude = (latitude: number): Hemisphere => (latitude < 0 ? 'S' : 'N');

export type GetSeasonForMonthOptions = {
  /**
   * If provided, the season mapping will be inverted for the southern hemisphere (latitude < 0).
   * If both `latitude` and `hemisphere` are provided, `hemisphere` wins.
   */
  latitude?: number;
  hemisphere?: Hemisphere;
};

/**
 * Meteorological seasons (3-month blocks).
 *
 * SeasonYear convention (important for cross-year seasons):
 * - The season is named by the year of its December month.
 *   Example (Northern hemisphere): WINTER 2025 = Dec 2025 + Jan 2026 + Feb 2026.
 *
 * For the Southern hemisphere, seasons are inverted by 6 months:
 * - N: WINTER ↔ S: SUMMER, N: SPRING ↔ S: AUTUMN.
 */
export const getSeasonForMonth = (
  year: number,
  month: number,
  options?: GetSeasonForMonthOptions,
): { season: Season; seasonYear: number } => {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }

  const hemisphere: Hemisphere =
    options?.hemisphere ?? (typeof options?.latitude === 'number' ? getHemisphereForLatitude(options.latitude) : 'N');

  // Northern hemisphere mapping first (meteorological).
  let season: Season;
  if ([3, 4, 5].includes(month)) season = 'SPRING';
  else if ([6, 7, 8].includes(month)) season = 'SUMMER';
  else if ([9, 10, 11].includes(month)) season = 'AUTUMN';
  else season = 'WINTER';

  // SeasonYear is the December year for the cross-year season:
  // - Dec belongs to seasonYear = current year
  // - Jan/Feb belongs to seasonYear = previous year
  // - all other months belong to seasonYear = current year
  const seasonYear = month === 1 || month === 2 ? year - 1 : year;

  if (hemisphere === 'N') {
    return { season, seasonYear };
  }

  // Southern hemisphere: invert seasons by 6 months.
  const inverted: Record<Season, Season> = {
    SPRING: 'AUTUMN',
    SUMMER: 'WINTER',
    AUTUMN: 'SPRING',
    WINTER: 'SUMMER',
  };

  return { season: inverted[season], seasonYear };
};