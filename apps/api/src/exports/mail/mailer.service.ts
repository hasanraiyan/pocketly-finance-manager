import { Injectable, Logger } from '@nestjs/common';

/**
 * Mailer service — currently a **mock** that logs to console.
 *
 * TODO: Replace with Resend SDK before production.
 *
 * Implementation plan:
 *   pnpm --filter api add resend
 *
 *   import { Resend } from 'resend';
 *   const resend = new Resend(this.config.getOrThrow('RESEND_API_KEY'));
 *   await resend.emails.send({
 *     from:        'Pocketly <noreply@pocketly.app>',
 *     to:          opts.to,
 *     subject:     `Your Pocketly Report — ${opts.periodLabel}`,
 *     html:        buildHtml(opts.periodLabel),
 *     attachments: [{ filename: opts.filename, content: opts.pdfBuffer }],
 *   });
 *
 * Resend env var to add to .env:
 *   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  sendPdfReport(opts: {
    to: string;
    periodLabel: string;
    pdfBuffer: Buffer;
    filename: string;
  }): void {
    // ── MOCK ──────────────────────────────────────────────────────────────────
    // Logs what would be sent. Swap this block for the Resend call above.
    this.logger.log('─────────────────────────────────────────────');
    this.logger.log('📧 [MOCK MAILER] Would send PDF report email:');
    this.logger.log(`   To:       ${opts.to}`);
    this.logger.log(`   Subject:  Your Pocketly Report — ${opts.periodLabel}`);
    this.logger.log(`   File:     ${opts.filename}`);
    this.logger.log(
      `   Size:     ${(opts.pdfBuffer.length / 1024).toFixed(1)} KB`,
    );
    this.logger.log('─────────────────────────────────────────────');
    // ── END MOCK ──────────────────────────────────────────────────────────────
  }
}
