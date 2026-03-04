ALTER TABLE "Station" ADD COLUMN "isSynthetic" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "Station_isSynthetic_idx" ON "Station" ("isSynthetic");