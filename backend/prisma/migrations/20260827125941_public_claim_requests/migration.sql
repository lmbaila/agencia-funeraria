-- AlterEnum
ALTER TYPE "ClaimStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "ClaimStatus" ADD VALUE 'REJECTED';

-- CreateEnum
CREATE TYPE "ClaimSource" AS ENUM ('STAFF', 'PUBLIC_REQUEST');

-- AlterTable
ALTER TABLE "claims"
  ADD COLUMN "source" "ClaimSource" NOT NULL DEFAULT 'STAFF',
  ADD COLUMN "requestBatchId" TEXT,
  ADD COLUMN "requesterName" TEXT,
  ADD COLUMN "requesterPhone" TEXT,
  ADD COLUMN "requesterRelationship" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedById" TEXT,
  ADD COLUMN "rejectionReason" TEXT;
