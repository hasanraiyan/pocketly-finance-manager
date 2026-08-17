import { Types } from 'mongoose';
import type { Request } from 'express';
import { AdminController } from './admin.controller';

const mockRequest = { ip: '127.0.0.1' } as unknown as Request;

describe('AdminController', () => {
  let controller: AdminController;
  let mockAdminAnalyticsService: any;
  let mockFeedbackService: any;
  let mockAuditLogService: any;
  let mockUsersService: any;

  const mockAdmin = {
    _id: new Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'),
    name: 'Admin User',
    email: 'admin@pocketly.app',
    role: 'admin',
  } as any;

  beforeEach(() => {
    mockAdminAnalyticsService = {
      getPlatformAnalytics: jest.fn().mockResolvedValue({
        overview: { totalUsers: 100, activeUsers30d: 45 },
      }),
    };
    mockFeedbackService = {
      adminFindAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      adminUpdate: jest.fn().mockResolvedValue({
        _id: '123',
        status: 'planned',
        internalNotes: 'Top priority',
      }),
      adminRemove: jest.fn().mockResolvedValue({ _id: '123', title: 'Test' }),
    };
    mockAuditLogService = {
      log: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    mockUsersService = {
      findAllUsers: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      setUserRole: jest.fn().mockResolvedValue({ _id: 'user1', role: 'admin' }),
    };

    controller = new AdminController(
      mockAdminAnalyticsService,
      mockFeedbackService,
      mockAuditLogService,
      mockUsersService,
    );
  });

  it('fetches platform analytics', async () => {
    const result = await controller.getAnalytics();
    expect(mockAdminAnalyticsService.getPlatformAnalytics).toHaveBeenCalled();
    expect(result).toHaveProperty('overview');
  });

  it('updates feedback and writes audit log', async () => {
    const updateDto = {
      status: 'planned' as const,
      internalNotes: 'Top priority',
    };
    const result = await controller.updateFeedback(
      mockAdmin,
      '123',
      updateDto,
      mockRequest,
    );

    expect(mockFeedbackService.adminUpdate).toHaveBeenCalledWith(
      '123',
      updateDto,
    );
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: mockAdmin._id,
        action: 'feedback.update',
        targetId: '123',
      }),
    );
    expect(result.status).toBe('planned');
  });

  it('updates user role and writes audit log', async () => {
    const result = await controller.updateUserRole(
      mockAdmin,
      'user1',
      { role: 'admin' },
      mockRequest,
    );

    expect(mockUsersService.setUserRole).toHaveBeenCalledWith('user1', 'admin');
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.role_update',
        targetId: 'user1',
      }),
    );
    expect(result.role).toBe('admin');
  });
});
