import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { Prisma, PrismaClient, Season as PrismaSeason, SeedImportStatus } from '@prisma/client';
import { getSeasonForMonth } from '@webanwendung/shared';

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

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed ${res.status} ${res.statusText}`);

  await pipeline(toNodeReadable(res.body), fs.createWriteStream(localPath));
  console.log(`[importer] download finished ${fileName}`);

  return localPath;
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

    await tx.seasonalAggregate.deleteMany({ where: { stationId: { in: stationIds } } });
    await tx.yearlyAggregate.deleteMany({ where: { stationId: { in: stationIds } } });
    await tx.dailyObservation.deleteMany({ where: { stationId: { in: stationIds } } });
    await tx.station.deleteMany({ where: { id: { in: stationIds } } });
  });

  console.log('[importer] synthetic dataset purged');
};

const loadStations = async (stationsPath: string) => {
  const allowedStationIds = new Set<string>();
  const stationLatitudeById = new Map<string, number>();
  const stationRows: StationRow[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(stationsPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Fixed-width format (see NOAA readme/ghcnd-stations.txt)
    const id = line.slice(0, 11).trim();
    if (!id) continue;

    const latitude = Number(line.slice(12, 20));
    const longitude = Number(line.slice(21, 30));
    const elevationRaw = line.slice(31, 37).trim();
    const elevation = elevationRaw ? Number(elevationRaw) : null;
    const name = line.slice(41, 71).trim();

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    // Alle Stationen zunächst laden. Stationen ohne tatsächlich importierte Jahresaggregate
    // werden nach dem Import wieder entfernt.
    allowedStationIds.add(id);
    stationLatitudeById.set(id, latitude);

    stationRows.push({
      id,
      name,
      latitude,
      longitude,
      elevation: Number.isFinite(elevation as number) ? (elevation as number) : null,
      // Temporäre Placeholder-Werte nur für den Insert-Pfad.
      // Die echten Werte werden nach dem Aggregationsimport aus YearlyAggregate abgeleitet.
      firstYear: END_YEAR,
      lastYear: END_YEAR,
    });
  }

  console.log(`[importer] loaded stations: ${stationRows.length}`);
  return { allowedStationIds, stationLatitudeById, stationRows };
};

const upsertStations = async (stationRows: StationRow[]) => {
  const chunkSize = 1_000;

  for (let i = 0; i < stationRows.length; i += chunkSize) {
    const chunk = stationRows.slice(i, i + chunkSize);

    const values = Prisma.join(
      chunk.map(
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
        "geom" = EXCLUDED."geom",
        "isSynthetic" = FALSE;
    `);
  }

  console.log('[importer] stations upserted');
};

const parseDlyLine = (line: string, monthly: Map<string, Accumulator>) => {
  const year = Number(line.slice(11, 15));
  if (!Number.isFinite(year) || year > END_YEAR) return;

  const month = Number(line.slice(15, 17));
  if (!Number.isFinite(month) || month < 1 || month > 12) return;

  const element = line.slice(17, 21);
  if (element !== 'TMIN' && element !== 'TMAX') return;

  const monthKey = `${year}-${month}`;
  const monthAcc = monthly.get(monthKey) ?? { tminSum: 0, tminCount: 0, tmaxSum: 0, tmaxCount: 0 };

  for (let dayIndex = 0; dayIndex < 31; dayIndex += 1) {
    const base = 21 + dayIndex * 8;
    const value = Number(line.slice(base, base + 5));
    const mflag = line.slice(base + 5, base + 6);
    const qflag = line.slice(base + 6, base + 7);
    if (mflag.trim() || qflag.trim()) continue;
    if (value === -9999) continue;

    const celsius = value / 10;

    if (element === 'TMIN') {
      monthAcc.tminSum += celsius;
      monthAcc.tminCount += 1;
    } else {
      monthAcc.tmaxSum += celsius;
      monthAcc.tmaxCount += 1;
    }
  }

  monthly.set(monthKey, monthAcc);
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

const countInvalidNoaaStationYearRanges = async () => {
  const result = await prisma.$queryRaw<Array<{ invalid_count: bigint | number }>>(Prisma.sql`
    WITH actual_ranges AS (
      SELECT
        "stationId",
        MIN(year) AS "firstYear",
        MAX(year) AS "lastYear"
      FROM "YearlyAggregate"
      GROUP BY "stationId"
    )
    SELECT COUNT(*)::bigint AS invalid_count
    FROM "Station" s
    LEFT JOIN actual_ranges a
      ON a."stationId" = s.id
    WHERE s."isSynthetic" = FALSE
      AND (
        a."stationId" IS NULL
        OR s."firstYear" IS DISTINCT FROM a."firstYear"
        OR s."lastYear" IS DISTINCT FROM a."lastYear"
      );
  `);

  const rawValue = result[0]?.invalid_count ?? 0;
  return typeof rawValue === 'bigint' ? Number(rawValue) : Number(rawValue);
};

const reconcileNoaaStations = async () => {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Station" AS s
    SET
      "firstYear" = actual_ranges."firstYear",
      "lastYear" = actual_ranges."lastYear"
    FROM (
      SELECT
        "stationId",
        MIN(year) AS "firstYear",
        MAX(year) AS "lastYear"
      FROM "YearlyAggregate"
      GROUP BY "stationId"
    ) AS actual_ranges
    WHERE s.id = actual_ranges."stationId"
      AND s."isSynthetic" = FALSE;
  `);

  const deletedWithoutAggregates = await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "Station" AS s
    WHERE s."isSynthetic" = FALSE
      AND NOT EXISTS (
        SELECT 1
        FROM "YearlyAggregate" y
        WHERE y."stationId" = s.id
      );
  `);

  if (deletedWithoutAggregates > 0) {
    console.log(`[importer] removed NOAA stations without aggregates: ${deletedWithoutAggregates}`);
  }

  const invalidCount = await countInvalidNoaaStationYearRanges();
  if (invalidCount > 0) {
    throw new Error(`NOAA station year range reconciliation failed for ${invalidCount} station(s)`);
  }

  console.log('[importer] NOAA station year ranges reconciled');
};

