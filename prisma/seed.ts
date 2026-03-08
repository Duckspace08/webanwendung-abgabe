import { PrismaClient, Prisma } from '@prisma/client';
import { getSeasonForMonth } from '@webanwendung/shared';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const stations = [
  { id: 'DE-001', name: 'Berlin Tempelhof', latitude: 52.47, longitude: 13.4, elevation: 49 },
  { id: 'DE-002', name: 'Hamburg Fuhlsbüttel', latitude: 53.63, longitude: 9.99, elevation: 16 },
  { id: 'DE-003', name: 'Munich City', latitude: 48.14, longitude: 11.57, elevation: 520 },
  { id: 'DE-004', name: 'Frankfurt Main', latitude: 50.11, longitude: 8.68, elevation: 112 },
  { id: 'DE-005', name: 'Cologne West', latitude: 50.94, longitude: 6.96, elevation: 37 },
  { id: 'FR-001', name: 'Paris Montsouris', latitude: 48.82, longitude: 2.33, elevation: 75 },
  { id: 'FR-002', name: 'Lyon Bron', latitude: 45.73, longitude: 4.95, elevation: 201 },
  { id: 'ES-001', name: 'Madrid Retiro', latitude: 40.42, longitude: -3.68, elevation: 667 },
  { id: 'ES-002', name: 'Barcelona Fabra', latitude: 41.42, longitude: 2.12, elevation: 412 },
  { id: 'IT-001', name: 'Rome Ciampino', latitude: 41.8, longitude: 12.59, elevation: 130 },
  { id: 'IT-002', name: 'Milan Linate', latitude: 45.43, longitude: 9.28, elevation: 103 },
  { id: 'NO-001', name: 'Oslo Blindern', latitude: 59.94, longitude: 10.72, elevation: 94 },
  { id: 'SE-001', name: 'Stockholm Arlanda', latitude: 59.65, longitude: 17.95, elevation: 41 },
  { id: 'FI-001', name: 'Helsinki Kaisaniemi', latitude: 60.18, longitude: 24.94, elevation: 3 },
  { id: 'UK-001', name: 'London Heathrow', latitude: 51.47, longitude: -0.45, elevation: 25 },
  { id: 'UK-002', name: 'Edinburgh Gogarbank', latitude: 55.92, longitude: -3.34, elevation: 45 },
  { id: 'US-001', name: 'New York Central Park', latitude: 40.78, longitude: -73.97, elevation: 40 },
  { id: 'US-002', name: 'Chicago Midway', latitude: 41.78, longitude: -87.75, elevation: 188 },
  { id: 'US-003', name: 'Miami Intl', latitude: 25.79, longitude: -80.29, elevation: 2 },
  { id: 'US-004', name: 'Denver Stapleton', latitude: 39.76, longitude: -104.87, elevation: 1600 },
  { id: 'US-005', name: 'Seattle Tacoma', latitude: 47.45, longitude: -122.31, elevation: 130 },
  { id: 'BR-001', name: 'São Paulo Mirante', latitude: -23.5, longitude: -46.62, elevation: 792 },
  { id: 'BR-002', name: 'Rio de Janeiro', latitude: -22.91, longitude: -43.17, elevation: 5 },
  { id: 'ZA-001', name: 'Cape Town', latitude: -33.92, longitude: 18.42, elevation: 15 },
  { id: 'AU-001', name: 'Sydney Observatory', latitude: -33.86, longitude: 151.2, elevation: 39 },
  { id: 'AU-002', name: 'Melbourne Regional', latitude: -37.67, longitude: 144.85, elevation: 141 },
  { id: 'JP-001', name: 'Tokyo Otemachi', latitude: 35.68, longitude: 139.76, elevation: 25 },
  { id: 'IN-001', name: 'Delhi Safdarjung', latitude: 28.58, longitude: 77.2, elevation: 216 },
  { id: 'KE-001', name: 'Nairobi Dagoretti', latitude: -1.3, longitude: 36.74, elevation: 1798 },
  { id: 'CA-001', name: 'Toronto Pearson', latitude: 43.68, longitude: -79.63, elevation: 173 },
];

// Wichtig (Formeln.yaml): WI(2026) = Dez 2025 + Jan/Feb 2026. Daher mindestens bis 2026 seeden.

const startYear = 2015;
const endYear = 2026;

const toFixed2 = (v: number | null) => (v === null ? null : Number(v.toFixed(2)));

