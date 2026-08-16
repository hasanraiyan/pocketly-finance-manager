import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiAcceptedResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { ExportQueryDto } from './dto/export.dto';
import { ExportQueuedDto } from './dto/export-response.dto';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth('jwt')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('pdf')
  @HttpCode(202)
  // 5 export requests per minute per user — PDF generation is expensive
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiAcceptedResponse({
    type: ExportQueuedDto,
    description:
      'Export job queued. The PDF will be generated in the background and emailed to the user.',
  })
  async requestPdfExport(
    @CurrentUser() user: UserDocument,
    @Body() dto: ExportQueryDto,
  ) {
    const { jobId } = await this.exportsService.queuePdfExport(
      user,
      dto.period,
      dto.from,
      dto.to,
    );

    return {
      jobId,
      message: `Your report is being generated and will be sent to ${user.email}.`,
    };
  }
}
