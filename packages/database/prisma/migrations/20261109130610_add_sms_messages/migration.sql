-- CreateEnum
CREATE TYPE "InboundMessageStatus" AS ENUM ('RECEIVED', 'DUPLICATE', 'REJECTED', 'PARSED');

-- CreateEnum
CREATE TYPE "OutboundMessageStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'DELIVERED', 'FAILED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "InboundMessage" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "recipient" TEXT,
    "text" TEXT NOT NULL,
    "command" TEXT,
    "tourReference" TEXT,
    "guestReference" TEXT,
    "status" "InboundMessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "rejectionReason" TEXT,
    "rawPayload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "recipient" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "status" "OutboundMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMetadata" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundMessage_fingerprint_key" ON "InboundMessage"("fingerprint");

-- CreateIndex
CREATE INDEX "InboundMessage_sender_receivedAt_idx" ON "InboundMessage"("sender", "receivedAt");

-- CreateIndex
CREATE INDEX "InboundMessage_operatorId_status_receivedAt_idx" ON "InboundMessage"("operatorId", "status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InboundMessage_provider_providerMessageId_key" ON "InboundMessage"("provider", "providerMessageId");

-- CreateIndex
CREATE INDEX "OutboundMessage_operatorId_status_createdAt_idx" ON "OutboundMessage"("operatorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_providerMessageId_idx" ON "OutboundMessage"("providerMessageId");

-- AddForeignKey
ALTER TABLE "InboundMessage" ADD CONSTRAINT "InboundMessage_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
