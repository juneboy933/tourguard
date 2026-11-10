import { Module } from '@nestjs/common';
import { AfricasTalkingProvider } from './africas-talking.provider';
import { SmsCommandParser } from './sms.command-parser';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [IncidentsModule],
  controllers: [SmsController],
  providers: [AfricasTalkingProvider, SmsCommandParser, SmsService],
  exports: [AfricasTalkingProvider, SmsCommandParser, SmsService],
})
export class SmsModule {}
