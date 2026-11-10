import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentStatus, Prisma, TourStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { createReference, normalizePhone } from '../tours/tours.utils';
import { INCIDENT_REFERENCE_PREFIX } from './incidents.constants';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';

type Scope = { operatorId: string; id: string; role: string };

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(scope: Scope, status?: IncidentStatus) {
    return this.prisma.incident.findMany({
      where: { operatorId: scope.operatorId, ...(status ? { status } : {}) },
      include: { tour: { select: { reference: true, name: true } }, reportedGuestMembership: { include: { guest: { select: { name: true } } } }, reporterGuestMembership: { include: { guest: { select: { name: true } } } }, reporterUser: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(scope: Scope, id: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, operatorId: scope.operatorId },
      include: {
        tour: { select: { reference: true, name: true, status: true } },
        reportedGuestMembership: { include: { guest: { select: { name: true, phone: true } } } },
        reporterGuestMembership: { include: { guest: { select: { name: true, phone: true } } } },
        reporterUser: { select: { name: true, role: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async acknowledge(scope: Scope, id: string, expectedVersion?: number) {
    return this.transition(scope, id, IncidentStatus.ACKNOWLEDGED, expectedVersion);
  }

  async dismiss(scope: Scope, id: string, expectedVersion?: number) {
    const incident = await this.require(scope, id);
    if (incident.status !== IncidentStatus.OPEN || (expectedVersion !== undefined && incident.version !== expectedVersion)) throw new ConflictException('Only open incidents can be dismissed');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incident.updateMany({ where: { id, operatorId: scope.operatorId, status: IncidentStatus.OPEN, version: incident.version }, data: { status: IncidentStatus.DISMISSED, version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Incident has changed; refresh and try again');
      await this.addEvent(tx, id, scope.id, 'DISMISSED', 'USER');
      await this.audit(tx, scope.operatorId, scope.id, 'INCIDENT_DISMISSED', id, 'SUCCESS');
      return tx.incident.findUnique({ where: { id } });
    });
  }

  async resolve(scope: Scope, id: string, dto: ResolveIncidentDto) {
    if (!dto.notes.trim()) throw new BadRequestException('Resolution notes are required');
    const incident = await this.require(scope, id);
    if (incident.status !== IncidentStatus.ACKNOWLEDGED) throw new BadRequestException('Only acknowledged incidents can be resolved');
    if (dto.expectedVersion !== undefined && incident.version !== dto.expectedVersion) throw new ConflictException('Incident has changed; refresh and try again');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incident.updateMany({
        where: { id, operatorId: scope.operatorId, status: IncidentStatus.ACKNOWLEDGED, version: incident.version },
        data: { status: IncidentStatus.RESOLVED, resolvedById: scope.id, resolvedAt: new Date(), resolutionNotes: dto.notes.trim(), version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException('Incident has changed; refresh and try again');
      await this.addEvent(tx, id, scope.id, 'RESOLVED', 'USER', { notesProvided: true });
      await this.audit(tx, scope.operatorId, scope.id, 'INCIDENT_RESOLVED', id, 'SUCCESS');
      return tx.incident.findUnique({ where: { id } });
    });
  }

  async createFromInbound(input: { inboundMessageId: string; command: 'LOST' | 'REPORT' | 'MISSING'; tourReference: string; guestReference?: string; sender: string }) {
    const normalizedSender = normalizePhone(input.sender);
    const candidates = await this.prisma.tour.findMany({
      where: { reference: input.tourReference, status: TourStatus.ACTIVE, guests: { some: { status: 'ACTIVE' } } },
      include: { guide: true, guests: { where: { status: 'ACTIVE' }, include: { guest: true } } },
    });
    const matches = candidates.filter((tour) => {
      if (input.command === 'MISSING') return normalizePhone(tour.guide?.phone ?? '') === normalizedSender;
      return tour.guests.some((membership) => normalizePhone(membership.guest.phone) === normalizedSender);
    });
    if (matches.length !== 1) throw new BadRequestException('Report could not be authorized');
    const tour = matches[0];
    const target = input.guestReference ? tour.guests.find((membership) => membership.reference === input.guestReference) : tour.guests.find((membership) => normalizePhone(membership.guest.phone) === normalizedSender);
    if (!target) throw new BadRequestException('Report target was not found');
    const reporterUserId = input.command === 'MISSING' ? tour.guide?.id : undefined;
    const reporterGuestMembershipId = input.command === 'MISSING' ? undefined : tour.guests.find((membership) => normalizePhone(membership.guest.phone) === normalizedSender)?.id;
    if (input.command === 'MISSING' && (!tour.guide || tour.guide.role !== UserRole.GUIDE || tour.guide.status !== 'ACTIVE')) throw new BadRequestException('Report could not be authorized');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.incident.findFirst({ where: { inboundMessage: { id: input.inboundMessageId } } });
      if (existing) return existing;
      const summary = input.command === 'LOST' ? `${target.guest.name} reported themself lost` : input.command === 'MISSING' ? `${tour.guide?.name ?? 'Guide'} reported ${target.guest.name} missing` : `${tour.guests.find((membership) => membership.id === reporterGuestMembershipId)?.guest.name ?? 'Guest'} reported ${target.guest.name} missing`;
      const incident = await tx.incident.create({ data: { operatorId: tour.operatorId, tourId: tour.id, reference: await this.uniqueReference(tour.operatorId, tx), reportedGuestMembershipId: target.id, reporterGuestMembershipId, reporterUserId, source: 'SMS', summary, inboundMessage: { connect: { id: input.inboundMessageId } } } });
      await this.addEvent(tx, incident.id, reporterUserId, 'REPORT_RECEIVED', reporterUserId ? 'GUIDE' : 'GUEST', { command: input.command });
      await this.audit(tx, tour.operatorId, reporterUserId, 'INCIDENT_REPORTED', incident.id, 'SUCCESS', { command: input.command });
      await this.queueNotifications(tx, tour.operatorId, incident.reference, input.sender, incident.id);
      return incident;
    });
  }

  async recordRejectedInbound(inboundMessageId: string, tourReference: string, reason: string) {
    const tours = await this.prisma.tour.findMany({ where: { reference: tourReference }, select: { operatorId: true } });
    if (tours.length !== 1) return;
    await this.audit(this.prisma, tours[0].operatorId, undefined, 'INBOUND_REPORT_REJECTED', inboundMessageId, 'REJECTED', { reason: reason.slice(0, 120) });
  }

  private async transition(scope: Scope, id: string, next: IncidentStatus, expectedVersion?: number) {
    const incident = await this.require(scope, id);
    if (incident.status !== IncidentStatus.OPEN || (expectedVersion !== undefined && incident.version !== expectedVersion)) throw new ConflictException('Incident cannot be acknowledged in its current state');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incident.updateMany({ where: { id, operatorId: scope.operatorId, status: IncidentStatus.OPEN, version: incident.version }, data: { status: next, acknowledgedById: scope.id, acknowledgedAt: new Date(), version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Incident has changed; refresh and try again');
      await this.addEvent(tx, id, scope.id, 'ACKNOWLEDGED', 'USER');
      await this.audit(tx, scope.operatorId, scope.id, 'INCIDENT_ACKNOWLEDGED', id, 'SUCCESS');
      return tx.incident.findUnique({ where: { id } });
    });
  }

  private async require(scope: Scope, id: string) {
    const incident = await this.prisma.incident.findFirst({ where: { id, operatorId: scope.operatorId } });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  private async uniqueReference(operatorId: string, tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = createReference(INCIDENT_REFERENCE_PREFIX);
      if (!(await tx.incident.findUnique({ where: { operatorId_reference: { operatorId, reference } } }))) return reference;
    }
    throw new ConflictException('Could not generate a unique incident reference');
  }

  private addEvent(tx: Prisma.TransactionClient, incidentId: string, actorUserId: string | undefined, eventType: string, actorType: string, metadata?: Prisma.InputJsonObject) {
    return tx.incidentEvent.create({ data: { incidentId, actorUserId, eventType, actorType, metadata } });
  }

  private audit(tx: Prisma.TransactionClient, operatorId: string, actorUserId: string | undefined, action: string, entityId: string, outcome: string, metadata?: Prisma.InputJsonObject) {
    return tx.auditEvent.create({ data: { operatorId, actorUserId, action, entityType: 'INCIDENT', entityId, outcome, correlationId: randomUUID(), metadata } });
  }

  private async queueNotifications(tx: Prisma.TransactionClient, operatorId: string, incidentReference: string, reporterPhone: string, incidentId: string) {
    const operators = await tx.user.findMany({ where: { operatorId, status: 'ACTIVE', role: { in: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF] }, phone: { not: null } }, select: { phone: true } });
    const recipients = [...new Set([reporterPhone, ...operators.map((user) => user.phone).filter((phone): phone is string => Boolean(phone))])];
    const messages = recipients.map((recipient) => {
      const operatorRecipient = operators.some((user) => user.phone === recipient);
      const body = operatorRecipient ? `TourGuard alert ${incidentReference}` : `Your report ${incidentReference} was received`;
      return { operatorId, provider: 'africas-talking', recipient, messageType: operatorRecipient ? 'INCIDENT_OPERATOR_ALERT' : 'INCIDENT_REPORT_ACK', bodyHash: createHash('sha256').update(body).digest('hex'), status: 'QUEUED' as const, providerMetadata: { incidentId, incidentReference } };
    });
    if (messages.length) await tx.outboundMessage.createMany({ data: messages });
  }
}

