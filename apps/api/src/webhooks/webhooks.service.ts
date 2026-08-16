import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import { verifyWebhook, WebhookEvent } from '@clerk/backend/webhooks';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async verifyClerkWebhook(
    req: RawBodyRequest<ExpressRequest>,
  ): Promise<WebhookEvent> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw request body');
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }

    const request = new Request('https://clerk-webhook.internal/', {
      method: 'POST',
      headers,
      body: new Uint8Array(req.rawBody),
    });

    return verifyWebhook(request, {
      signingSecret: this.configService.get<string>(
        'CLERK_WEBHOOK_SIGNING_SECRET',
      ),
    });
  }

  async handle(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'user.updated': {
        const {
          id,
          email_addresses,
          primary_email_address_id,
          first_name,
          last_name,
          image_url,
        } = event.data;
        const email =
          email_addresses.find((e) => e.id === primary_email_address_id)
            ?.email_address ?? email_addresses[0]?.email_address;
        const name =
          [first_name, last_name].filter(Boolean).join(' ') || undefined;

        await this.usersService.updateFromClerkWebhook(id, {
          email,
          name,
          imageUrl: image_url,
        });
        break;
      }
      case 'user.deleted': {
        if (event.data.id) {
          await this.usersService.deleteByClerkId(event.data.id);
        }
        break;
      }
      default:
        this.logger.log(
          `Ignoring unhandled Clerk webhook event: ${event.type}`,
        );
    }
  }
}
