-- Backfill guest reporters for historical LOST and REPORT incidents.
UPDATE "Incident" AS i
SET "reporterGuestMembershipId" = tg."id"
FROM "InboundMessage" AS m, "TourGuest" AS tg, "Guest" AS g
WHERE m."incidentId" = i."id"
  AND tg."tourId" = i."tourId"
  AND g."id" = tg."guestId"
  AND m."command" IN ('LOST', 'REPORT')
  AND i."reporterGuestMembershipId" IS NULL
  AND regexp_replace(g."phone", '[[:space:]().-]', '', 'g') = regexp_replace(m."sender", '[[:space:]().-]', '', 'g');

-- Backfill guide reporters for historical MISSING incidents.
UPDATE "Incident" AS i
SET "reporterUserId" = t."guideUserId"
FROM "InboundMessage" AS m, "Tour" AS t
WHERE m."incidentId" = i."id"
  AND t."id" = i."tourId"
  AND m."command" = 'MISSING'
  AND i."reporterUserId" IS NULL
  AND t."guideUserId" IS NOT NULL;
