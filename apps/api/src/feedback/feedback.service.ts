import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { encodeIdCursor } from '../common/pagination/id-cursor';
import type { UserDocument } from '../users/schemas/user.schema';
import {
  AdminFeedbackQueryDto,
  AdminUpdateFeedbackDto,
  CreateFeedbackDto,
  FeedbackQueryDto,
} from './dto/feedback.dto';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}

  async create(user: UserDocument, dto: CreateFeedbackDto) {
    const feedbackType =
      dto.type ?? (dto.category === 'feature_request' ? 'feature_request' : 'feedback');

    const created = await this.feedbackModel.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      type: feedbackType,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      rating: dto.rating ?? null,
      pageContext: dto.pageContext ?? null,
      status: 'submitted',
      upvotes: [],
      upvoteCount: 0,
    });

    return this.serializeUserFeedback(created, user._id);
  }

  async findAll(user: UserDocument, query: FeedbackQueryDto) {
    const filter: Record<string, any> = { deletedAt: null };

    if (query.onlyMine) {
      filter.userId = user._id;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const sort: Record<string, 1 | -1> =
      query.sortBy === 'upvotes'
        ? { upvoteCount: -1, _id: -1 }
        : { _id: -1 };

    const limit = query.limit ?? 20;

    const items = await this.feedbackModel
      .find(filter)
      .sort(sort)
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? encodeIdCursor(page[page.length - 1]._id as Types.ObjectId)
      : null;

    return {
      items: page.map((item) =>
        this.serializeUserFeedback(item as any, user._id),
      ),
      nextCursor,
    };
  }

  async findOne(user: UserDocument, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Feedback not found');
    }

    const item = await this.feedbackModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec();

    if (!item) {
      throw new NotFoundException('Feedback not found');
    }

    return this.serializeUserFeedback(item as any, user._id);
  }

  async toggleUpvote(user: UserDocument, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Feedback not found');
    }

    const existing = await this.feedbackModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!existing) {
      throw new NotFoundException('Feedback not found');
    }

    const userIdStr = user._id.toString();
    const alreadyUpvoted = (existing.upvotes || []).some((uId) => uId.toString() === userIdStr);

    let updated: any;

    if (alreadyUpvoted) {
      updated = await this.feedbackModel
        .findByIdAndUpdate(
          id,
          {
            $pull: { upvotes: user._id },
            $inc: { upvoteCount: -1 },
          },
          { new: true },
        )
        .lean()
        .exec();
    } else {
      updated = await this.feedbackModel
        .findByIdAndUpdate(
          id,
          {
            $addToSet: { upvotes: user._id },
            $inc: { upvoteCount: 1 },
          },
          { new: true },
        )
        .lean()
        .exec();
    }

    if (!updated) {
      throw new NotFoundException('Feedback not found');
    }

    return this.serializeUserFeedback(updated, user._id);
  }

  async remove(user: UserDocument, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Feedback not found');
    }

    const item = await this.feedbackModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!item) {
      throw new NotFoundException('Feedback not found');
    }

    if (user.role !== 'admin' && !item.userId.equals(user._id)) {
      throw new ForbiddenException('You can only delete your own feedback');
    }

    item.deletedAt = new Date();
    await item.save();

    return this.serializeUserFeedback(item, user._id);
  }

  // Admin Methods

  async adminFindAll(query: AdminFeedbackQueryDto) {
    const filter: Record<string, any> = { deletedAt: null };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { userName: searchRegex },
        { userEmail: searchRegex },
      ];
    }

    const sort: Record<string, 1 | -1> =
      query.sortBy === 'upvotes'
        ? { upvoteCount: -1, _id: -1 }
        : { _id: -1 };

    const limit = query.limit ?? 20;

    const items = await this.feedbackModel
      .find(filter)
      .sort(sort)
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? encodeIdCursor(page[page.length - 1]._id as Types.ObjectId)
      : null;

    return {
      items: page.map((item) => this.serializeAdminFeedback(item as any)),
      nextCursor,
    };
  }

  async adminUpdate(id: string, dto: AdminUpdateFeedbackDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Feedback not found');
    }

    const item = await this.feedbackModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!item) {
      throw new NotFoundException('Feedback not found');
    }

    if (dto.category) item.category = dto.category;
    if (dto.status) item.status = dto.status;
    if (dto.internalNotes !== undefined) item.internalNotes = dto.internalNotes;
    if (dto.adminResponse !== undefined) item.adminResponse = dto.adminResponse;

    await item.save();
    return this.serializeAdminFeedback(item);
  }

  async adminRemove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Feedback not found');
    }

    const item = await this.feedbackModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!item) {
      throw new NotFoundException('Feedback not found');
    }

    item.deletedAt = new Date();
    await item.save();

    return this.serializeAdminFeedback(item);
  }

  private serializeUserFeedback(
    item: any,
    currentUserId: Types.ObjectId,
  ) {
    const userIdStr = currentUserId.toString();
    const upvotes = (item.upvotes || []).map((id: any) => id.toString());
    const itemUserIdStr = (item.userId?._id ?? item.userId ?? '').toString();
    const createdAt = item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString();
    const updatedAt = item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString();

    return {
      _id: (item._id ?? '').toString(),
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      rating: item.rating ?? null,
      pageContext: item.pageContext ?? null,
      status: item.status,
      upvoteCount: item.upvoteCount ?? 0,
      hasUpvoted: upvotes.includes(userIdStr),
      adminResponse: item.adminResponse ?? null,
      createdAt,
      updatedAt,
      isOwner: itemUserIdStr === userIdStr,
    };
  }

  private serializeAdminFeedback(item: any) {
    const createdAt = item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString();
    const updatedAt = item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString();

    return {
      _id: (item._id ?? '').toString(),
      userId: (item.userId?._id ?? item.userId ?? '').toString(),
      userName: item.userName,
      userEmail: item.userEmail,
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      rating: item.rating ?? null,
      pageContext: item.pageContext ?? null,
      status: item.status,
      upvoteCount: item.upvoteCount ?? 0,
      hasUpvoted: false,
      internalNotes: item.internalNotes ?? null,
      adminResponse: item.adminResponse ?? null,
      createdAt,
      updatedAt,
      isOwner: false,
    };
  }
}