const generateTemperatureForDay = (latitude: number, dayOfYear: number) => {
  // Rough sinusoidal climate model by latitude band
  const absLat = Math.abs(latitude);
  const amplitude = absLat > 60 ? 20 : absLat > 40 ? 15 : absLat > 20 ? 10 : 6;
  const baseline = absLat > 60 ? -5 : absLat > 40 ? 6 : absLat > 20 ? 16 : 24;

  // phase shift: coldest around day 15 (Jan), warmest around day 200 (Jul)
  const radians = ((dayOfYear - 200) / 365) * 2 * Math.PI;
  const seasonal = Math.sin(radians);

  // daily range
  const range = absLat > 60 ? 8 : absLat > 40 ? 10 : 12;

  const tmean = baseline + amplitude * seasonal;
  const tminC = tmean - range / 2;
  const tmaxC = tmean + range / 2;

  return { tminC, tmaxC };
};

const seed = async () => {
  // Clean DB
  await prisma.seasonalAggregate.deleteMany();
  await prisma.yearlyAggregate.deleteMany();
  await prisma.dailyObservation.deleteMany();
  await prisma.station.deleteMany();

  // Insert stations (with geog point)
  for (const station of stations) {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "Station" ("id", "name", "latitude", "longitude", "elevation", "firstYear", "lastYear", "geom", "isSynthetic")
        VALUES (${station.id}, ${station.name}, ${station.latitude}, ${station.longitude}, ${station.elevation}, ${startYear}, ${endYear},
          ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)::geography,
          TRUE
        );
      `,
    );
  }

  const dailyRows: Prisma.DailyObservationCreateManyInput[] = [];

  // Aggregation nach Formeln.yaml (selected_variant = mean_of_daily_extremes):
  // - Periodenmittel = Mittel der gültigen Tagesextreme (nicht Mittel der Monatsmittel)
  // - Gültigkeitsregel: N_valid / N_expected >= 0.90 (je Kennzahl separat)

  type Hemisphere = 'N' | 'S';
  const getHemisphereForLatitude = (lat: number): Hemisphere => (lat < 0 ? 'S' : 'N');

  const isLeapYear = (year: number) => new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
  // month is 1-12 (meteorological month number)
  const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
  const expectedDaysForYear = (year: number) => (isLeapYear(year) ? 366 : 365);

  const getSeasonMonths = (seasonYear: number, season: Prisma.Season, hemisphere: Hemisphere): { year: number; month: number }[] => {
    if (hemisphere === 'N') {
      switch (season) {
        case 'WINTER':
          return [
            { year: seasonYear - 1, month: 12 },
            { year: seasonYear, month: 1 },
            { year: seasonYear, month: 2 },
          ];
        case 'SPRING':
          return [
            { year: seasonYear, month: 3 },
            { year: seasonYear, month: 4 },
            { year: seasonYear, month: 5 },
          ];
        case 'SUMMER':
          return [
            { year: seasonYear, month: 6 },
            { year: seasonYear, month: 7 },
            { year: seasonYear, month: 8 },
          ];
        case 'AUTUMN':
          return [
            { year: seasonYear, month: 9 },
            { year: seasonYear, month: 10 },
            { year: seasonYear, month: 11 },
          ];
        default:
          return [];
      }
    }

    // Southern hemisphere meteorological seasons:
    // SUMMER(Y) = Dec(Y-1)+Jan..Feb(Y), AUTUMN(Y)=Mar..May(Y), WINTER(Y)=Jun..Aug(Y), SPRING(Y)=Sep..Nov(Y)
    switch (season) {
      case 'SUMMER':
        return [
          { year: seasonYear - 1, month: 12 },
          { year: seasonYear, month: 1 },
          { year: seasonYear, month: 2 },
        ];
      case 'AUTUMN':
        return [
          { year: seasonYear, month: 3 },
          { year: seasonYear, month: 4 },
          { year: seasonYear, month: 5 },
        ];
      case 'WINTER':
        return [
          { year: seasonYear, month: 6 },
          { year: seasonYear, month: 7 },
          { year: seasonYear, month: 8 },
        ];
      case 'SPRING':
        return [
          { year: seasonYear, month: 9 },
          { year: seasonYear, month: 10 },
          { year: seasonYear, month: 11 },
        ];
      default:
        return [];
    }
  };

  const expectedDaysForSeason = (seasonYear: number, season: Prisma.Season, hemisphere: Hemisphere) =>
    getSeasonMonths(seasonYear, season, hemisphere).reduce((sum, m) => sum + daysInMonth(m.year, m.month), 0);

  const MIN_PERIOD_FRACTION = 0.9;

  type PeriodAgg = { tminSum: number; tminDays: number; tmaxSum: number; tmaxDays: number };
  type SeasonAgg = PeriodAgg & { stationId: string; year: number; season: Prisma.Season; hemisphere: Hemisphere };

  const yearlyAgg = new Map<string, PeriodAgg>(); // stationId::year
  const seasonalAgg = new Map<string, SeasonAgg>(); // stationId::seasonYear::season

  for (const station of stations) {
    const hemisphere = getHemisphereForLatitude(station.latitude);

    for (let year = startYear; year <= endYear; year += 1) {
      const daysInYear = expectedDaysForYear(year);

      for (let day = 0; day < daysInYear; day += 1) {
        const date = new Date(Date.UTC(year, 0, 1 + day));
        const dayOfYear = day + 1;

        const { tminC, tmaxC } = generateTemperatureForDay(station.latitude, dayOfYear);

        const tmin = Math.random() < 0.03 ? null : Number(tminC.toFixed(1));
        const tmax = Math.random() < 0.03 ? null : Number(tmaxC.toFixed(1));

        dailyRows.push({
          id: randomUUID(),
          stationId: station.id,
          date,
          tminC: tmin,
          tmaxC: tmax,
        });

        // --- Yearly accumulator (calendar year Jan..Dec)
        const yKey = `${station.id}::${year}`;
        const y = yearlyAgg.get(yKey) ?? { tminSum: 0, tminDays: 0, tmaxSum: 0, tmaxDays: 0 };

        if (typeof tmin === 'number') {
          y.tminSum += tmin;
          y.tminDays += 1;
        }
        if (typeof tmax === 'number') {
          y.tmaxSum += tmax;
          y.tmaxDays += 1;
        }

        yearlyAgg.set(yKey, y);

        // --- Seasonal accumulator (seasonYear per getSeasonForMonth, aligned to Formeln.yaml WI(Y)=Dec(Y-1)+Jan..Feb(Y))
        const month = date.getUTCMonth() + 1;
        const { season, seasonYear } = getSeasonForMonth(year, month, { latitude: station.latitude });
        const sKey = `${station.id}::${seasonYear}::${season}`;
        const s =
          seasonalAgg.get(sKey) ??
          ({
            stationId: station.id,
            year: seasonYear,
            season: season as Prisma.Season,
            hemisphere,
            tminSum: 0,
            tminDays: 0,
            tmaxSum: 0,
            tmaxDays: 0,
          } satisfies SeasonAgg);

        if (typeof tmin === 'number') {
          s.tminSum += tmin;
          s.tminDays += 1;
        }
        if (typeof tmax === 'number') {
          s.tmaxSum += tmax;
          s.tmaxDays += 1;
        }

        seasonalAgg.set(sKey, s);
      }
    }
  }

  // --- YearlyAggregate (calendar year; mean of valid daily extremes; coverage >= 90%) ---
  const yearlyRows: Prisma.YearlyAggregateCreateManyInput[] = [];

  for (const station of stations) {
    for (let year = startYear; year <= endYear; year += 1) {
      const acc = yearlyAgg.get(`${station.id}::${year}`);
      if (!acc) continue;

      const expectedDays = expectedDaysForYear(year);

      const avgTminC =
        acc.tminDays > 0 && acc.tminDays / expectedDays >= MIN_PERIOD_FRACTION ? toFixed2(acc.tminSum / acc.tminDays) : null;
      const avgTmaxC =
        acc.tmaxDays > 0 && acc.tmaxDays / expectedDays >= MIN_PERIOD_FRACTION ? toFixed2(acc.tmaxSum / acc.tmaxDays) : null;

      if (avgTminC === null && avgTmaxC === null) continue;

      yearlyRows.push({
        id: randomUUID(),
        stationId: station.id,
        year,
        avgTminC,
        avgTmaxC,
        daysCountTmin: acc.tminDays,
        daysCountTmax: acc.tmaxDays,
      });
    }
  }

  // --- SeasonalAggregate (mean of valid daily extremes; coverage >= 90%) ---
  const seasonalRows: Prisma.SeasonalAggregateCreateManyInput[] = [];

  for (const [, acc] of seasonalAgg) {
    const expectedDays = expectedDaysForSeason(acc.year, acc.season, acc.hemisphere);
    if (!expectedDays) continue;

    const avgTminC =
      acc.tminDays > 0 && acc.tminDays / expectedDays >= MIN_PERIOD_FRACTION ? toFixed2(acc.tminSum / acc.tminDays) : null;
    const avgTmaxC =
      acc.tmaxDays > 0 && acc.tmaxDays / expectedDays >= MIN_PERIOD_FRACTION ? toFixed2(acc.tmaxSum / acc.tmaxDays) : null;

    if (avgTminC === null && avgTmaxC === null) continue;

    seasonalRows.push({
      id: randomUUID(),
      stationId: acc.stationId,
      year: acc.year,
      season: acc.season,
      avgTminC,
      avgTmaxC,
      daysCountTmin: acc.tminDays,
      daysCountTmax: acc.tmaxDays,
    });
  }

  await prisma.dailyObservation.createMany({ data: dailyRows, skipDuplicates: true });
  await prisma.yearlyAggregate.createMany({ data: yearlyRows, skipDuplicates: true });
  await prisma.seasonalAggregate.createMany({ data: seasonalRows, skipDuplicates: true });
};

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });