import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { verifyWebhook } from '@clerk/express/webhooks';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/auth/public.decorator';
import { UsersService } from '../users/users.service';

/**
 * Clerk -> Pocketly sync. `@Public()` because Clerk itself is the caller and
 * carries no session; authenticity comes from the Svix signature instead,
 * verified against the exact original bytes (hence `rawBody: true` in main.ts)
 * before a single event is acted on.
 */
@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  async handleClerk(@Req() req: RawBodyRequest<Request>) {
    const event = await verifyWebhook(req, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    }).catch((error: unknown) => {
      this.logger.warn(
        `Rejected an unverified Clerk webhook: ${String(error)}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    });

    switch (event.type) {
      case 'user.updated': {
        const email =
          event.data.email_addresses?.find(
            (address) => address.id === event.data.primary_email_address_id,
          )?.email_address ?? event.data.email_addresses?.[0]?.email_address;
        const name =
          [event.data.first_name, event.data.last_name]
            .filter(Boolean)
            .join(' ') ||
          event.data.username ||
          undefined;

        await this.usersService.syncFromClerk(event.data.id, {
          email,
          name,
          imageUrl: event.data.image_url,
        });
        break;
      }

      case 'user.deleted': {
        if (event.data.id) {
          await this.usersService.eraseByClerkId(event.data.id);
        }
        break;
      }

      default:
        // Every other event type is deliberately ignored -- subscribing to
        // more in the Clerk dashboard should be a no-op here, not a 500.
        break;
    }

    return { received: true };
  }
}
