-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "reporterGuestMembershipId" TEXT;

-- CreateIndex
CREATE INDEX "Incident_reporterGuestMembershipId_idx" ON "Incident"("reporterGuestMembershipId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reporterGuestMembershipId_fkey" FOREIGN KEY ("reporterGuestMembershipId") REFERENCES "TourGuest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
