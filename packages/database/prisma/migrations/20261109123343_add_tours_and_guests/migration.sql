-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "guideUserId" TEXT,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "TourStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourGuest" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "TourGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tour_operatorId_status_startsAt_idx" ON "Tour"("operatorId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Tour_guideUserId_status_idx" ON "Tour"("guideUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_operatorId_reference_key" ON "Tour"("operatorId", "reference");

-- CreateIndex
CREATE INDEX "Guest_operatorId_name_idx" ON "Guest"("operatorId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_operatorId_phone_key" ON "Guest"("operatorId", "phone");

-- CreateIndex
CREATE INDEX "TourGuest_guestId_status_idx" ON "TourGuest"("guestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TourGuest_tourId_guestId_key" ON "TourGuest"("tourId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "TourGuest_tourId_reference_key" ON "TourGuest"("tourId", "reference");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_guideUserId_fkey" FOREIGN KEY ("guideUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourGuest" ADD CONSTRAINT "TourGuest_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourGuest" ADD CONSTRAINT "TourGuest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
