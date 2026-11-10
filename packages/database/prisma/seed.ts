import * as bcrypt from 'bcryptjs';
import { PrismaClient, TourStatus, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();
const adminEmail = 'admin@tourguard.local';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-local-only';

async function main() {
  const operator = await prisma.operator.upsert({ where: { id: 'demo-operator' }, update: { name: 'Demo Tour Operator' }, create: { id: 'demo-operator', name: 'Demo Tour Operator' } });
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({ where: { operatorId_email: { operatorId: operator.id, email: adminEmail } }, update: { passwordHash, status: UserStatus.ACTIVE, role: UserRole.ADMIN, phone: '+254700000003' }, create: { operatorId: operator.id, name: 'Demo Admin', email: adminEmail, phone: '+254700000003', passwordHash, role: UserRole.ADMIN } });
  const guide = await prisma.user.upsert({ where: { operatorId_email: { operatorId: operator.id, email: 'guide@tourguard.local' } }, update: { status: UserStatus.ACTIVE, role: UserRole.GUIDE, phone: '+254700000002' }, create: { operatorId: operator.id, name: 'Demo Guide', email: 'guide@tourguard.local', phone: '+254700000002', role: UserRole.GUIDE, status: UserStatus.ACTIVE } });
  const tour = await prisma.tour.upsert({ where: { operatorId_reference: { operatorId: operator.id, reference: 'TG482' } }, update: { status: TourStatus.ACTIVE, guideUserId: guide.id }, create: { operatorId: operator.id, reference: 'TG482', name: 'Demo Nairobi City Tour', destination: 'Nairobi', startsAt: new Date(), status: TourStatus.ACTIVE, guideUserId: guide.id } });
  const guest = await prisma.guest.upsert({ where: { operatorId_phone: { operatorId: operator.id, phone: '+254792651994' } }, update: { name: 'Demo Guest' }, create: { operatorId: operator.id, name: 'Demo Guest', phone: '+254792651994' } });
  await prisma.tourGuest.upsert({ where: { tourId_guestId: { tourId: tour.id, guestId: guest.id } }, update: { status: 'ACTIVE', reference: 'GUEST829', removedAt: null }, create: { tourId: tour.id, guestId: guest.id, reference: 'GUEST829', status: 'ACTIVE' } });
  console.log(`Seeded ${operator.name}; admin ${admin.email}; tour ${tour.reference}; guest GUEST829; admin password source: ${process.env.SEED_ADMIN_PASSWORD ? 'SEED_ADMIN_PASSWORD' : 'local default'}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
