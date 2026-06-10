import { PersonalAgentsProcessor } from './personal_agents.processor';

describe('PersonalAgentsProcessor', () => {
  let processor: PersonalAgentsProcessor;
  let prisma: {
    personalAgent: {
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      personalAgent: {
        update: jest.fn(),
      },
    };

    processor = new PersonalAgentsProcessor(prisma as never);
  });

  it('marks a personal agent ACTIVE when recover job is processed', async () => {
    const job = {
      id: 'job-1',
      name: 'recover-agent',
      data: {
        agentId: 'agent-1',
        householdMemberId: 'member-1',
      },
    };

    await processor.process(job as never);

    expect(prisma.personalAgent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { status: 'ACTIVE' },
    });
  });

  it('marks a personal agent FAILED when all retries are exhausted', async () => {
    const job = {
      id: 'job-1',
      name: 'recover-agent',
      data: {
        agentId: 'agent-1',
        householdMemberId: 'member-1',
      },
      attemptsMade: 5,
      opts: {
        attempts: 5,
      },
    };

    await processor.onFailed(
      job as never,
      new Error('worker failed after retries'),
    );

    expect(prisma.personalAgent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { status: 'FAILED' },
    });
  });

  it('does not mark a personal agent FAILED before retries are exhausted', async () => {
    const job = {
      id: 'job-1',
      name: 'recover-agent',
      data: {
        agentId: 'agent-1',
        householdMemberId: 'member-1',
      },
      attemptsMade: 2,
      opts: {
        attempts: 5,
      },
    };

    await processor.onFailed(job as never, new Error('intermediate failure'));

    expect(prisma.personalAgent.update).not.toHaveBeenCalled();
  });

  it('does not mark a personal agent FAILED when job payload has no agentId', async () => {
    const job = {
      id: 'job-1',
      name: 'recover-agent',
      data: {
        householdMemberId: 'member-1',
      },
      attemptsMade: 5,
      opts: {
        attempts: 5,
      },
    };

    await processor.onFailed(
      job as never,
      new Error('final failure with bad payload'),
    );

    expect(prisma.personalAgent.update).not.toHaveBeenCalled();
  });

  it('marks a personal agent FAILED when attempts option is missing and first failure occurs', async () => {
    const job = {
      id: 'job-1',
      name: 'recover-agent',
      data: {
        agentId: 'agent-1',
        householdMemberId: 'member-1',
      },
      attemptsMade: 1,
    };

    await processor.onFailed(job as never, new Error('single-attempt failure'));

    expect(prisma.personalAgent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { status: 'FAILED' },
    });
  });

  it('propagates prisma errors when marking ACTIVE fails', async () => {
    const job = {
      id: 'job-1',
      name: 'recover-agent',
      data: {
        agentId: 'agent-1',
        householdMemberId: 'member-1',
      },
    };
    prisma.personalAgent.update.mockRejectedValueOnce(
      new Error('update active failed'),
    );

    await expect(processor.process(job as never)).rejects.toThrow(
      'update active failed',
    );
  });

  it('propagates prisma errors when marking FAILED fails', async () => {
    const job = {
      id: 'job-1',
      name: 'recover-agent',
      data: {
        agentId: 'agent-1',
        householdMemberId: 'member-1',
      },
      attemptsMade: 5,
      opts: {
        attempts: 5,
      },
    };
    prisma.personalAgent.update.mockRejectedValueOnce(
      new Error('update failed status failed'),
    );

    await expect(
      processor.onFailed(
        job as never,
        new Error('worker failed after retries'),
      ),
    ).rejects.toThrow('update failed status failed');
  });
});
