-- AlterEnum
ALTER TYPE "ClientStatus" ADD VALUE 'DECEASED';

-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE 'FULFILLED';

-- CreateEnum
CREATE TYPE "ClaimBeneficiaryType" AS ENUM ('CLIENT', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('REGISTERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "beneficiaryType" "ClaimBeneficiaryType" NOT NULL,
    "dependentId" TEXT,
    "deceasedName" TEXT NOT NULL,
    "dateOfDeath" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "dependents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
