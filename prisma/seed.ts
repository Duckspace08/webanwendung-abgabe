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

const startYear = 2015;
const endYear = 2025;

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
  const yearlyMap = new Map<string, { tminSum: number; tminCount: number; tmaxSum: number; tmaxCount: number }>();
  const seasonalMap = new Map<
    string,
    { tminSum: number; tminCount: number; tmaxSum: number; tmaxCount: number; season: string; year: number }
  >();

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

        const yearKey = `${station.id}::${year}`;
        const yearly = yearlyMap.get(yearKey) ?? { tminSum: 0, tminCount: 0, tmaxSum: 0, tmaxCount: 0 };
        if (typeof tmin === 'number') {
          yearly.tminSum += tmin;
          yearly.tminCount += 1;
        }
        if (typeof tmax === 'number') {
          yearly.tmaxSum += tmax;
          yearly.tmaxCount += 1;
        }
        yearlyMap.set(yearKey, yearly);

        const month = date.getUTCMonth() + 1;
        const { season, seasonYear } = getSeasonForMonth(year, month);
        const seasonKey = `${station.id}::${seasonYear}::${season}`;
        const seasonal = seasonalMap.get(seasonKey) ?? {
          tminSum: 0,
          tminCount: 0,
          tmaxSum: 0,
          tmaxCount: 0,
          season,
          year: seasonYear,
        };
        if (typeof tmin === 'number') {
          seasonal.tminSum += tmin;
          seasonal.tminCount += 1;
        }
        if (typeof tmax === 'number') {
          seasonal.tmaxSum += tmax;
          seasonal.tmaxCount += 1;
        }
        seasonalMap.set(seasonKey, seasonal);
      }
    }
  }

  const yearlyRows: Prisma.YearlyAggregateCreateManyInput[] = [];
  const seasonalRows: Prisma.SeasonalAggregateCreateManyInput[] = [];

  yearlyMap.forEach((value, key) => {
    const [stationId, yearString] = key.split('::');
    const year = Number(yearString);
    yearlyRows.push({
      id: randomUUID(),
      stationId,
      year,
      avgTminC: value.tminCount ? Number((value.tminSum / value.tminCount).toFixed(2)) : null,
      avgTmaxC: value.tmaxCount ? Number((value.tmaxSum / value.tmaxCount).toFixed(2)) : null,
      daysCountTmin: value.tminCount,
      daysCountTmax: value.tmaxCount,
    });
  });

  seasonalMap.forEach((value, key) => {
    const [stationId] = key.split('::');
    seasonalRows.push({
      id: randomUUID(),
      stationId,
      year: value.year,
      season: value.season as Prisma.Season,
      avgTminC: value.tminCount ? Number((value.tminSum / value.tminCount).toFixed(2)) : null,
      avgTmaxC: value.tmaxCount ? Number((value.tmaxSum / value.tmaxCount).toFixed(2)) : null,
      daysCountTmin: value.tminCount,
      daysCountTmax: value.tmaxCount,
    });
  });

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