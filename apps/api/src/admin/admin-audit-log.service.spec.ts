import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Types } from 'mongoose';
import { AdminAuditLogService } from './admin-audit-log.service';
import {
  AdminAuditLog,
  AdminAuditLogDocument,
  AdminAuditLogSchema,
} from './schemas/admin-audit-log.schema';

describe('AdminAuditLogService', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: AdminAuditLogService;
  let auditLogModel: Model<AdminAuditLogDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: AdminAuditLog.name, schema: AdminAuditLogSchema },
        ]),
      ],
      providers: [AdminAuditLogService],
    }).compile();

    service = moduleRef.get(AdminAuditLogService);
    auditLogModel = moduleRef.get(getModelToken(AdminAuditLog.name));
  }, 60_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  it('pages through audit entries via cursor with no overlap or gaps', async () => {
    const created: AdminAuditLogDocument[] = [];
    for (let i = 0; i < 5; i++) {
      // Sequential, not parallel -- ids must be created in order for the
      // newest-first cursor assertions below to be meaningful.
      created.push(
        await auditLogModel.create({
          adminUserId: new Types.ObjectId(),
          adminEmail: 'admin@pocketly.app',
          action: 'user.role_update',
          targetId: `target-${i}`,
          targetType: 'user',
          details: {},
        }),
      );
    }
    const createdIds = created.map((log) => log._id.toString());

    const firstPage = await service.findAll({ limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();
    expect(firstPage.items.map((item) => item._id)).toEqual(
      [...createdIds].reverse().slice(0, 2),
    );

    const secondPage = await service.findAll({
      limit: 2,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.items).toHaveLength(2);
    const firstIds = new Set(firstPage.items.map((item) => item._id));
    for (const item of secondPage.items) {
      expect(firstIds.has(item._id)).toBe(false);
    }
    expect(secondPage.items.map((item) => item._id)).toEqual(
      [...createdIds].reverse().slice(2, 4),
    );

    const thirdPage = await service.findAll({
      limit: 2,
      cursor: secondPage.nextCursor!,
    });
    expect(thirdPage.items).toHaveLength(1);
    expect(thirdPage.nextCursor).toBeNull();
    expect(thirdPage.items[0]._id).toBe(createdIds[0]);
  });

  it('filters by action alongside the cursor', async () => {
    await auditLogModel.create([
      {
        adminUserId: new Types.ObjectId(),
        adminEmail: 'admin@pocketly.app',
        action: 'feedback.delete',
        targetId: 'f1',
        targetType: 'feedback',
        details: {},
      },
      {
        adminUserId: new Types.ObjectId(),
        adminEmail: 'admin@pocketly.app',
        action: 'user.role_update',
        targetId: 'u1',
        targetType: 'user',
        details: {},
      },
    ]);

    const result = await service.findAll({
      action: 'feedback.delete',
      limit: 50,
    });
    expect(
      result.items.every((item) => item.action === 'feedback.delete'),
    ).toBe(true);
  });
});
