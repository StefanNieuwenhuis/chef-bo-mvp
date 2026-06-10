import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Job } from 'bullmq';

@Processor('personal-agents-queue')
export class PersonalAgentsProcessor extends WorkerHost {
  private readonly logger = new Logger(PersonalAgentsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { agentId, householdMemberId } = job.data;

    this.logger.log(
      `Processing job ${job.id} (${job.name}) for agent ${agentId}, member ${householdMemberId}`,
    );

    await this.prisma.personalAgent.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { id: agentId },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Agent ${agentId} marked ACTIVE`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Completed job ${job.id} (${job.name})`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(`Failed job ${job?.id} (${job?.name}): ${error.message}`);

    const maxAttempts = job?.opts?.attempts ?? 1;
    const attemptsMade = job?.attemptsMade ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const agentId = job?.data?.agentId as string | undefined;

    if (!agentId || attemptsMade < maxAttempts) {
      return;
    }

    try {
      await this.prisma.personalAgent.update({
        where: { id: agentId },
        data: { status: 'FAILED' },
      });
    } catch (updateError) {
      const errorCode = (updateError as { code?: string }).code;
      if (errorCode === 'P2025') {
        this.logger.warn(
          `Agent ${agentId} not found while marking FAILED; skipping update.`,
        );
        return;
      }
      throw updateError;
    }

    this.logger.log(
      `Agent ${agentId} marked FAILED after ${attemptsMade} attempts`,
    );
  }
}
