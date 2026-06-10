import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { PersonalAgentsScheduler } from './personal_agents.scheduler';

@Module({
  imports: [
    PrismaModule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    BullModule.registerQueue({ name: 'personal-agents-queue' }),
  ],
  controllers: [],
  providers: [PersonalAgentsScheduler],
  exports: [],
})
export class PersonalAgentsModule {}
