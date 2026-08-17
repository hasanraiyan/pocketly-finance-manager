import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  // A goal can track an account balance, and that balance must be the one
  // AccountsService computes -- a second implementation would drift.
  imports: [AccountsModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
