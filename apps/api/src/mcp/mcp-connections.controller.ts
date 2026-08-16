import { Controller, Delete, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { RevokeConnectionResponseDto } from './dto/revoke-connection-response.dto';
import { McpRevocation } from './schemas/mcp-revocation.schema';

/**
 * Instant-revocation companion to the Settings page's "Disconnect" button.
 * Deleting the OAuth consent (done separately, via Better Auth's own
 * client-side endpoint) only blocks a *future* re-authorization -- it
 * doesn't touch already-issued JWT access tokens, which stay valid until
 * their own expiry. This records a revocation marker that McpAuthGuard
 * checks on every request, rejecting any token issued before it.
 */
@ApiTags('mcp-connections')
@ApiBearerAuth('jwt')
@Controller('mcp-connections')
export class McpConnectionsController {
  constructor(
    @InjectModel(McpRevocation.name)
    private readonly revocationModel: Model<McpRevocation>,
  ) {}

  @Delete(':clientId')
  @ApiOkResponse({ type: RevokeConnectionResponseDto })
  async revoke(
    @CurrentUser() user: UserDocument,
    @Param('clientId') clientId: string,
  ) {
    await this.revocationModel.create({
      authUserId: user.authUserId,
      clientId,
    });
    return { revoked: true };
  }
}
