CREATE TYPE "SeedImportStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "SeedMeta" (
    "key" TEXT NOT NULL,
    "status" "SeedImportStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "endYear" INTEGER NOT NULL DEFAULT 2025,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "error" TEXT,
    "datasetVersion" TEXT,
    CONSTRAINT "SeedMeta_pkey" PRIMARY KEY ("key")
);
