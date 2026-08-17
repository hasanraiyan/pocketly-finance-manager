import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockFeedbackModel: any;

  const mockUser = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'),
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'user',
  } as any;

  const otherUser = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    name: 'John Smith',
    email: 'john@example.com',
    role: 'user',
  } as any;

  beforeEach(() => {
    mockFeedbackModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };
    service = new FeedbackService(mockFeedbackModel);
  });

  describe('create', () => {
    it('creates a new feedback item with user information', async () => {
      const createdDoc = {
        _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'),
        userId: mockUser._id,
        userName: mockUser.name,
        userEmail: mockUser.email,
        type: 'feature_request',
        category: 'feature_request',
        title: 'Dark mode improvements',
        description: 'Please add high-contrast dark theme',
        rating: null,
        pageContext: '/settings',
        status: 'submitted',
        upvotes: [],
        upvoteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeedbackModel.create.mockResolvedValue(createdDoc);

      const result = await service.create(mockUser, {
        category: 'feature_request',
        title: 'Dark mode improvements',
        description: 'Please add high-contrast dark theme',
        pageContext: '/settings',
      });

      expect(mockFeedbackModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser._id,
          userName: mockUser.name,
          userEmail: mockUser.email,
          type: 'feature_request',
          title: 'Dark mode improvements',
        }),
      );
      expect(result.title).toBe('Dark mode improvements');
      expect(result.isOwner).toBe(true);
    });
  });

  describe('toggleUpvote', () => {
    it('adds an upvote when user has not upvoted yet', async () => {
      const feedbackId = new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3').toString();
      const existingDoc = {
        _id: feedbackId,
        upvotes: [],
        upvoteCount: 0,
      };

      mockFeedbackModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingDoc),
      });

      const updatedDoc = {
        _id: feedbackId,
        userId: otherUser._id,
        userName: otherUser.name,
        userEmail: otherUser.email,
        type: 'feature_request',
        category: 'feature_request',
        title: 'Dark mode',
        description: 'Add dark mode',
        status: 'submitted',
        upvotes: [mockUser._id],
        upvoteCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeedbackModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedDoc),
        }),
      });

      const result = await service.toggleUpvote(mockUser, feedbackId);
      expect(mockFeedbackModel.findByIdAndUpdate).toHaveBeenCalledWith(
        feedbackId,
        {
          $addToSet: { upvotes: mockUser._id },
          $inc: { upvoteCount: 1 },
        },
        { new: true },
      );
      expect(result.hasUpvoted).toBe(true);
      expect(result.upvoteCount).toBe(1);
    });

    it('removes an upvote when user has already upvoted', async () => {
      const feedbackId = new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3').toString();
      const existingDoc = {
        _id: feedbackId,
        upvotes: [mockUser._id],
        upvoteCount: 1,
      };

      mockFeedbackModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingDoc),
      });

      const updatedDoc = {
        _id: feedbackId,
        userId: otherUser._id,
        userName: otherUser.name,
        userEmail: otherUser.email,
        type: 'feature_request',
        category: 'feature_request',
        title: 'Dark mode',
        description: 'Add dark mode',
        status: 'submitted',
        upvotes: [],
        upvoteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeedbackModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedDoc),
        }),
      });

      const result = await service.toggleUpvote(mockUser, feedbackId);
      expect(mockFeedbackModel.findByIdAndUpdate).toHaveBeenCalledWith(
        feedbackId,
        {
          $pull: { upvotes: mockUser._id },
          $inc: { upvoteCount: -1 },
        },
        { new: true },
      );
      expect(result.hasUpvoted).toBe(false);
      expect(result.upvoteCount).toBe(0);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when a user attempts to delete someone else feedback', async () => {
      const feedbackId = new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3').toString();
      const existingDoc = {
        _id: feedbackId,
        userId: otherUser._id,
        save: jest.fn(),
      };

      mockFeedbackModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingDoc),
      });

      await expect(service.remove(mockUser, feedbackId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
