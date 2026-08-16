import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  ApiOkResponse,
  ApiTags,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { Connection, ConnectionStates } from 'mongoose';
import { Public } from './common/auth/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get('health')
  @ApiOkResponse({
    description: 'Liveness + readiness check',
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            database: { type: 'string', example: 'up' },
          },
        },
      },
    },
  })
  @ApiServiceUnavailableResponse({ description: 'The database is unreachable' })
  health(): { status: string; database: string } {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok', database: 'up' };
  }
}
