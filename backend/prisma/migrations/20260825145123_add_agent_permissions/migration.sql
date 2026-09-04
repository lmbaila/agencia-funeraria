-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('VIEW_DASHBOARD', 'MANAGE_CLIENTS', 'MANAGE_DELINQUENCY', 'MANAGE_PAYMENTS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[];
