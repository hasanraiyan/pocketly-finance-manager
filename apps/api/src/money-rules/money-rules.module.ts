import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { GoalsModule } from '../goals/goals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MoneyRulesController } from './money-rules.controller';
import {
  MONEY_RULES_QUEUE,
  MoneyRulesProcessor,
} from './money-rules.processor';
import { MoneyRulesScheduler } from './money-rules.scheduler';
import { MoneyRulesService } from './money-rules.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: MONEY_RULES_QUEUE }),
    // The evaluator reads balances and goal progress through the same
    // services the API uses, and delivers through the existing dispatcher --
    // a rule alert is an ordinary notification, not a second channel.
    AccountsModule,
    GoalsModule,
    NotificationsModule,
  ],
  controllers: [MoneyRulesController],
  providers: [MoneyRulesService, MoneyRulesProcessor, MoneyRulesScheduler],
  exports: [MoneyRulesService],
})
export class MoneyRulesModule {}
