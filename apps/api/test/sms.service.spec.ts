import { SmsService } from '../src/sms/sms.service';

describe('SmsService incident handoff', () => {
  it.each([
    ['LOST TG482', 'LOST'],
    ['REPORT TG482 GUEST829', 'REPORT'],
    ['MISSING TG482 GUEST829', 'MISSING'],
  ])('passes %s through to incident authorization', async (text, command) => {
    const prisma = {
      inboundMessage: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'inbound-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const provider = {
      normalizeInbound: jest.fn().mockReturnValue({ provider: 'africas-talking', providerMessageId: 'message-1', sender: '+254700000001', recipient: '12345', text, receivedAt: new Date(), rawPayload: {} }),
      fingerprint: jest.fn().mockReturnValue('fingerprint-1'),
    } as any;
    const parser = { parse: jest.fn().mockReturnValue({ command, tourReference: 'TG482', ...(command !== 'LOST' ? { guestReference: 'GUEST829' } : {}) }) } as any;
    const incidents = { createFromInbound: jest.fn().mockResolvedValue({ id: 'incident-1', operatorId: 'operator-1' }), recordRejectedInbound: jest.fn() } as any;
    const service = new SmsService(prisma, provider, parser, incidents);

    const result = await service.receiveInbound({ text });

    expect(result).toEqual(expect.objectContaining({ incidentId: 'incident-1' }));
    expect(incidents.createFromInbound).toHaveBeenCalledWith(expect.objectContaining({ command, tourReference: 'TG482' }));
    expect(incidents.recordRejectedInbound).not.toHaveBeenCalled();
  });

  it('records an authorization rejection without creating an incident', async () => {
    const prisma = { inboundMessage: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'inbound-1' }), update: jest.fn().mockResolvedValue({}) } } as any;
    const provider = { normalizeInbound: jest.fn().mockReturnValue({ provider: 'africas-talking', providerMessageId: 'message-1', sender: '+254700000001', text: 'LOST TG482', receivedAt: new Date(), rawPayload: {} }), fingerprint: jest.fn().mockReturnValue('fingerprint-1') } as any;
    const parser = { parse: jest.fn().mockReturnValue({ command: 'LOST', tourReference: 'TG482' }) } as any;
    const incidents = { createFromInbound: jest.fn().mockRejectedValue(new Error('Report could not be authorized')), recordRejectedInbound: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new SmsService(prisma, provider, parser, incidents);

    await expect(service.receiveInbound({})).resolves.toEqual(expect.objectContaining({ rejected: true }));
    expect(incidents.recordRejectedInbound).toHaveBeenCalledWith('inbound-1', 'TG482', 'Report could not be authorized');
  });
});

