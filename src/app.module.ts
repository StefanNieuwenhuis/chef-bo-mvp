import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PersonalAgentsModule } from './modules/personal_agents/personal_agents.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
    PrismaModule,
    PersonalAgentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