const importDlyTar = async (
  tarGzPath: string,
  allowedStationIds: Set<string>,
  stationLatitudeById: Map<string, number>,
) => {
  const yearlyRows: Prisma.YearlyAggregateCreateManyInput[] = [];
  const seasonalRows: Prisma.SeasonalAggregateCreateManyInput[] = [];

  const fileStream = fs.createReadStream(tarGzPath);
  const gunzip = createGunzip();

  const rl = readline.createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });

  let currentStation: string | null = null;
  let monthly: Map<string, Accumulator> = new Map();

  // "best_effort" (gemäß Vorgabe):
  // Periodenmittelwerte werden als arithmetisches Mittel aller verfügbaren und gültigen Tageswerte berechnet.
  // Fehlende oder ungültige Tageswerte werden nicht mitgezählt.

  type PeriodAgg = { tminSum: number; tminDays: number; tmaxSum: number; tmaxDays: number };

  const commitStation = async () => {
    if (!currentStation) return;
    if (!allowedStationIds.has(currentStation)) return;

    const latitude = stationLatitudeById.get(currentStation);

    const yearlyAgg = new Map<number, PeriodAgg>();
    const seasonalAgg = new Map<string, ({ year: number; season: PrismaSeason } & PeriodAgg)>(); // seasonYear:season

    for (const [key, acc] of monthly) {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      if (!Number.isFinite(year) || !Number.isFinite(month)) continue;

      // --- Jahresaggregation (best_effort):
      // arithmetisches Mittel aller verfügbaren und gültigen Tageswerte im Kalenderjahr
      const y =
        yearlyAgg.get(year) ??
        ({
          tminSum: 0,
          tminDays: 0,
          tmaxSum: 0,
          tmaxDays: 0,
        } satisfies PeriodAgg);

      if (acc.tminCount > 0) {
        y.tminSum += acc.tminSum;
        y.tminDays += acc.tminCount;
      }
      if (acc.tmaxCount > 0) {
        y.tmaxSum += acc.tmaxSum;
        y.tmaxDays += acc.tmaxCount;
      }
      yearlyAgg.set(year, y);

      // --- Saisonaggregation (meteorologische Jahreszeiten; Winter über Jahreswechsel):
      const { season, seasonYear } = getSeasonForMonth(year, month, typeof latitude === 'number' ? { latitude } : undefined);
      const seasonKey = `${seasonYear}:${season}`;

      const s =
        seasonalAgg.get(seasonKey) ??
        ({
          year: seasonYear,
          season: season as PrismaSeason,
          tminSum: 0,
          tminDays: 0,
          tmaxSum: 0,
          tmaxDays: 0,
        } satisfies { year: number; season: PrismaSeason } & PeriodAgg);

      if (acc.tminCount > 0) {
        s.tminSum += acc.tminSum;
        s.tminDays += acc.tminCount;
      }
      if (acc.tmaxCount > 0) {
        s.tmaxSum += acc.tmaxSum;
        s.tmaxDays += acc.tmaxCount;
      }

      seasonalAgg.set(seasonKey, s);
    }

    for (const [year, agg] of yearlyAgg) {
      const avgTminC = agg.tminDays > 0 ? toFixedNumber(agg.tminSum / agg.tminDays) : null;
      const avgTmaxC = agg.tmaxDays > 0 ? toFixedNumber(agg.tmaxSum / agg.tmaxDays) : null;

      // Periode ohne gültige Werte überspringen
      if (avgTminC === null && avgTmaxC === null) continue;

      yearlyRows.push({
        stationId: currentStation,
        year,
        avgTminC,
        avgTmaxC,
        daysCountTmin: agg.tminDays,
        daysCountTmax: agg.tmaxDays,
      });
    }

    for (const [, agg] of seasonalAgg) {
      // Keine Saisons jenseits des konfigurierten Datenhorizonts (z. B. "Winter 2026" nur wegen Dezember 2025).
      if (agg.year > END_YEAR) continue;

      const avgTminC = agg.tminDays > 0 ? toFixedNumber(agg.tminSum / agg.tminDays) : null;
      const avgTmaxC = agg.tmaxDays > 0 ? toFixedNumber(agg.tmaxSum / agg.tmaxDays) : null;

      // Periode ohne gültige Werte überspringen
      if (avgTminC === null && avgTmaxC === null) continue;

      seasonalRows.push({
        stationId: currentStation,
        year: agg.year,
        season: agg.season,
        avgTminC,
        avgTmaxC,
        daysCountTmin: agg.tminDays,
        daysCountTmax: agg.tmaxDays,
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
      monthly = new Map();
    }

    parseDlyLine(line, monthly);
  }

  await commitStation();
  await flushAggregates(yearlyRows, seasonalRows);
};

const runImport = async () => {
  if (!IMPORT_ENABLED) {
    console.log('[importer] NOAA import disabled by NOAA_IMPORT_ENABLED=0');
    return;
  }

  // Lock and meta handling (idempotent)
  // IMPORTANT: pg_advisory_lock expects bigint
  await prisma.$executeRaw`SELECT pg_advisory_lock(${BigInt(LOCK_KEY)})`;
  console.log('[importer] advisory lock acquired');

  try {
    const existingMeta = await prisma.seedMeta.findUnique({ where: { key: IMPORT_KEY } });

    if (existingMeta?.status === SeedImportStatus.COMPLETED && existingMeta.endYear === END_YEAR && !FORCE_IMPORT) {
      const invalidRangeCount = await countInvalidNoaaStationYearRanges();

      if (invalidRangeCount === 0) {
        console.log('[importer] already imported; skip');
        await purgeSyntheticData();
        return;
      }

      console.log(`[importer] detected ${invalidRangeCount} invalid NOAA station year range(s); repairing from aggregates`);
      await reconcileNoaaStations();
      await purgeSyntheticData();
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
      },
      update: { status: SeedImportStatus.RUNNING, endYear: END_YEAR, startedAt: new Date(), completedAt: null, error: null },
    });

    // Download files (with cache)
    const stationsPath = await downloadWithCache('ghcnd-stations.txt');
    const tarGzPath = await downloadWithCache('ghcnd_all.tar.gz');

    // Station metadata -> DB
    const { allowedStationIds, stationLatitudeById, stationRows } = await loadStations(stationsPath);
    await upsertStations(stationRows);

    // Purge existing aggregates for NOAA stations (keep daily observations out for performance)
    await prisma.seasonalAggregate.deleteMany({ where: { station: { isSynthetic: false } } });
    await prisma.yearlyAggregate.deleteMany({ where: { station: { isSynthetic: false } } });

    console.log('[importer] import started (aggregates only)');
    await importDlyTar(tarGzPath, allowedStationIds, stationLatitudeById);
    await reconcileNoaaStations();
    await purgeSyntheticData();
    console.log('[importer] import completed');

    await prisma.seedMeta.upsert({
      where: { key: IMPORT_KEY },
      create: {
        key: IMPORT_KEY,
        status: SeedImportStatus.COMPLETED,
        endYear: END_YEAR,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      update: { status: SeedImportStatus.COMPLETED, completedAt: new Date(), error: null },
    });
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