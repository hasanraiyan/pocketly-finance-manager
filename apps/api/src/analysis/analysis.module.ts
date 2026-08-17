import { Module } from '@nestjs/common';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { InsightsService } from './insights.service';

@Module({
  // Insights now reason about the forecast and about goals, both of which are
  // computed from the shared financial context rather than re-queried here.
  imports: [IntelligenceModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, InsightsService],
  exports: [AnalysisService, InsightsService],
})
export class AnalysisModule {}
