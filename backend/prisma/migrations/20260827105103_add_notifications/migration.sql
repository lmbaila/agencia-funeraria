-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "installmentId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
