import { PersonalAgentsScheduler } from './personal_agents.scheduler';

describe('PersonalAgentsScheduler', () => {
  let scheduler: PersonalAgentsScheduler;
  let prisma: {
    personalAgent: {
      findMany: jest.Mock;
    };
  };
  let agentsQueue: {
    add: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      personalAgent: {
        findMany: jest.fn(),
      },
    };

    agentsQueue = {
      add: jest.fn(),
    };

    scheduler = new PersonalAgentsScheduler(prisma as never, agentsQueue as never);
  });

  it('queries pending agents older than one minute', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    prisma.personalAgent.findMany.mockResolvedValue([]);

    await scheduler.recoverPendingAgents();

    expect(prisma.personalAgent.findMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(1_700_000_000_000 - 60_000) },
      },
    });

    nowSpy.mockRestore();
  });

  it('enqueues a recover job for each stuck agent', async () => {
    const stuckAgents = [
      { id: 'agent-1', householdMemberId: 'member-1' },
      { id: 'agent-2', householdMemberId: 'member-2' },
    ];
    prisma.personalAgent.findMany.mockResolvedValue(stuckAgents);
    agentsQueue.add.mockResolvedValue({ id: 'job-1' });

    await scheduler.recoverPendingAgents();

    expect(agentsQueue.add).toHaveBeenCalledTimes(2);
    expect(agentsQueue.add).toHaveBeenNthCalledWith(
      1,
      'recover-agent',
      { agentId: 'agent-1', householdMemberId: 'member-1' },
      {
        jobId: 'recover-agent-agent-1',
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
    expect(agentsQueue.add).toHaveBeenNthCalledWith(
      2,
      'recover-agent',
      { agentId: 'agent-2', householdMemberId: 'member-2' },
      {
        jobId: 'recover-agent-agent-2',
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  });

  it('continues when one queue enqueue fails', async () => {
    const stuckAgents = [
      { id: 'agent-1', householdMemberId: 'member-1' },
      { id: 'agent-2', householdMemberId: 'member-2' },
    ];
    prisma.personalAgent.findMany.mockResolvedValue(stuckAgents);
    agentsQueue.add
      .mockRejectedValueOnce(new Error('queue temporarily unavailable'))
      .mockResolvedValueOnce({ id: 'job-2' });

    await expect(scheduler.recoverPendingAgents()).resolves.toBeUndefined();
    expect(agentsQueue.add).toHaveBeenCalledTimes(2);
  });

  it('propagates prisma query failures', async () => {
    prisma.personalAgent.findMany.mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(scheduler.recoverPendingAgents()).rejects.toThrow(
      'database unavailable',
    );
    expect(agentsQueue.add).not.toHaveBeenCalled();
  });
});
