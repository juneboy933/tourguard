import { BadRequestException, ConflictException } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { IncidentsService } from '../src/incidents/incidents.service';

describe('IncidentsService', () => {
  const scope = { operatorId: 'operator-1', id: 'user-1', role: 'STAFF' };

  it('acknowledges an open incident and appends history', async () => {
    const tx = {
      incident: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'incident-1', status: IncidentStatus.ACKNOWLEDGED }),
      },
      incidentEvent: { create: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      incident: { findFirst: jest.fn().mockResolvedValue({ id: 'incident-1', operatorId: 'operator-1', status: IncidentStatus.OPEN, version: 1 }) },
      $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    } as any;
    const service = new IncidentsService(prisma);

    const result = await service.acknowledge(scope, 'incident-1', 1);

    expect(result).toEqual({ id: 'incident-1', status: IncidentStatus.ACKNOWLEDGED });
    expect(tx.incident.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ version: 1 }) }));
    expect(tx.incidentEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'ACKNOWLEDGED' }) }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('rejects resolving an incident that is not acknowledged', async () => {
    const prisma = { incident: { findFirst: jest.fn().mockResolvedValue({ id: 'incident-1', operatorId: 'operator-1', status: IncidentStatus.OPEN, version: 1 }) } } as any;
    const service = new IncidentsService(prisma);

    await expect(service.resolve(scope, 'incident-1', { notes: 'Handled' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('protects against stale acknowledgement versions', async () => {
    const prisma = { incident: { findFirst: jest.fn().mockResolvedValue({ id: 'incident-1', operatorId: 'operator-1', status: IncidentStatus.OPEN, version: 2 }) } } as any;
    const service = new IncidentsService(prisma);

    await expect(service.acknowledge(scope, 'incident-1', 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('dismisses an open incident as a terminal operator decision', async () => {
    const tx = {
      incident: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn().mockResolvedValue({ id: 'incident-1', status: IncidentStatus.DISMISSED }) },
      incidentEvent: { create: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { incident: { findFirst: jest.fn().mockResolvedValue({ id: 'incident-1', operatorId: 'operator-1', status: IncidentStatus.OPEN, version: 1 }) }, $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) } as any;
    const service = new IncidentsService(prisma);

    await expect(service.dismiss(scope, 'incident-1', 1)).resolves.toEqual({ id: 'incident-1', status: IncidentStatus.DISMISSED });
    expect(tx.incidentEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'DISMISSED' }) }));
  });
});

