jest.mock('@clerk/backend/webhooks', () => ({
  verifyWebhook: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { UsersService } from '../users/users.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let webhooksService: WebhooksService;
  let usersService: {
    updateFromClerkWebhook: jest.Mock;
    deleteByClerkId: jest.Mock;
  };
  const verifyWebhookMock = verifyWebhook as jest.Mock;

  beforeEach(() => {
    verifyWebhookMock.mockReset();
    usersService = {
      updateFromClerkWebhook: jest.fn().mockResolvedValue(undefined),
      deleteByClerkId: jest.fn().mockResolvedValue(undefined),
    };
    const configService = {
      get: jest.fn().mockReturnValue('whsec_test'),
    } as unknown as ConfigService;
    webhooksService = new WebhooksService(
      usersService as unknown as UsersService,
      configService,
    );
  });

  describe('verifyClerkWebhook', () => {
    it('rejects a request with no raw body', async () => {
      const req = { headers: {}, rawBody: undefined } as never;
      await expect(
        webhooksService.verifyClerkWebhook(req),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(verifyWebhookMock).not.toHaveBeenCalled();
    });

    it('builds a Request from the raw body/headers and delegates to Clerk verification', async () => {
      verifyWebhookMock.mockResolvedValue({ type: 'user.updated', data: {} });
      const req = {
        headers: {
          'svix-id': 'msg_1',
          'svix-signature': 'sig',
          accept: ['a', 'b'],
        },
        rawBody: Buffer.from('{"type":"user.updated"}'),
      } as never;

      await webhooksService.verifyClerkWebhook(req);

      expect(verifyWebhookMock).toHaveBeenCalledTimes(1);
      const [request, options] = verifyWebhookMock.mock.calls[0] as [
        Request,
        { signingSecret?: string },
      ];
      expect(request.headers.get('svix-id')).toBe('msg_1');
      expect(request.headers.get('accept')).toBe('a, b');
      expect(await request.text()).toBe('{"type":"user.updated"}');
      expect(options.signingSecret).toBe('whsec_test');
    });
  });

  describe('handle', () => {
    it('syncs the profile on user.updated, preferring the primary email', async () => {
      await webhooksService.handle({
        type: 'user.updated',
        data: {
          id: 'user_1',
          email_addresses: [
            { id: 'email_2', email_address: 'secondary@b.com' },
            { id: 'email_1', email_address: 'primary@b.com' },
          ],
          primary_email_address_id: 'email_1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          image_url: 'https://example.com/a.png',
        },
      } as never);

      expect(usersService.updateFromClerkWebhook).toHaveBeenCalledWith(
        'user_1',
        {
          email: 'primary@b.com',
          name: 'Ada Lovelace',
          imageUrl: 'https://example.com/a.png',
        },
      );
    });

    it('erases data on user.deleted', async () => {
      await webhooksService.handle({
        type: 'user.deleted',
        data: { id: 'user_1', object: 'user', deleted: true },
      } as never);

      expect(usersService.deleteByClerkId).toHaveBeenCalledWith('user_1');
    });

    it('ignores event types it does not handle', async () => {
      await webhooksService.handle({
        type: 'session.created',
        data: {},
      } as never);

      expect(usersService.updateFromClerkWebhook).not.toHaveBeenCalled();
      expect(usersService.deleteByClerkId).not.toHaveBeenCalled();
    });
  });
});
