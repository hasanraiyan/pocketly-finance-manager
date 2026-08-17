import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import { FeedbackModule } from '../feedback/feedback.module';
import { Feedback, FeedbackSchema } from '../feedback/schemas/feedback.schema';
import { Goal, GoalSchema } from '../goals/schemas/goal.schema';
import {
  McpConnection,
  McpConnectionSchema,
} from '../mcp/schemas/mcp-connection.schema';
import {
  MoneyRule,
  MoneyRuleSchema,
} from '../money-rules/schemas/money-rule.schema';
import {
  Recurrence,
  RecurrenceSchema,
} from '../recurrences/schemas/recurrence.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AdminController } from './admin.controller';
import {
  AdminAuditLog,
  AdminAuditLogSchema,
} from './schemas/admin-audit-log.schema';

@Module({
  imports: [
    UsersModule,
    FeedbackModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: Goal.name, schema: GoalSchema },
      { name: MoneyRule.name, schema: MoneyRuleSchema },
      { name: Recurrence.name, schema: RecurrenceSchema },
      { name: McpConnection.name, schema: McpConnectionSchema },
      { name: Feedback.name, schema: FeedbackSchema },
      { name: AdminAuditLog.name, schema: AdminAuditLogSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminAnalyticsService, AdminAuditLogService],
  exports: [AdminAnalyticsService, AdminAuditLogService],
})
export class AdminModule {}
