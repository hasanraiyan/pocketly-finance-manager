import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress =
      config.get<string>('RESEND_FROM_EMAIL') ??
      'Pocketly <onboarding@resend.dev>';
  }

  async sendPdfReport(opts: {
    to: string;
    periodLabel: string;
    pdfBuffer: Buffer;
    filename: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY is not set -- skipping email to ${opts.to} ` +
          `(${opts.filename}, ${(opts.pdfBuffer.length / 1024).toFixed(1)} KB). ` +
          'Set RESEND_API_KEY to actually send export emails.',
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: opts.to,
      subject: `Your Pocketly report — ${opts.periodLabel}`,
      html: this.buildHtml(opts.periodLabel),
      attachments: [{ filename: opts.filename, content: opts.pdfBuffer }],
    });

    if (error) {
      this.logger.error(
        `Failed to send export email to ${opts.to}: ${error.message}`,
      );
      // Lets the caller's BullMQ retry/backoff policy handle this instead of
      // treating a failed send as a completed job.
      throw new Error(`Failed to send export email: ${error.message}`);
    }

    this.logger.log(`Sent export email to ${opts.to} (${opts.filename})`);
  }

  async sendCsvReport(opts: {
    to: string;
    periodLabel: string;
    csvBuffer: Buffer;
    filename: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY is not set -- skipping CSV email to ${opts.to} ` +
          `(${opts.filename}, ${(opts.csvBuffer.length / 1024).toFixed(1)} KB). ` +
          'Set RESEND_API_KEY to actually send export emails.',
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: opts.to,
      subject: `Your Pocketly transactions CSV — ${opts.periodLabel}`,
      html: this.buildCsvHtml(opts.periodLabel),
      attachments: [{ filename: opts.filename, content: opts.csvBuffer }],
    });

    if (error) {
      this.logger.error(
        `Failed to send CSV export email to ${opts.to}: ${error.message}`,
      );
      throw new Error(`Failed to send CSV export email: ${error.message}`);
    }

    this.logger.log(`Sent CSV export email to ${opts.to} (${opts.filename})`);
  }

  private buildHtml(periodLabel: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">Your Pocketly report</h1>
        <p style="font-size: 14px; color: #555; line-height: 1.5; margin: 0;">
          Attached is your financial report for <strong>${periodLabel}</strong>.
        </p>
        <p style="font-size: 12px; color: #999; margin: 32px 0 0;">
          Didn't request this? You can safely ignore this email.
        </p>
      </div>
    `.trim();
  }

  private buildCsvHtml(periodLabel: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">Your Pocketly transactions export</h1>
        <p style="font-size: 14px; color: #555; line-height: 1.5; margin: 0;">
          Attached is your raw transactions CSV export for <strong>${periodLabel}</strong>. You can open this file in Excel, Google Sheets, or any accounting software.
        </p>
        <p style="font-size: 12px; color: #999; margin: 32px 0 0;">
          Didn't request this? You can safely ignore this email.
        </p>
      </div>
    `.trim();
  }
}
