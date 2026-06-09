import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { PrismaPg } from '@prisma/adapter-pg';

const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('@prisma/adapter-pg');
jest.mock('../../generated/prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(function () {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.$disconnect = mockDisconnect;
    }),
  };
});

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should instantiate PrismaPg with DATABASE_URL', () => {
    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: process.env.DATABASE_URL,
    });
  });

  it('should call $disconnect on onModuleDestroy', async () => {
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
