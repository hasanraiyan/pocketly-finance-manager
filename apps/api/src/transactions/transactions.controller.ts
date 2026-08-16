import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import {
  TransactionDto,
  TransactionListDto,
} from './dto/transaction-response.dto';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth('jwt')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiCreatedResponse({ type: TransactionDto })
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user._id, dto);
  }

  @Get()
  @ApiOkResponse({ type: TransactionListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.findAll(user._id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: TransactionDto })
  findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.transactionsService.findOne(user._id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TransactionDto })
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user._id, id, dto);
  }

  @Patch(':id/restore')
  @ApiOkResponse({ type: TransactionDto })
  restore(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.transactionsService.restore(user._id, id);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: TransactionDto,
    description: 'The soft-deleted transaction',
  })
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.transactionsService.remove(user._id, id);
  }
}
