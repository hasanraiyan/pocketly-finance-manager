import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/auth/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOkResponse({
    description: 'Liveness check',
    schema: { properties: { status: { type: 'string', example: 'ok' } } },
  })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
