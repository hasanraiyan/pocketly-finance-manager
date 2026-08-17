import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AccountsService } from '../accounts/accounts.service';
import { AppModule } from '../app.module';
import { BudgetsService } from '../budgets/budgets.service';
import { CategoriesService } from '../categories/categories.service';
import { GoalsController } from '../goals/goals.controller';
import { GoalsService } from '../goals/goals.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { McpServerFactory } from '../mcp/mcp-server.factory';
import { IntelligenceController } from './intelligence.controller';

/**
 * The PR's whole claim is that Web (via REST), MCP and the alert worker
 * "can never disagree on a number" because they all read through the same
 * `FinancialContextService` and the same pure calculators. That claim is
 * architectural, not tested -- until now. This boots the real module graph
 * (real Mongo, real DI, no mocked services) and drives the MCP tool through
 * the actual SDK protocol (`Client` + `InMemoryTransport`), the same way a
 * connected AI client would, then asserts the figures a REST caller and an
 * MCP caller get for the same user are byte-for-byte identical.
 */
describe('REST vs MCP financial parity', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let app: INestApplication;
  let user: UserDocument;

  let intelligenceController: IntelligenceController;
  let goalsController: GoalsController;
  let mcpFactory: McpServerFactory;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const usersService = moduleRef.get(UsersService);
    const accountsService = moduleRef.get(AccountsService);
    const categoriesService = moduleRef.get(CategoriesService);
    const transactionsService = moduleRef.get(TransactionsService);
    const budgetsService = moduleRef.get(BudgetsService);
    const goalsService = moduleRef.get(GoalsService);

    user = await usersService.register(
      'parity@test.com',
      'not-a-real-hash',
      'Parity Tester',
    );
    user.timezone = 'UTC';
    user.currency = 'INR';
    await user.save();

    const account = await accountsService.create(user._id, {
      name: 'Checking',
      type: 'bank',
      initialBalance: 10_000_00,
      currency: 'INR',
    });
    const category = await categoriesService.create(user._id, {
      name: 'Food',
      type: 'expense',
    });

    await transactionsService.create(user._id, {
      type: 'expense',
      amount: 2_000_00,
      accountId: account._id.toString(),
      categoryId: category._id.toString(),
      date: new Date(),
    });
    await transactionsService.create(user._id, {
      type: 'income',
      amount: 5_000_00,
      accountId: account._id.toString(),
      date: new Date(),
    });

    await budgetsService.create(user, {
      categoryId: category._id.toString(),
      amount: 3_000_00,
      period: 'monthly',
    });

    await goalsService.create(user, {
      name: 'Emergency fund',
      targetAmount: 10_000_00,
      monthlyContribution: 500_00,
    });

    intelligenceController = moduleRef.get(IntelligenceController);
    goalsController = moduleRef.get(GoalsController);
    mcpFactory = moduleRef.get(McpServerFactory);
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  /**
   * `JSON.stringify` is what actually puts a REST response on the wire, and
   * it's also what `mcp-result.ts#textResult` uses to serialize a tool's
   * payload -- so it's the fair way to compare the two, and it's also what
   * turns a `Date` into the same ISO string on both sides instead of failing
   * the comparison on representation alone.
   */
  function overWire<T>(value: T): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  async function callMcpTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const server = mcpFactory.build(user, 'test-token', [
      'pocketly:read',
      'pocketly:write',
    ]);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'parity-test-client', version: '1.0.0' });

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    try {
      const result = (await client.callTool({
        name,
        arguments: args,
      })) as CallToolResult;
      expect(result.isError).not.toBe(true);
      const [content] = result.content as Array<{ type: string; text: string }>;
      return JSON.parse(content.text);
    } finally {
      await client.close();
      await server.close();
    }
  }

  /**
   * Every projected figure here is a function of `now`, and the REST and MCP
   * calls are two separate round trips a few milliseconds apart -- without
   * pinning the clock, `window.start`/`projectedCompletion`/etc. would differ
   * by that gap and fail the comparison for a reason that has nothing to do
   * with whether REST and MCP agree. Freezing time isolates the property this
   * test actually checks: given the same instant, do the two paths compute
   * the same numbers.
   */
  function withFrozenClock<T>(run: () => Promise<T>): Promise<T> {
    // Only `Date` is faked -- the Mongo driver, BullMQ and the MCP SDK's
    // transport all rely on real `setTimeout`/`setInterval` for socket and
    // connection housekeeping, and faking those hangs the test.
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'hrtime',
        'performance',
        'queueMicrotask',
      ],
    });
    jest.setSystemTime(new Date('2026-04-15T09:00:00Z'));
    return run().finally(() => jest.useRealTimers());
  }

  it('safe-to-spend matches between the REST endpoint and the MCP tool', () =>
    withFrozenClock(async () => {
      const rest = overWire(await intelligenceController.getSafeToSpend(user));
      const mcp = await callMcpTool('get_outlook', { metric: 'safe_to_spend' });

      expect(mcp).toEqual(rest);
    }));

  it('forecast matches between the REST endpoint and the MCP tool', () =>
    withFrozenClock(async () => {
      const rest = overWire(
        await intelligenceController.getForecast(user, { horizon: 'month' }),
      );
      const mcp = await callMcpTool('get_outlook', {
        metric: 'forecast',
        horizon: 'month',
      });

      expect(mcp).toEqual(rest);
    }));

  it('goals match between the REST endpoint and the MCP tool', () =>
    withFrozenClock(async () => {
      const rest = overWire(
        await goalsController.findAll(user, { limit: 100, cursor: undefined }),
      );
      const mcp = await callMcpTool('get_outlook', { metric: 'goals' });

      expect(mcp).toEqual(rest);
    }));
});
