import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { format } from 'date-fns';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { toMajorUnits } from '../common/finance/format-money';
import { resolveAnalysisRange } from '../common/finance/resolve-analysis-range';
import type { AnalysisPeriod } from '../common/finance/resolve-analysis-range';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { MailerService } from './mail/mailer.service';
import {
  renderPocketlyReport,
  type ReportCategory,
} from './templates/report.template';

// ---------------------------------------------------------------------------
// Queue name — shared between ExportsService (producer) and ExportProcessor (consumer)
// ---------------------------------------------------------------------------
export const EXPORTS_QUEUE = 'exports';

// ---------------------------------------------------------------------------
// Job payload shape
// ---------------------------------------------------------------------------
export interface ExportJobPayload {
  userId: string;
  email: string;
  userName: string;
  currency: string;
  timezone: string;
  period: AnalysisPeriod;
  from?: Date;
  to?: Date;
}

// ---------------------------------------------------------------------------
// BullMQ worker
// ---------------------------------------------------------------------------
@Processor(EXPORTS_QUEUE)
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly txModel: Model<TransactionDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly mailer: MailerService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {
    super();
  }

  async process(job: Job<ExportJobPayload>): Promise<void> {
    this.logger.log(
      `Processing export job ${job.id} for user ${job.data.userId}`,
    );

    const { userId, email, userName, currency, timezone, period, from, to } =
      job.data;

    const userObjectId = new Types.ObjectId(userId);

    // 1. Resolve date range
    const range = resolveAnalysisRange(period, timezone, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    const dateMatch = { $gte: range.start, $lte: range.end };
    const baseFilter = { userId: userObjectId, deletedAt: null };

    // 2. Fetch everything in parallel
    const [overviewRows, categoryRows, transactions, accounts, categories] =
      await Promise.all([
        // Income / expense totals
        this.txModel.aggregate<{ _id: string; total: number }>([
          {
            $match: {
              ...baseFilter,
              type: { $in: ['income', 'expense'] },
              date: dateMatch,
            },
          },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]),

        // Category breakdown aggregate
        this.txModel.aggregate<{
          _id: { type: string; categoryId: Types.ObjectId };
          total: number;
        }>([
          {
            $match: {
              ...baseFilter,
              type: { $in: ['income', 'expense'] },
              date: dateMatch,
            },
          },
          {
            $group: {
              _id: { type: '$type', categoryId: '$categoryId' },
              total: { $sum: '$amount' },
            },
          },
          { $sort: { total: -1 } },
        ]),

        // All transactions (no limit — export is complete)
        this.txModel
          .find({ ...baseFilter, date: dateMatch })
          .sort({ date: -1 })
          .lean()
          .exec(),

        // Lookup maps
        this.accountModel.find(baseFilter).lean().exec(),
        this.categoryModel.find(baseFilter).lean().exec(),
      ]);

    // 3. Build lookup maps
    const accountMap = new Map(accounts.map((a) => [a._id.toString(), a.name]));
    const categoryMap = new Map(
      categories.map((c) => [c._id.toString(), c.name]),
    );

    // 4. Compute overview
    const income = overviewRows.find((r) => r._id === 'income')?.total ?? 0;
    const expense = overviewRows.find((r) => r._id === 'expense')?.total ?? 0;

    // 5. Build category arrays with percentages
    const buildCategories = (type: string): ReportCategory[] => {
      const rows = categoryRows.filter((r) => r._id.type === type);
      const total = rows.reduce((s, r) => s + r.total, 0);
      return rows.map((r) => ({
        name: categoryMap.get(r._id.categoryId?.toString()) ?? 'Uncategorised',
        type,
        total: r.total,
        percentage: total > 0 ? (r.total / total) * 100 : 0,
      }));
    };

    // 6. Format period label
    const periodLabel = this.formatPeriodLabel(period, range.start, range.end);


    // 7. Handle CSV format
    if (job.name === 'generate-csv') {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvRows = [
        [
          'Date',
          'Type',
          'Amount',
          'Currency',
          'Category',
          'Account',
          'To Account',
          'Description',
          'Note',
        ].join(','),
      ];

      for (const tx of transactions) {
        const row = [
          escapeCsv(format(new Date(tx.date), 'yyyy-MM-dd HH:mm:ss')),
          escapeCsv(tx.type),
          // Unquoted so spreadsheets read the column as a number, and in
          // major units so it reads as actual money.
          toMajorUnits(tx.amount),
          escapeCsv(currency),
          escapeCsv(
            categoryMap.get(tx.categoryId?.toString() ?? '') ?? 'Uncategorised',
          ),
          escapeCsv(accountMap.get(tx.accountId?.toString() ?? '') ?? ''),
          escapeCsv(accountMap.get(tx.toAccountId?.toString() ?? '') ?? ''),
          escapeCsv(tx.description ?? ''),
          escapeCsv(tx.note ?? ''),
        ];
        csvRows.push(row.join(','));
      }

      const csvBuffer = Buffer.from(csvRows.join('\r\n'), 'utf-8');
      const filename = `pocketly-transactions-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;

      await this.mailer.sendCsvReport({
        to: email,
        periodLabel,
        csvBuffer,
        filename,
      });

      void this.notificationDispatcher.sendMonthlyReportNotification(
        userObjectId,
        `${periodLabel} (CSV)`,
      );

      this.logger.log(
        `Export CSV job ${job.id} complete — emailed ${filename} to ${email}`,
      );
      return;
    }

    // 8. Render PDF
    this.logger.log(
      `Rendering PDF for job ${job.id} — ${transactions.length} transactions`,
    );

    const pdfBuffer = await renderPocketlyReport({
      userName,
      userEmail: email,
      currency,
      periodLabel,
      generatedAt: format(new Date(), 'dd MMM yyyy, HH:mm'),
      overview: { income, expense, net: income - expense },
      expenseCategories: buildCategories('expense'),
      incomeCategories: buildCategories('income'),
      transactions: transactions.map((tx) => ({
        date: format(new Date(tx.date), 'dd MMM yy'),
        description: tx.description ?? '',
        category: categoryMap.get(tx.categoryId?.toString() ?? '') ?? '',
        account: accountMap.get(tx.accountId?.toString() ?? '') ?? '',
        type: tx.type,
        amount: tx.amount,
      })),
    });

    // 8. Email the PDF
    const filename = `pocketly-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    await this.mailer.sendPdfReport({
      to: email,
      periodLabel,
      pdfBuffer,
      filename,
    });

    // 9. Send Push + In-App Notification
    void this.notificationDispatcher.sendMonthlyReportNotification(
      userObjectId,
      periodLabel,
    );

    this.logger.log(
      `Export job ${job.id} complete — emailed ${filename} to ${email}`,
    );
  }

  private formatPeriodLabel(period: string, start: Date, end: Date): string {
    const f = (d: Date) => format(d, 'dd MMM yyyy');
    const labels: Record<string, string> = {
      '7d': 'Last 7 Days',
      this_month: 'This Month',
      last_month: 'Last Month',
      '3m': 'Last 3 Months',
      '6m': 'Last 6 Months',
      this_year: 'This Year',
    };
    return labels[period] ?? `${f(start)} – ${f(end)}`;
  }
}
