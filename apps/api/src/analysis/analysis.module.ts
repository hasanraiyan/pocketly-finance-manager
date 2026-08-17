import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { InsightsService } from './insights.service';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, InsightsService],
  exports: [AnalysisService, InsightsService],
})
export class AnalysisModule {}
