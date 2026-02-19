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
  // TS/DOM typings can differ (ReadableStream<Uint8Array<ArrayBufferLike>> vs ReadableStream<Uint8Array>).
  // Runtime is compatible; normalize via safe cast for Readable.fromWeb().
  return Readable.fromWeb(webStream as any) as unknown as NodeJS.ReadableStream;
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

  // Write to temp first to avoid partially cached files on interruption.
  const tmpPath = `${localPath}.tmp`;
  try {
    const nodeReadable = toNodeReadable(response.body as unknown);
    await pipeline(nodeReadable, fs.createWriteStream(tmpPath));
    await fs.promises.rename(tmpPath, localPath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) await fs.promises.unlink(tmpPath);
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }

  console.log(`[importer] download completed ${fileName}`);
  return localPath;
};

const parseStations = async (filePath: string) => {
  const stations = new Map<
    string,
    { id: string; latitude: number; longitude: number; elevation: number | null; name: string }
  >();

  const rl = readline.createInterface({ input: fs.createReadStream(filePath, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;

    const id = line.slice(0, 11).trim();
    const latitude = Number(line.slice(12, 20).trim());
    const longitude = Number(line.slice(21, 30).trim());
    const elevationRaw = line.slice(31, 37).trim();
    const name = line.slice(41, 71).trim();

    stations.set(id, {
      id,
      latitude,
      longitude,
      elevation: elevationRaw === '-999.9' || elevationRaw === '' ? null : Number(elevationRaw),
      name,
    });
  }

  return stations;
};

const parseInventory = async (filePath: string) => {
  const inventory = new Map<string, { tminFirst?: number; tminLast?: number; tmaxFirst?: number; tmaxLast?: number }>();

  const rl = readline.createInterface({ input: fs.createReadStream(filePath, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;

    const stationId = line.slice(0, 11).trim();
    const element = line.slice(31, 35).trim();
    if (element !== 'TMIN' && element !== 'TMAX') continue;

    const firstYear = Number(line.slice(36, 40).trim());
    const lastYear = Number(line.slice(41, 45).trim());
    const record = inventory.get(stationId) ?? {};

    if (element === 'TMIN') {
      record.tminFirst = firstYear;
      record.tminLast = lastYear;
    } else {
      record.tmaxFirst = firstYear;
      record.tmaxLast = lastYear;
    }

    inventory.set(stationId, record);
  }

  return inventory;
};

const buildStationRows = (
  stations: Awaited<ReturnType<typeof parseStations>>,
  inventory: Awaited<ReturnType<typeof parseInventory>>,
): StationRow[] => {
  const rows: StationRow[] = [];

  for (const [stationId, station] of stations) {
    const inv = inventory.get(stationId);
    if (inv?.tminFirst == null || inv?.tminLast == null || inv?.tmaxFirst == null || inv?.tmaxLast == null) continue;

    // Use intersection of TMIN/TMAX availability and cap to END_YEAR
    const firstYear = Math.max(inv.tminFirst, inv.tmaxFirst);
    const lastYear = Math.min(inv.tminLast, inv.tmaxLast, END_YEAR);
    if (firstYear > lastYear) continue;

    rows.push({ ...station, firstYear, lastYear });
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
          Prisma.sql`(${s.id}, ${s.name}, ${s.latitude}, ${s.longitude}, ${s.elevation}, ${s.firstYear}, ${s.lastYear}, ST_SetSRID(ST_MakePoint(${s.longitude}, ${s.latitude}),4326)::geography)`,
      ),
    );

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Station" ("id", "name", "latitude", "longitude", "elevation", "firstYear", "lastYear", "geom")
      VALUES ${values}
      ON CONFLICT ("id") DO UPDATE
      SET
        "name" = EXCLUDED."name",
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "elevation" = EXCLUDED."elevation",
        "firstYear" = EXCLUDED."firstYear",
        "lastYear" = EXCLUDED."lastYear",
        "geom" = EXCLUDED."geom";
    `);
  }
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
    const offset = 21 + dayIndex * 8;
    const value = Number(line.slice(offset, offset + 5));
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
  if (yearlyRows.length > 0) {
    await prisma.yearlyAggregate.createMany({ data: yearlyRows, skipDuplicates: true });
    yearlyRows.length = 0;
  }
  if (seasonalRows.length > 0) {
    await prisma.seasonalAggregate.createMany({ data: seasonalRows, skipDuplicates: true });
    seasonalRows.length = 0;
  }
};

const parseTarSize = (header: Buffer) => {
  const octal = header.toString('utf8', 124, 136).replace(/\0/g, '').trim();
  return octal ? Number.parseInt(octal, 8) : 0;
};

const parseTarName = (header: Buffer) => header.toString('utf8', 0, 100).replace(/\0/g, '').trim();

const isZeroHeader = (header: Buffer) => header.every((value) => value === 0);

const forEachTarEntry = async (tarGzPath: string, onEntry: (name: string, content: Buffer) => Promise<void>) => {
  let buffer = Buffer.alloc(0);
  let currentHeader: { name: string; size: number } | null = null;
  let reachedEndOfArchive = false;

  const parseBuffer = async () => {
    // loop while we can make progress; avoids `while(true)` (eslint no-constant-condition)
    let progressed = true;
    while (progressed) {
      progressed = false;
      if (reachedEndOfArchive) return;

      if (!currentHeader) {
        if (buffer.length < 512) return;

        const header = buffer.subarray(0, 512);
        buffer = buffer.subarray(512);
        progressed = true;

        if (isZeroHeader(header)) {
          reachedEndOfArchive = true;
          buffer = Buffer.alloc(0);
          currentHeader = null;
          return;
        }

        currentHeader = { name: parseTarName(header), size: parseTarSize(header) };
      }

      if (currentHeader) {
        const paddedSize = currentHeader.size + ((512 - (currentHeader.size % 512)) % 512);
        if (buffer.length < paddedSize) return;

        const content = Buffer.from(buffer.subarray(0, currentHeader.size));
        buffer = buffer.subarray(paddedSize);

        const { name } = currentHeader;
        currentHeader = null;

        progressed = true;
        await onEntry(name, content);
      }
    }
  };

  const gunzipStream = fs.createReadStream(tarGzPath).pipe(createGunzip());
  for await (const chunk of gunzipStream) {
    if (reachedEndOfArchive) break;
    buffer = Buffer.concat([buffer, chunk as Buffer]);
    await parseBuffer();
  }

  await parseBuffer();
};

const importDlyTar = async (tarGzPath: string, allowedStationIds: Set<string>) => {
  const yearlyRows: Prisma.YearlyAggregateCreateManyInput[] = [];
  const seasonalRows: Prisma.SeasonalAggregateCreateManyInput[] = [];

  await forEachTarEntry(tarGzPath, async (name, content) => {
    if (!name.endsWith('.dly')) return;

    const stationId = path.basename(name, '.dly');

    // Ensure we only import aggregates for stations we actually inserted/upserted (FK-safe).
    if (!allowedStationIds.has(stationId)) return;

    const yearly = new Map<number, Accumulator>();
    const seasonal = new Map<string, Accumulator>();

    const lines = content.toString('utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line) continue;
      parseDlyLine(line, yearly, seasonal);
    }

    for (const [year, acc] of yearly) {
      yearlyRows.push({
        stationId,
        year,
        avgTminC: toFixedNumber(acc.tminCount ? acc.tminSum / acc.tminCount : null),
        avgTmaxC: toFixedNumber(acc.tmaxCount ? acc.tmaxSum / acc.tmaxCount : null),
        daysCountTmin: acc.tminCount,
        daysCountTmax: acc.tmaxCount,
      });
    }

    for (const [key, acc] of seasonal) {
      const [yearRaw, seasonRaw] = key.split(':');
      seasonalRows.push({
        stationId,
        year: Number(yearRaw),
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
  });

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
      console.log('[importer] import already completed, exiting');
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