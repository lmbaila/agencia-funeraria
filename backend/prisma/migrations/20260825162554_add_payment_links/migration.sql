-- CreateTable
CREATE TABLE "payment_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "installmentId" TEXT,
    "createdById" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_links_token_key" ON "payment_links"("token");

-- AddForeignKey
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
