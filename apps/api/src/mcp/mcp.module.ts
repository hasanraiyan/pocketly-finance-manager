import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { CategoriesModule } from '../categories/categories.module';
import { GoalsModule } from '../goals/goals.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { MoneyRulesModule } from '../money-rules/money-rules.module';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthService } from './oauth/oauth.service';
import {
  OAuthClient,
  OAuthClientSchema,
} from './oauth/schemas/oauth-client.schema';
import { OAuthCode, OAuthCodeSchema } from './oauth/schemas/oauth-code.schema';
import {
  OAuthConsent,
  OAuthConsentSchema,
} from './oauth/schemas/oauth-consent.schema';
import { RecurrencesModule } from '../recurrences/recurrences.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpConnectionsController } from './mcp-connections.controller';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';
import { WellKnownController } from './well-known.controller';
import {
  McpConnection,
  McpConnectionSchema,
} from './schemas/mcp-connection.schema';
import {
  McpRevocation,
  McpRevocationSchema,
} from './schemas/mcp-revocation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: McpRevocation.name, schema: McpRevocationSchema },
      { name: McpConnection.name, schema: McpConnectionSchema },
      { name: OAuthClient.name, schema: OAuthClientSchema },
      { name: OAuthCode.name, schema: OAuthCodeSchema },
      { name: OAuthConsent.name, schema: OAuthConsentSchema },
    ]),
    AuthModule,
    AccountsModule,
    TransactionsModule,
    BudgetsModule,
    CategoriesModule,
    AnalysisModule,
    UsersModule,
    RecurrencesModule,
    GoalsModule,
    IntelligenceModule,
    MoneyRulesModule,
  ],
  controllers: [
    McpController,
    McpConnectionsController,
    WellKnownController,
    OAuthController,
  ],
  providers: [McpAuthGuard, McpServerFactory, OAuthService],
})
export class McpModule {}
