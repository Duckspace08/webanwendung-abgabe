import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { Prisma, PrismaClient, Season, SeedImportStatus } from '@prisma/client';

const prisma = new PrismaClient();

const IMPORT_KEY = 'noaa_ghcn_daily';
const LOCK_KEY = 8152025;
const FLUSH_SIZE = 50_000;

const END_YEAR = Number(process.env.NOAA_END_YEAR ?? 2025);
const BASE_URL = process.env.NOAA_BASE_URL ?? 'https://www.ncei.noaa.gov/pub/data/ghcn/daily/';
const CACHE_DIR = process.env.NOAA_CACHE_DIR ?? '/data/noaa-cache';
const FORCE_IMPORT = process.env.NOAA_IMPORT_FORCE === '1';
const IMPORT_ENABLED = process.env.NOAA_IMPORT_ENABLED !== '0';
const PURGE_SYNTHETIC = process.env.NOAA_PURGE_SYNTHETIC !== '0';

type StationRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  firstYear: number;
  lastYear: number;
};

type Accumulator = { tminSum: number; tminCount: number; tmaxSum: number; tmaxCount: number };

const getSeason = (month: number): Season => {
  if (month >= 3 && month <= 5) return Season.SPRING;
  if (month >= 6 && month <= 8) return Season.SUMMER;
  if (month >= 9 && month <= 11) return Season.AUTUMN;
  return Season.WINTER;
};

const toFixedNumber = (value: number | null) => (value === null ? null : Number(value.toFixed(2)));

const ensureDir = async (dir: string) => fs.promises.mkdir(dir, { recursive: true });

const toNodeReadable = (webStream: unknown): NodeJS.ReadableStream => {
  if (!webStream) {
    throw new TypeError('Expected a web ReadableStream but got null/undefined');
  }

  // TS/DOM typings can differ (ReadableStream<Uint8Array<ArrayBufferLike>> vs ReadableStream<Uint8Array>).
  // Runtime is compatible; normalize via cast without using `any`.
  return Readable.fromWeb(webStream as unknown as ReadableStream<Uint8Array>) as unknown as NodeJS.ReadableStream;
};

