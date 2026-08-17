import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { GoalsModule } from '../goals/goals.module';
import { FinancialContextService } from './financial-context.service';
import { ForecastService } from './forecast.service';
import { HealthScoreService } from './health-score.service';
import { IntelligenceController } from './intelligence.controller';
import { SafeToSpendService } from './safe-to-spend.service';
import { ScenarioService } from './scenario.service';

/**
 * The projection surface, deliberately separate from `analysis`: analysis
 * reports what happened, intelligence projects what will.
 *
 * Every service here reads through `FinancialContextService` and computes with
 * the pure calculators in `common/finance` -- no service in this module issues
 * its own queries, which is what keeps Web, MCP and the workers arriving at
 * the same numbers.
 */
@Module({
  imports: [AccountsModule, GoalsModule],
  controllers: [IntelligenceController],
  providers: [
    FinancialContextService,
    ForecastService,
    SafeToSpendService,
    HealthScoreService,
    ScenarioService,
  ],
  exports: [
    FinancialContextService,
    ForecastService,
    SafeToSpendService,
    HealthScoreService,
    ScenarioService,
  ],
})
export class IntelligenceModule {}
