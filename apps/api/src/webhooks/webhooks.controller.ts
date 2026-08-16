import { Controller, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/auth/public.decorator';
import { WebhookAckDto } from './dto/webhook-ack.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('clerk')
  @ApiOkResponse({ type: WebhookAckDto })
  async handleClerkWebhook(@Req() req: RawBodyRequest<Request>) {
    const event = await this.webhooksService.verifyClerkWebhook(req);
    await this.webhooksService.handle(event);
    return { received: true as const };
  }
}