const downloadWithCache = async (fileName: string) => {
  await ensureDir(CACHE_DIR);

  const localPath = path.join(CACHE_DIR, fileName);
  if (fs.existsSync(localPath)) {
    console.log(`[importer] using cached ${fileName}`);
    return localPath;
  }

  const url = new URL(fileName, BASE_URL).toString();
  console.log(`[importer] download started ${url}`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  // Write to temp first to avoid partial
  const tmpPath = `${localPath}.tmp`;
  await ensureDir(path.dirname(localPath));

  await pipeline(toNodeReadable(response.body), fs.createWriteStream(tmpPath));
  await fs.promises.rename(tmpPath, localPath);

  console.log(`[importer] download completed ${fileName}`);
  return localPath;
};

const parseStations = async (stationsPath: string) => {
  const map = new Map<string, { name: string; latitude: number; longitude: number; elevation: number | null }>();

  const rl = readline.createInterface({
    input: fs.createReadStream(stationsPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const id = line.slice(0, 11).trim();
    const latitude = Number(line.slice(12, 20));
    const longitude = Number(line.slice(21, 30));
    const elevationRaw = line.slice(31, 37).trim();
    const elevation = elevationRaw ? Number(elevationRaw) : null;
    const name = line.slice(41, 71).trim();
    if (!id || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    map.set(id, { name, latitude, longitude, elevation });
  }

  return map;
};

const parseInventory = async (inventoryPath: string) => {
  const map = new Map<string, { firstYear: number; lastYear: number }>();

  const rl = readline.createInterface({
    input: fs.createReadStream(inventoryPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const id = line.slice(0, 11).trim();
    const element = line.slice(31, 35).trim();
    if (element !== 'TMIN' && element !== 'TMAX') continue;

    const firstYear = Number(line.slice(36, 40));
    const lastYear = Number(line.slice(41, 45));
    if (!id || !Number.isFinite(firstYear) || !Number.isFinite(lastYear)) continue;

    const current = map.get(id);
    if (!current) {
      map.set(id, { firstYear, lastYear });
    } else {
      map.set(id, {
        firstYear: Math.min(current.firstYear, firstYear),
        lastYear: Math.max(current.lastYear, lastYear),
      });
    }
  }

  return map;
};

const buildStationRows = (
  stations: Map<string, { name: string; latitude: number; longitude: number; elevation: number | null }>,
  inventory: Map<string, { firstYear: number; lastYear: number }>,
): StationRow[] => {
  const rows: StationRow[] = [];

  for (const [id, station] of stations) {
    const inv = inventory.get(id);
    if (!inv) continue;

    rows.push({
      id,
      name: station.name,
      latitude: station.latitude,
      longitude: station.longitude,
      elevation: station.elevation,
      firstYear: inv.firstYear,
      lastYear: Math.min(inv.lastYear, END_YEAR),
    });
  }

  return rows;
};

const upsertStations = async (stationRows: StationRow[]) => {
  const batchSize = 1000;

  for (let i = 0; i < stationRows.length; i += batchSize) {
    const batch = stationRows.slice(i, i + batchSize);

    const values = Prisma.join(
      batch.map(
        (s) =>
          Prisma.sql`(${s.id}, ${s.name}, ${s.latitude}, ${s.longitude}, ${s.elevation}, ${s.firstYear}, ${s.lastYear}, ST_SetSRID(ST_MakePoint(${s.longitude}, ${s.latitude}),4326)::geography, FALSE)`,
      ),
    );

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Station" ("id", "name", "latitude", "longitude", "elevation", "firstYear", "lastYear", "geom", "isSynthetic")
      VALUES ${values}
      ON CONFLICT ("id") DO UPDATE
      SET
        "name" = EXCLUDED."name",
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "elevation" = EXCLUDED."elevation",
        "firstYear" = EXCLUDED."firstYear",
        "lastYear" = EXCLUDED."lastYear",
        "geom" = EXCLUDED."geom",
        "isSynthetic" = FALSE;
    `);
  }
};

const purgeSyntheticData = async () => {
  if (!PURGE_SYNTHETIC) {
    console.log('[importer] synthetic purge disabled by NOAA_PURGE_SYNTHETIC=0');
    return;
  }

  const syntheticCount = await prisma.station.count({ where: { isSynthetic: true } });
  if (syntheticCount === 0) return;

  console.log(`[importer] purging synthetic dataset (${syntheticCount} stations)`);

  await prisma.$transaction(async (tx) => {
    const ids = await tx.station.findMany({ where: { isSynthetic: true }, select: { id: true } });
    const stationIds = ids.map((s) => s.id);
    if (stationIds.length === 0) return;

    // Delete in FK-safe order
    await tx.seasonalAggregate.deleteMany({ where: { stationId: { in: stationIds } } });
    await tx.yearlyAggregate.deleteMany({ where: { stationId: { in: stationIds } } });
    await tx.dailyObservation.deleteMany({ where: { stationId: { in: stationIds } } });
    await tx.station.deleteMany({ where: { id: { in: stationIds } } });
  });

  console.log('[importer] synthetic dataset purged');
};

const parseDlyLine = (line: string, yearly: Map<number, Accumulator>, seasonal: Map<string, Accumulator>) => {
  const year = Number(line.slice(11, 15));
  if (!Number.isFinite(year) || year > END_YEAR) return;

  const month = Number(line.slice(15, 17));
  const element = line.slice(17, 21);
  if (element !== 'TMIN' && element !== 'TMAX') return;

  const season = getSeason(month);
  const seasonKey = `${year}:${season}`;

  for (let dayIndex = 0; dayIndex < 31; dayIndex += 1) {
    const base = 21 + dayIndex * 8;
    const value = Number(line.slice(base, base + 5));
    const mflag = line.slice(base + 5, base + 6);
    const qflag = line.slice(base + 6, base + 7);
    if (mflag.trim() || qflag.trim()) continue;
    if (value === -9999) continue;

    const celsius = value / 10;

    const yearAcc = yearly.get(year) ?? { tminSum: 0, tminCount: 0, tmaxSum: 0, tmaxCount: 0 };
    const seasonAcc = seasonal.get(seasonKey) ?? { tminSum: 0, tminCount: 0, tmaxSum: 0, tmaxCount: 0 };

    if (element === 'TMIN') {
      yearAcc.tminSum += celsius;
      yearAcc.tminCount += 1;
      seasonAcc.tminSum += celsius;
      seasonAcc.tminCount += 1;
    } else {
      yearAcc.tmaxSum += celsius;
      yearAcc.tmaxCount += 1;
      seasonAcc.tmaxSum += celsius;
      seasonAcc.tmaxCount += 1;
    }

    yearly.set(year, yearAcc);
    seasonal.set(seasonKey, seasonAcc);
  }
};

const flushAggregates = async (
  yearlyRows: Prisma.YearlyAggregateCreateManyInput[],
  seasonalRows: Prisma.SeasonalAggregateCreateManyInput[],
) => {
  if (yearlyRows.length) {
    await prisma.yearlyAggregate.createMany({ data: yearlyRows, skipDuplicates: true });
    yearlyRows.length = 0;
  }
  if (seasonalRows.length) {
    await prisma.seasonalAggregate.createMany({ data: seasonalRows, skipDuplicates: true });
    seasonalRows.length = 0;
  }
};

const importDlyTar = async (tarGzPath: string, allowedStationIds: Set<string>) => {
  const yearlyRows: Prisma.YearlyAggregateCreateManyInput[] = [];
  const seasonalRows: Prisma.SeasonalAggregateCreateManyInput[] = [];

  const fileStream = fs.createReadStream(tarGzPath);
  const gunzip = createGunzip();

  const rl = readline.createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  let currentStation: string | null = null;
  let yearly: Map<number, Accumulator> = new Map();
  let seasonal: Map<string, Accumulator> = new Map();

  const commitStation = async () => {
    if (!currentStation) return;
    if (!allowedStationIds.has(currentStation)) return;

    for (const [year, acc] of yearly) {
      yearlyRows.push({
        stationId: currentStation,
        year,
        avgTminC: toFixedNumber(acc.tminCount ? acc.tminSum / acc.tminCount : null),
        avgTmaxC: toFixedNumber(acc.tmaxCount ? acc.tmaxSum / acc.tmaxCount : null),
        daysCountTmin: acc.tminCount,
        daysCountTmax: acc.tmaxCount,
      });
    }

    for (const [key, acc] of seasonal) {
      const [yearString, seasonRaw] = key.split(':');
      seasonalRows.push({
        stationId: currentStation,
        year: Number(yearString),
        season: seasonRaw as Season,
        avgTminC: toFixedNumber(acc.tminCount ? acc.tminSum / acc.tminCount : null),
        avgTmaxC: toFixedNumber(acc.tmaxCount ? acc.tmaxSum / acc.tmaxCount : null),
        daysCountTmin: acc.tminCount,
        daysCountTmax: acc.tmaxCount,
      });
    }

    if (yearlyRows.length >= FLUSH_SIZE || seasonalRows.length >= FLUSH_SIZE) {
      await flushAggregates(yearlyRows, seasonalRows);
      console.log('[importer] aggregate batch flushed');
    }
  };

  for await (const line of rl) {
    // tar header detection: GHCN dly files are concatenated; station id is first 11 chars
    const stationId = line.slice(0, 11).trim();
    if (!stationId) continue;

    if (currentStation !== stationId) {
      await commitStation();
      currentStation = stationId;
      yearly = new Map();
      seasonal = new Map();
    }

    parseDlyLine(line, yearly, seasonal);
  }

  await commitStation();
  await flushAggregates(yearlyRows, seasonalRows);
};

const runImport = async () => {
  if (!IMPORT_ENABLED) {
    console.log('[importer] NOAA import disabled by NOAA_IMPORT_ENABLED=0');
    return;
  }

  // IMPORTANT: advisory_lock returns void -> must use executeRaw (not queryRaw)
  await prisma.$executeRaw`SELECT pg_advisory_lock(${BigInt(LOCK_KEY)})`;
  console.log('[importer] advisory lock acquired');

  try {
    const currentMeta = await prisma.seedMeta.findUnique({ where: { key: IMPORT_KEY } });
    if (currentMeta?.status === SeedImportStatus.COMPLETED && !FORCE_IMPORT) {
      console.log('[importer] import already completed');
      await purgeSyntheticData();
      console.log('[importer] exiting');
      return;
    }

    await prisma.seedMeta.upsert({
      where: { key: IMPORT_KEY },
      create: {
        key: IMPORT_KEY,
        status: SeedImportStatus.RUNNING,
        endYear: END_YEAR,
        startedAt: new Date(),
        completedAt: null,
        error: null,
      },
      update: {
        status: SeedImportStatus.RUNNING,
        endYear: END_YEAR,
        startedAt: new Date(),
        completedAt: null,
        error: null,
      },
    });

    if (FORCE_IMPORT) {
      await prisma.seasonalAggregate.deleteMany();
      await prisma.yearlyAggregate.deleteMany();
    }

    const stationsPath = await downloadWithCache('ghcnd-stations.txt');
    const inventoryPath = await downloadWithCache('ghcnd-inventory.txt');
    const tarPath = await downloadWithCache('ghcnd_all.tar.gz');

    const stations = await parseStations(stationsPath);
    const inventory = await parseInventory(inventoryPath);
    const stationRows = buildStationRows(stations, inventory);
    const allowedStationIds = new Set(stationRows.map((s) => s.id));

    console.log(`[importer] upserting ${stationRows.length} stations`);
    await upsertStations(stationRows);

    console.log('[importer] importing aggregates from dly tar.gz');
    await importDlyTar(tarPath, allowedStationIds);

    await purgeSyntheticData();

    await prisma.seedMeta.update({
      where: { key: IMPORT_KEY },
      data: { status: SeedImportStatus.COMPLETED, completedAt: new Date(), error: null },
    });

    console.log('[importer] import completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.seedMeta.upsert({
      where: { key: IMPORT_KEY },
      create: {
        key: IMPORT_KEY,
        status: SeedImportStatus.FAILED,
        endYear: END_YEAR,
        startedAt: new Date(),
        completedAt: null,
        error: message,
      },
      update: { status: SeedImportStatus.FAILED, completedAt: null, error: message },
    });
    throw error;
  } finally {
    // IMPORTANT: advisory_unlock returns void -> must use executeRaw (not queryRaw)
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${BigInt(LOCK_KEY)})`;
    console.log('[importer] advisory lock released');
  }
};

runImport()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[importer] failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });