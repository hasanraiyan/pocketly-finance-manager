import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AnalysisService } from './analysis.service';
import {
  AccountBreakdownDto,
  CashFlowDto,
  CategoryBreakdownDto,
  OverviewDto,
} from './dto/analysis-response.dto';
import { AnalysisQueryDto } from './dto/analysis-query.dto';

@ApiTags('analysis')
@ApiBearerAuth('jwt')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get()
  @ApiOkResponse({ type: OverviewDto })
  getOverview(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getOverview(user, query);
  }

  @Get('categories')
  @ApiOkResponse({ type: CategoryBreakdownDto })
  getCategoryBreakdown(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getCategoryBreakdown(user, query);
  }

  @Get('cash-flow')
  @ApiOkResponse({ type: CashFlowDto })
  getCashFlow(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getCashFlow(user, query);
  }

  @Get('accounts')
  @ApiOkResponse({ type: AccountBreakdownDto })
  getAccountBreakdown(
    @CurrentUser() user: UserDocument,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysisService.getAccountBreakdown(user, query);
  }
}
