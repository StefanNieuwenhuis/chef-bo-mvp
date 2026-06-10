import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class PersonalAgentsScheduler {
  constructor(
    private readonly prisma: PrismaService,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @InjectQueue('agents-queue') private readonly agentsQueue: Queue,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  @Cron(CronExpression.EVERY_MINUTE)
  async recoverPendingAgents() {
    const stuckAgents = await this.prisma.personalAgent.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(Date.now() - 60_000) }, // older than 1 minute
      },
    });

    await Promise.allSettled(
      stuckAgents.map((agent) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access
        this.agentsQueue.add(
          'recover-agent',
          { agentId: agent.id, householdMemberId: agent.householdMemberId },
          {
            jobId: `recover-agent-${agent.id}`, // idempotent; unique job ID to prevent duplicates
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 2000, // 2 seconds initial delay
            },
          },
        ),
      ),
    );
  }
}
