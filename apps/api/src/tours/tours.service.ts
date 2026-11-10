import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TourStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GUEST_REFERENCE_PREFIX, TOUR_REFERENCE_PREFIX } from './tours.constants';
import { createReference, normalizePhone } from './tours.utils';
import { CreateTourDto } from './dto/create-tour.dto';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { UpdateTourDto } from './dto/update-tour.dto';

type Scope = { operatorId: string; id: string; role: string };

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  list(scope: Scope, status?: TourStatus) {
    return this.prisma.tour.findMany({
      where: { operatorId: scope.operatorId, ...(status ? { status } : {}) },
      include: { guide: { select: { id: true, name: true, phone: true } }, _count: { select: { guests: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  listGuides(scope: Scope) {
    return this.prisma.user.findMany({ where: { operatorId: scope.operatorId, role: UserRole.GUIDE, status: 'ACTIVE' }, select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' } });
  }

  async get(scope: Scope, id: string) {
    const tour = await this.prisma.tour.findFirst({
      where: { id, operatorId: scope.operatorId },
      include: { guide: { select: { id: true, name: true, phone: true } }, guests: { include: { guest: true } } },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    return tour;
  }

  async create(scope: Scope, dto: CreateTourDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    this.validateDates(startsAt, endsAt);
    return this.prisma.tour.create({
      data: {
        operatorId: scope.operatorId,
        reference: await this.uniqueTourReference(scope.operatorId),
        name: dto.name.trim(),
        destination: dto.destination?.trim(),
        description: dto.description?.trim(),
        startsAt,
        endsAt,
      },
    });
  }

  async update(scope: Scope, id: string, dto: UpdateTourDto) {
    const tour = await this.requireDraft(scope, id);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : tour.startsAt;
    const endsAt = dto.endsAt === undefined ? tour.endsAt : dto.endsAt ? new Date(dto.endsAt) : null;
    this.validateDates(startsAt, endsAt);
    return this.prisma.tour.update({
      where: { id: tour.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.destination !== undefined ? { destination: dto.destination?.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.startsAt !== undefined ? { startsAt } : {}),
        ...(dto.endsAt !== undefined ? { endsAt } : {}),
      },
    });
  }

  async assignGuide(scope: Scope, id: string, guideUserId: string) {
    const tour = await this.requireDraft(scope, id);
    const guide = await this.prisma.user.findFirst({ where: { id: guideUserId, operatorId: scope.operatorId, role: UserRole.GUIDE, status: 'ACTIVE' } });
    if (!guide) throw new BadRequestException('Guide is not available for this operator');
    return this.prisma.tour.update({ where: { id: tour.id }, data: { guideUserId: guide.id } });
  }

  async registerGuest(scope: Scope, id: string, dto: RegisterGuestDto) {
    const tour = await this.requireDraft(scope, id);
    const phone = normalizePhone(dto.phone);
    const existingGuest = await this.prisma.guest.findUnique({ where: { operatorId_phone: { operatorId: scope.operatorId, phone } } });
    const guest = existingGuest ?? await this.prisma.guest.create({ data: { operatorId: scope.operatorId, name: dto.name.trim(), phone } });
    const existingMembership = await this.prisma.tourGuest.findUnique({ where: { tourId_guestId: { tourId: tour.id, guestId: guest.id } } });
    if (existingMembership?.status === 'ACTIVE') throw new ConflictException('Guest is already registered for this tour');
    const membership = await this.prisma.tourGuest.create({ data: { tourId: tour.id, guestId: guest.id, reference: await this.uniqueGuestReference(tour.id) }, include: { guest: true } });
    return membership;
  }

  async activate(scope: Scope, id: string) {
    const tour = await this.requireDraft(scope, id);
    const details = await this.prisma.tour.findUnique({ where: { id: tour.id }, include: { _count: { select: { guests: true } } } });
    if (!details || details._count.guests < 1) throw new BadRequestException('A tour needs at least one guest before activation');
    if (!details.guideUserId) throw new BadRequestException('A tour needs an assigned guide before activation');
    return this.prisma.tour.update({ where: { id: tour.id }, data: { status: TourStatus.ACTIVE } });
  }

  async complete(scope: Scope, id: string) {
    const tour = await this.requireStatus(scope, id, TourStatus.ACTIVE);
    return this.prisma.tour.update({ where: { id: tour.id }, data: { status: TourStatus.COMPLETED } });
  }

  async cancel(scope: Scope, id: string) {
    const tour = await this.prisma.tour.findFirst({ where: { id, operatorId: scope.operatorId } });
    if (!tour || (tour.status !== TourStatus.DRAFT && tour.status !== TourStatus.ACTIVE)) throw new BadRequestException('Tour cannot be cancelled in its current state');
    return this.prisma.tour.update({ where: { id: tour.id }, data: { status: TourStatus.CANCELLED } });
  }

  private async requireDraft(scope: Scope, id: string) {
    const tour = await this.prisma.tour.findFirst({ where: { id, operatorId: scope.operatorId } });
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status !== TourStatus.DRAFT) throw new BadRequestException('Only draft tours can be edited');
    return tour;
  }

  private async requireStatus(scope: Scope, id: string, status: TourStatus) {
    const tour = await this.prisma.tour.findFirst({ where: { id, operatorId: scope.operatorId } });
    if (!tour) throw new NotFoundException('Tour not found');
    if (tour.status !== status) throw new BadRequestException(`Tour must be ${status.toLowerCase()}`);
    return tour;
  }

  private validateDates(startsAt: Date, endsAt: Date | null) {
    if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) throw new BadRequestException('Invalid tour dates');
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('Tour end must be after tour start');
  }

  private async uniqueTourReference(operatorId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = createReference(TOUR_REFERENCE_PREFIX);
      const found = await this.prisma.tour.findUnique({ where: { operatorId_reference: { operatorId, reference } } });
      if (!found) return reference;
    }
    throw new ConflictException('Could not generate a unique tour reference');
  }

  private async uniqueGuestReference(tourId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = createReference(GUEST_REFERENCE_PREFIX);
      const found = await this.prisma.tourGuest.findUnique({ where: { tourId_reference: { tourId, reference } } });
      if (!found) return reference;
    }
    throw new ConflictException('Could not generate a unique guest reference');
  }
}
