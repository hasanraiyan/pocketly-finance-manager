import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { BullModule } from '@nestjs/bullmq';
import { ZodValidationPipe } from 'nestjs-zod';
import { AccountsModule } from './accounts/accounts.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BudgetsModule } from './budgets/budgets.module';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './common/database/database.module';
import { TransformInterceptor } from './common/http/transform.interceptor';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { ExportsModule } from './exports/exports.module';
import { FeedbackModule } from './feedback/feedback.module';
import { GoalsModule } from './goals/goals.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { McpModule } from './mcp/mcp.module';
import { MoneyRulesModule } from './money-rules/money-rules.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RecurrencesModule } from './recurrences/recurrences.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          // Hosted providers (Upstash, Redis Cloud, etc.) require TLS; local
          // Docker Redis doesn't support it at all, so this must stay opt-in
          // rather than always-on. Set REDIS_TLS=true for those providers.
          tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
        },
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    AnalysisModule,
    ExportsModule,
    GoalsModule,
    IntelligenceModule,
    McpModule,
    MoneyRulesModule,
    NotificationsModule,
    RecurrencesModule,
    FeedbackModule,
    AdminModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Aliased into APP_GUARD (rather than `useClass` inline) so tests can
    // override the token directly -- an inline useClass has none to target.
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
