import { Injectable } from '@nestjs/common';
import { InboundMessageStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AfricasTalkingProvider } from './africas-talking.provider';
import { SmsCommandParser } from './sms.command-parser';
import { SendSmsInput } from './sms.types';
import { IncidentsService } from '../incidents/incidents.service';

@Injectable()
export class SmsService {
  constructor(private readonly prisma: PrismaService, private readonly provider: AfricasTalkingProvider, private readonly parser: SmsCommandParser, private readonly incidents: IncidentsService) {}

  async receiveInbound(payload: Record<string, unknown>) {
    const message = this.provider.normalizeInbound(payload);
    const fingerprint = this.provider.fingerprint(message);
    const duplicate = message.providerMessageId
      ? await this.prisma.inboundMessage.findFirst({ where: { provider: message.provider, providerMessageId: message.providerMessageId } })
      : await this.prisma.inboundMessage.findUnique({ where: { fingerprint } });
    if (duplicate) {
      await this.prisma.inboundMessage.update({ where: { id: duplicate.id }, data: { status: InboundMessageStatus.DUPLICATE } });
      return { duplicate: true, id: duplicate.id };
    }

    try {
      const command = this.parser.parse(message.text);
      const created = await this.prisma.inboundMessage.create({
        data: {
          provider: message.provider,
          providerMessageId: message.providerMessageId,
          fingerprint,
          sender: message.sender,
          recipient: message.recipient,
          text: message.text,
          command: command.command,
          tourReference: command.tourReference,
          guestReference: command.guestReference,
          status: InboundMessageStatus.PARSED,
          rawPayload: message.rawPayload,
          receivedAt: message.receivedAt,
          processedAt: new Date(),
        },
      });
      try {
        const incident = await this.incidents.createFromInbound({ inboundMessageId: created.id, command: command.command, tourReference: command.tourReference, guestReference: command.guestReference, sender: message.sender });
        await this.prisma.inboundMessage.update({ where: { id: created.id }, data: { operatorId: incident.operatorId, incidentId: incident.id } });
        return { duplicate: false, id: created.id, command, incidentId: incident.id };
      } catch (error) {
        await this.prisma.inboundMessage.update({ where: { id: created.id }, data: { status: InboundMessageStatus.REJECTED, rejectionReason: error instanceof Error ? error.message : 'Report could not be authorized', processedAt: new Date() } });
        return { duplicate: false, id: created.id, rejected: true };
      }
    } catch (error) {
      const created = await this.prisma.inboundMessage.create({
        data: {
          provider: message.provider,
          providerMessageId: message.providerMessageId,
          fingerprint,
          sender: message.sender,
          recipient: message.recipient,
          text: message.text,
          status: InboundMessageStatus.REJECTED,
          rejectionReason: error instanceof Error ? error.message : 'Unsupported SMS command',
          rawPayload: message.rawPayload,
          receivedAt: message.receivedAt,
          processedAt: new Date(),
        },
      });
      return { duplicate: false, id: created.id, rejected: true };
    }
  }

  send(input: SendSmsInput) {
    return this.provider.send(input);
  }
}
