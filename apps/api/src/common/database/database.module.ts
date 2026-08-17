import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../../accounts/schemas/account.schema';
import { Budget, BudgetSchema } from '../../budgets/schemas/budget.schema';
import {
  Category,
  CategorySchema,
} from '../../categories/schemas/category.schema';
import {
  McpConnection,
  McpConnectionSchema,
} from '../../mcp/schemas/mcp-connection.schema';
import {
  McpRevocation,
  McpRevocationSchema,
} from '../../mcp/schemas/mcp-revocation.schema';
import {
  Transaction,
  TransactionSchema,
} from '../../transactions/schemas/transaction.schema';
import { User, UserSchema } from '../../users/schemas/user.schema';

/**
 * Registers the database connection and every Mongoose model exactly once,
 * so domain modules that need another domain's model (e.g. Transactions
 * needing Account) don't re-declare `forFeature` and risk a duplicate model
 * registration or a circular module import.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: McpRevocation.name, schema: McpRevocationSchema },
      { name: McpConnection.name, schema: McpConnectionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
