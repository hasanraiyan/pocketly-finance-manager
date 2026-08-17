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
import { BudgetsModule } from './budgets/budgets.module';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './common/database/database.module';
import { TransformInterceptor } from './common/http/transform.interceptor';
import { ClerkAuthGuard } from './common/auth/clerk-auth.guard';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { ExportsModule } from './exports/exports.module';
import { McpModule } from './mcp/mcp.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RecurrencesModule } from './recurrences/recurrences.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

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
    UsersModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    AnalysisModule,
    ExportsModule,
    McpModule,
    NotificationsModule,
    RecurrencesModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Registered as a provider and aliased into APP_GUARD (rather than
    // `useClass` inline) so e2e tests can swap it for a stand-in via
    // `overrideProvider(ClerkAuthGuard)` -- an inline useClass has no token
    // to override.
    ClerkAuthGuard,
    { provide: APP_GUARD, useExisting: ClerkAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
