import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ToursModule } from './tours/tours.module';
import { SmsModule } from './sms/sms.module';
import { IncidentsModule } from './incidents/incidents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    DatabaseModule,
    AuthModule,
    ToursModule,
    SmsModule,
    IncidentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
