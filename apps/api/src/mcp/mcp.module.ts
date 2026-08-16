import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpConnectionsController } from './mcp-connections.controller';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';

@Module({
  imports: [
    AccountsModule,
    TransactionsModule,
    BudgetsModule,
    CategoriesModule,
    AnalysisModule,
    UsersModule,
  ],
  controllers: [McpController, McpConnectionsController],
  providers: [McpAuthGuard, McpServerFactory],
})
export class McpModule {}
