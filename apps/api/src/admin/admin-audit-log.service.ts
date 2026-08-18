import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import {
  AdminAuditLog,
  AdminAuditLogDocument,
} from './schemas/admin-audit-log.schema';
import { AuditLogQueryDto } from './dto/admin-audit-log-response.dto';

@Injectable()
export class AdminAuditLogService {
  constructor(
    @InjectModel(AdminAuditLog.name)
    private readonly auditLogModel: Model<AdminAuditLogDocument>,
  ) {}

  async log(params: {
    adminUserId: Types.ObjectId;
    adminEmail: string;
    action: string;
    targetId: string;
    targetType: string;
    details?: Record<string, unknown>;
    ip?: string | null;
  }) {
    return this.auditLogModel.create({
      adminUserId: params.adminUserId,
      adminEmail: params.adminEmail,
      action: params.action,
      targetId: params.targetId,
      targetType: params.targetType,
      details: params.details ?? {},
      ip: params.ip ?? null,
      createdAt: new Date(),
    });
  }

  async findAll(query: AuditLogQueryDto) {
    const filter: Record<string, any> = {};
    if (query.action) {
      filter.action = query.action;
    }
    if (query.cursor) {
      filter._id = { $lt: decodeIdCursor(query.cursor) };
    }

    const limit = query.limit ?? 50;

    const items = await this.auditLogModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean<AdminAuditLogDocument[]>()
      .exec();

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? encodeIdCursor(page[page.length - 1]._id)
      : null;

    return {
      items: page.map((item) => ({
        _id: item._id.toString(),
        adminUserId: item.adminUserId.toString(),
        adminEmail: item.adminEmail,
        action: item.action,
        targetId: item.targetId,
        targetType: item.targetType,
        details: item.details || {},
        ip: item.ip ?? null,
        createdAt: (item.createdAt instanceof Date
          ? item.createdAt
          : new Date(item.createdAt)
        ).toISOString(),
      })),
      nextCursor,
    };
  }
}
