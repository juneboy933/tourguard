import { Prisma } from '@prisma/client';

export type SmsEnvironment = 'sandbox' | 'production';

export type CanonicalInboundSms = {
  provider: 'africas-talking';
  providerMessageId?: string;
  sender: string;
  recipient?: string;
  text: string;
  receivedAt: Date;
  rawPayload: Prisma.InputJsonObject;
};

export type SendSmsInput = {
  to: string;
  message: string;
  from?: string;
};

export type SendSmsResult = {
  providerMessageId?: string;
  status: 'SUBMITTED' | 'FAILED' | 'UNKNOWN';
  providerMetadata?: Record<string, unknown>;
};
