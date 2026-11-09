import { AfricasTalkingProvider } from '../src/sms/africas-talking.provider';

describe('AfricasTalkingProvider', () => {
  it('normalizes the expected inbound field shape without requiring a signature assumption', () => {
    const provider = new AfricasTalkingProvider();
    const result = provider.normalizeInbound({
      phoneNumber: '+254712345678',
      text: 'LOST TG482',
      to: '12345',
      id: 'ATX-1',
      date: '2026-11-09 15:00:00',
    });

    expect(result.provider).toBe('africas-talking');
    expect(result.providerMessageId).toBe('ATX-1');
    expect(result.sender).toBe('+254712345678');
    expect(result.text).toBe('LOST TG482');
  });

  it('produces a stable fingerprint for the same message', () => {
    const provider = new AfricasTalkingProvider();
    const message = provider.normalizeInbound({ phoneNumber: '+254712345678', text: 'LOST TG482', id: 'ATX-1' });
    expect(provider.fingerprint(message)).toBe(provider.fingerprint(message));
  });

  it('uses the provider message ID as the idempotency identity', () => {
    const provider = new AfricasTalkingProvider();
    const first = provider.normalizeInbound({ phoneNumber: '+254712345678', text: 'LOST TG482', id: 'ATX-1', date: '2026-11-09 15:00:00' });
    const retry = provider.normalizeInbound({ phoneNumber: '+254712345678', text: 'LOST TG482', id: 'ATX-1', date: '2026-11-09 15:01:00' });
    expect(provider.fingerprint(first)).toBe(provider.fingerprint(retry));
  });
});
