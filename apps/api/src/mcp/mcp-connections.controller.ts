import { Controller, Delete, Get, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { McpConnectionListDto } from './dto/connection-response.dto';
import { RevokeConnectionResponseDto } from './dto/revoke-connection-response.dto';
import { McpConnection } from './schemas/mcp-connection.schema';
import { McpRevocation } from './schemas/mcp-revocation.schema';

/**
 * Backs the Settings "Connections" section: what has connected to this
 * account, and the Disconnect button.
 *
 * Disconnect writes a revocation marker rather than only asking Clerk to drop
 * the grant, because a JWT-format access token already in a client's hands
 * stays valid until it expires. McpAuthGuard checks the marker on every
 * request, so disconnecting takes effect immediately.
 */
@ApiTags('mcp-connections')
@ApiBearerAuth('jwt')
@Controller('mcp-connections')
export class McpConnectionsController {
  constructor(
    @InjectModel(McpRevocation.name)
    private readonly revocationModel: Model<McpRevocation>,
    @InjectModel(McpConnection.name)
    private readonly connectionModel: Model<McpConnection>,
  ) {}

  @Get()
  @ApiOkResponse({ type: McpConnectionListDto })
  async list(@CurrentUser() user: UserDocument) {
    const connections = await this.connectionModel
      .find({ authUserId: user.authUserId })
      .sort({ lastSeenAt: -1 })
      .exec();

    return {
      items: connections.map((connection) => ({
        id: connection._id.toString(),
        clientId: connection.clientId,
        clientName: connection.clientName ?? connection.clientId,
        scopes: connection.scopes ?? [],
        createdAt: connection.createdAt.toISOString(),
        lastSeenAt: connection.lastSeenAt.toISOString(),
      })),
    };
  }

  @Delete(':clientId')
  @ApiOkResponse({ type: RevokeConnectionResponseDto })
  async revoke(
    @CurrentUser() user: UserDocument,
    @Param('clientId') clientId: string,
  ) {
    await Promise.all([
      this.revocationModel.create({
        authUserId: user.authUserId,
        clientId,
      }),
      this.connectionModel.deleteOne({
        authUserId: user.authUserId,
        clientId,
      }),
    ]);
    return { revoked: true };
  }
}
