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

// Wichtig für „Winter 2025 = Dez 2025 + Jan/Feb 2026“: mindestens bis 2026 seeden.
const startYear = 2015;
const endYear = 2026;

type MonthlyAcc = { tminSum: number; tminCount: number; tmaxSum: number; tmaxCount: number };

const toFixed2 = (value: number | null) => (value === null ? null : Number(value.toFixed(2)));

const gaussianNoise = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const generateTemperatureForDay = (latitude: number, dayOfYear: number) => {
  const base = 25 - Math.abs(latitude) * 0.35;
  const amplitude = 10 + Math.abs(latitude) * 0.15;
  const seasonal = Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365);
  const hemisphereAdjusted = latitude >= 0 ? seasonal : -seasonal;
  const noise = gaussianNoise() * 1.5;
  const avg = base + amplitude * hemisphereAdjusted + noise;
  const dailyRange = 6 + Math.random() * 4;
  return {
    tminC: avg - dailyRange / 2,
    tmaxC: avg + dailyRange / 2,
  };
};

const seed = async () => {
  await prisma.seasonalAggregate.deleteMany();
  await prisma.yearlyAggregate.deleteMany();
  await prisma.dailyObservation.deleteMany();
  await prisma.station.deleteMany();

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

  // Monatsakkus sind die Basis der meteorologischen Mittel:
  // Monatsmittel = Mittel der Tageswerte; Jahres-/Saisonmittel = Mittel der Monatsmittel.
  const monthlyMap = new Map<string, MonthlyAcc>(); // stationId::year::month -> sums/counts

  for (const station of stations) {
    for (let year = startYear; year <= endYear; year += 1) {
      const isLeapYear = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
      const daysInYear = isLeapYear ? 366 : 365;

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

        const month = date.getUTCMonth() + 1;
        const monthKey = `${station.id}::${year}::${month}`;
        const m = monthlyMap.get(monthKey) ?? { tminSum: 0, tminCount: 0, tmaxSum: 0, tmaxCount: 0 };

        if (typeof tmin === 'number') {
          m.tminSum += tmin;
          m.tminCount += 1;
        }
        if (typeof tmax === 'number') {
          m.tmaxSum += tmax;
          m.tmaxCount += 1;
        }

        monthlyMap.set(monthKey, m);
      }
    }
  }

  // --- YearlyAggregate (Jahresmittel aus 12 Monatsmitteln) ---
  const yearlyRows: Prisma.YearlyAggregateCreateManyInput[] = [];

  for (const station of stations) {
    for (let year = startYear; year <= endYear; year += 1) {
      let tminMonthSum = 0;
      let tmaxMonthSum = 0;
      const tminMonths = new Set<number>();
      const tmaxMonths = new Set<number>();
      let tminDays = 0;
      let tmaxDays = 0;

      for (let month = 1; month <= 12; month += 1) {
        const m = monthlyMap.get(`${station.id}::${year}::${month}`);
        if (!m) continue;

        if (m.tminCount > 0) {
          tminMonthSum += m.tminSum / m.tminCount;
          tminMonths.add(month);
          tminDays += m.tminCount;
        }
        if (m.tmaxCount > 0) {
          tmaxMonthSum += m.tmaxSum / m.tmaxCount;
          tmaxMonths.add(month);
          tmaxDays += m.tmaxCount;
        }
      }

      const avgTminC = tminMonths.size === 12 ? toFixed2(tminMonthSum / 12) : null;
      const avgTmaxC = tmaxMonths.size === 12 ? toFixed2(tmaxMonthSum / 12) : null;

      if (avgTminC === null && avgTmaxC === null) continue;

      yearlyRows.push({
        id: randomUUID(),
        stationId: station.id,
        year,
        avgTminC,
        avgTmaxC,
        daysCountTmin: tminDays,
        daysCountTmax: tmaxDays,
      });
    }
  }

  // --- SeasonalAggregate (Saisonmittel aus 3 Monatsmitteln; Winter/Sommer cross-year via seasonYear) ---
  type SeasonAcc = {
    stationId: string;
    year: number;
    season: string;
    tminMonthSum: number;
    tmaxMonthSum: number;
    tminMonths: Set<number>;
    tmaxMonths: Set<number>;
    tminDays: number;
    tmaxDays: number;
  };

  const seasonalAcc = new Map<string, SeasonAcc>(); // stationId::seasonYear::season

  for (const station of stations) {
    for (let year = startYear; year <= endYear; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const m = monthlyMap.get(`${station.id}::${year}::${month}`);
        if (!m) continue;

        const { season, seasonYear } = getSeasonForMonth(year, month, { latitude: station.latitude });
        const key = `${station.id}::${seasonYear}::${season}`;

        const acc =
          seasonalAcc.get(key) ??
          ({
            stationId: station.id,
            year: seasonYear,
            season,
            tminMonthSum: 0,
            tmaxMonthSum: 0,
            tminMonths: new Set<number>(),
            tmaxMonths: new Set<number>(),
            tminDays: 0,
            tmaxDays: 0,
          } satisfies SeasonAcc);

        if (m.tminCount > 0) {
          acc.tminMonthSum += m.tminSum / m.tminCount;
          acc.tminMonths.add(month);
          acc.tminDays += m.tminCount;
        }
        if (m.tmaxCount > 0) {
          acc.tmaxMonthSum += m.tmaxSum / m.tmaxCount;
          acc.tmaxMonths.add(month);
          acc.tmaxDays += m.tmaxCount;
        }

        seasonalAcc.set(key, acc);
      }
    }
  }

  const seasonalRows: Prisma.SeasonalAggregateCreateManyInput[] = [];

  for (const [, acc] of seasonalAcc) {
    const avgTminC = acc.tminMonths.size === 3 ? toFixed2(acc.tminMonthSum / 3) : null;
    const avgTmaxC = acc.tmaxMonths.size === 3 ? toFixed2(acc.tmaxMonthSum / 3) : null;

    // Keine Teil-Saisons persistieren (z. B. nur Dez ohne Jan/Feb).
    if (avgTminC === null && avgTmaxC === null) continue;

    seasonalRows.push({
      id: randomUUID(),
      stationId: acc.stationId,
      year: acc.year,
      season: acc.season as Prisma.Season,
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