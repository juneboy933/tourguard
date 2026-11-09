import { Module } from '@nestjs/common';
import { AfricasTalkingProvider } from './africas-talking.provider';
import { SmsCommandParser } from './sms.command-parser';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Module({
  controllers: [SmsController],
  providers: [AfricasTalkingProvider, SmsCommandParser, SmsService],
  exports: [AfricasTalkingProvider, SmsCommandParser, SmsService],
})
export class SmsModule {}
