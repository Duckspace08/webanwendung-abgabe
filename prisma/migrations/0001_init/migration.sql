CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation" DOUBLE PRECISION,
    "firstYear" INTEGER NOT NULL,
    "lastYear" INTEGER NOT NULL,
    "geom" geography(Point,4326) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyObservation" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "tminC" DOUBLE PRECISION,
    "tmaxC" DOUBLE PRECISION,
    CONSTRAINT "DailyObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "YearlyAggregate" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "avgTminC" DOUBLE PRECISION,
    "avgTmaxC" DOUBLE PRECISION,
    "daysCountTmin" INTEGER NOT NULL,
    "daysCountTmax" INTEGER NOT NULL,
    CONSTRAINT "YearlyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeasonalAggregate" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "season" "Season" NOT NULL,
    "avgTminC" DOUBLE PRECISION,
    "avgTmaxC" DOUBLE PRECISION,
    "daysCountTmin" INTEGER NOT NULL,
    "daysCountTmax" INTEGER NOT NULL,
    CONSTRAINT "SeasonalAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyObservation_stationId_date_key" ON "DailyObservation" ("stationId", "date");
CREATE INDEX "DailyObservation_stationId_idx" ON "DailyObservation" ("stationId");

CREATE UNIQUE INDEX "YearlyAggregate_stationId_year_key" ON "YearlyAggregate" ("stationId", "year");
CREATE INDEX "YearlyAggregate_stationId_year_idx" ON "YearlyAggregate" ("stationId", "year");

CREATE UNIQUE INDEX "SeasonalAggregate_stationId_year_season_key" ON "SeasonalAggregate" ("stationId", "year", "season");
CREATE INDEX "SeasonalAggregate_stationId_year_season_idx" ON "SeasonalAggregate" ("stationId", "year", "season");

ALTER TABLE "DailyObservation"
ADD CONSTRAINT "DailyObservation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "YearlyAggregate"
ADD CONSTRAINT "YearlyAggregate_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonalAggregate"
ADD CONSTRAINT "SeasonalAggregate_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "station_geom_gist" ON "Station" USING GIST (geom);
