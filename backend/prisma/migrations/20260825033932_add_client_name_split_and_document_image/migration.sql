-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "documentImageMimeType" TEXT,
ADD COLUMN     "documentImagePath" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- Backfill firstName/lastName for existing rows from the legacy fullName field
UPDATE "clients"
SET
  "firstName" = split_part("fullName", ' ', 1),
  "lastName" = NULLIF(trim(substring("fullName" from position(' ' in "fullName") + 1)), '')
WHERE "firstName" IS NULL;

UPDATE "clients" SET "lastName" = "firstName" WHERE "lastName" IS NULL;

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "clients" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "lastName" SET NOT NULL;
