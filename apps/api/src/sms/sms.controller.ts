import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SmsService } from './sms.service';

@Controller('webhooks/africas-talking')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('inbound-sms')
  @HttpCode(HttpStatus.OK)
  receiveInbound(@Body() payload: Record<string, unknown>) {
    return this.smsService.receiveInbound(payload);
  }
}
