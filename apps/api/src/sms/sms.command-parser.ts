import { Injectable } from '@nestjs/common';

export type ParsedSmsCommand = {
  command: 'LOST' | 'REPORT' | 'MISSING';
  tourReference: string;
  guestReference?: string;
};

@Injectable()
export class SmsCommandParser {
  parse(text: string): ParsedSmsCommand {
    const tokens = text.trim().toUpperCase().split(/\s+/);
    const [command, tourReference, guestReference] = tokens;
    if (command === 'LOST' && tokens.length === 2) return { command, tourReference };
    if ((command === 'REPORT' || command === 'MISSING') && tokens.length === 3 && guestReference) return { command, tourReference, guestReference };
    throw new Error('Unsupported SMS command');
  }
}
