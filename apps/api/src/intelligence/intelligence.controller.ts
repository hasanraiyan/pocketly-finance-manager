import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { ForecastQueryDto, ScenarioDto } from './dto/intelligence-query.dto';
import {
  ForecastDto,
  HealthDto,
  SafeToSpendDto,
  ScenarioResultDto,
} from './dto/intelligence-response.dto';
import { ForecastService } from './forecast.service';
import { HealthScoreService } from './health-score.service';
import { SafeToSpendService } from './safe-to-spend.service';
import { ScenarioService } from './scenario.service';

@ApiTags('intelligence')
@ApiBearerAuth('jwt')
@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly forecast: ForecastService,
    private readonly safeToSpend: SafeToSpendService,
    private readonly health: HealthScoreService,
    private readonly scenarios: ScenarioService,
  ) {}

  @Get('forecast')
  @ApiOkResponse({ type: ForecastDto })
  getForecast(
    @CurrentUser() user: UserDocument,
    @Query() query: ForecastQueryDto,
  ) {
    return this.forecast.forecast(user, query.horizon);
  }

  @Get('safe-to-spend')
  @ApiOkResponse({ type: SafeToSpendDto })
  getSafeToSpend(@CurrentUser() user: UserDocument) {
    return this.safeToSpend.safeToSpend(user);
  }

  @Get('health')
  @ApiOkResponse({ type: HealthDto })
  getHealth(@CurrentUser() user: UserDocument) {
    return this.health.health(user);
  }

  /**
   * A POST despite reading nothing but the user's own data: the scenario is a
   * structured body, and cramming one into a query string would make every
   * what-if a URL-encoding problem.
   */
  @Post('scenario')
  @ApiOkResponse({ type: ScenarioResultDto })
  simulate(@CurrentUser() user: UserDocument, @Body() dto: ScenarioDto) {
    return this.scenarios.simulate(user, dto);
  }
}
