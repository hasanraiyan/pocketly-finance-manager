import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AnalysisService } from './analysis.service';
import { AnalysisQueryDto } from './dto/analysis-query.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get()
  getOverview(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getOverview(user, query);
  }

  @Get('categories')
  getCategoryBreakdown(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getCategoryBreakdown(user, query);
  }

  @Get('cash-flow')
  getCashFlow(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getCashFlow(user, query);
  }

  @Get('accounts')
  getAccountBreakdown(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getAccountBreakdown(user, query);
  }
}
