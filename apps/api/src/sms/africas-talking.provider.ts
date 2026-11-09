import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { CanonicalInboundSms, SendSmsInput, SendSmsResult, SmsEnvironment } from './sms.types';

@Injectable()
export class AfricasTalkingProvider {
  private readonly logger = new Logger(AfricasTalkingProvider.name);

  private get environment(): SmsEnvironment {
    return process.env.AFRICAS_TALKING_ENV === 'production' ? 'production' : 'sandbox';
  }

  private get baseUrl(): string {
    return process.env.AFRICAS_TALKING_BASE_URL ?? (this.environment === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com');
  }

  normalizeInbound(payload: Record<string, unknown>): CanonicalInboundSms {
    const stringValue = (key: string): string | undefined => {
      const value = payload[key];
      return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    };
    const sender = stringValue('phoneNumber') ?? stringValue('from');
    const text = stringValue('text') ?? stringValue('message');
    if (!sender || !text) throw new Error('Inbound SMS payload is missing sender or text');
    const receivedAt = stringValue('date');
    return {
      provider: 'africas-talking',
      providerMessageId: stringValue('id') ?? stringValue('messageId'),
      sender,
      recipient: stringValue('to'),
      text,
      receivedAt: receivedAt && !Number.isNaN(Date.parse(receivedAt)) ? new Date(receivedAt) : new Date(),
      rawPayload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonObject,
    };
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const username = process.env.AFRICAS_TALKING_USERNAME;
    const apiKey = process.env.AFRICAS_TALKING_API_KEY;
    if (!username || !apiKey) throw new Error('Africa\'s Talking credentials are not configured');
    const body = new URLSearchParams({ username, to: input.to, message: input.message });
    if (input.from ?? process.env.AFRICAS_TALKING_SENDER_OR_SHORT_CODE) body.set('from', input.from ?? process.env.AFRICAS_TALKING_SENDER_OR_SHORT_CODE!);
    try {
      const response = await fetch(`${this.baseUrl}/version1/messaging`, { method: 'POST', headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      const metadata = (await response.json()) as Record<string, unknown>;
      if (!response.ok) return { status: 'FAILED', providerMetadata: metadata };
      const data = metadata.SMSMessageData as { Recipients?: Array<{ messageId?: string; status?: string }> } | undefined;
      const recipient = data?.Recipients?.[0];
      const status = recipient?.status && ['Success', 'Sent', 'Queued', 'Processed'].includes(recipient.status) ? 'SUBMITTED' : 'UNKNOWN';
      return { status, providerMessageId: recipient?.messageId, providerMetadata: metadata };
    } catch (error) {
      this.logger.warn(`Africa's Talking request failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { status: 'UNKNOWN' };
    }
  }

  fingerprint(message: CanonicalInboundSms): string {
    const value = message.providerMessageId
      ? [message.provider, message.providerMessageId].join('|')
      : [message.provider, message.sender, message.recipient ?? '', message.text.trim().toUpperCase(), message.receivedAt.toISOString()].join('|');
    return createHash('sha256').update(value).digest('hex');
  }
}
