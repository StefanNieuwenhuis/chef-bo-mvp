import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class PersonalAgentsScheduler {
  private readonly logger = new Logger(PersonalAgentsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,

    @InjectQueue('personal-agents-queue') private readonly agentsQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async recoverPendingAgents() {
    const stuckAgents = await this.prisma.personalAgent.findMany({
      select: { id: true, householdMemberId: true },
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(Date.now() - 60_000) }, // older than 1 minute
      },
    });

    const results = await Promise.allSettled(
      stuckAgents.map((agent) =>
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

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to enqueue recovery for agent ${stuckAgents[index]?.id}: ${String(result.reason)}`,
        );
      }
    });
  }
}
