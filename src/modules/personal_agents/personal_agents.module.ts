import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { PersonalAgentsScheduler } from './personal_agents.scheduler';
import { PersonalAgentsProcessor } from './personal_agents.processor';

@Module({
  imports: [
    PrismaModule,

    BullModule.registerQueue({ name: 'personal-agents-queue' }),
  ],
  controllers: [],
  providers: [PersonalAgentsScheduler, PersonalAgentsProcessor],
  exports: [],
})
export class PersonalAgentsModule {}
