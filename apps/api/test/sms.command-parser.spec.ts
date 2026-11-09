import { SmsCommandParser } from '../src/sms/sms.command-parser';

describe('SmsCommandParser', () => {
  const parser = new SmsCommandParser();

  it('parses a tourist report', () => {
    expect(parser.parse('lost tg482')).toEqual({ command: 'LOST', tourReference: 'TG482' });
  });

  it('parses a group-member or guide report', () => {
    expect(parser.parse('MISSING TG482 GUEST829')).toEqual({ command: 'MISSING', tourReference: 'TG482', guestReference: 'GUEST829' });
  });

  it('rejects ambiguous commands', () => {
    expect(() => parser.parse('REPORT TG482')).toThrow('Unsupported SMS command');
  });
});
