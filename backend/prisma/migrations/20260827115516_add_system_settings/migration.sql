-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lateFeeMonthlyRate" DECIMAL(5,4) NOT NULL DEFAULT 0.02,
    "suspensionThresholdInstallments" INTEGER NOT NULL DEFAULT 2,
    "suspensionRegularizationDays" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row with the defaults that used to be hardcoded.
INSERT INTO "system_settings" ("id", "lateFeeMonthlyRate", "suspensionThresholdInstallments", "suspensionRegularizationDays", "updatedAt")
VALUES (1, 0.02, 2, 5, CURRENT_TIMESTAMP);
