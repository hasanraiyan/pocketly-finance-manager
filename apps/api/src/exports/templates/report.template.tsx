import React from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportTransaction {
  date: string;
  description: string;
  category: string;
  account: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
}

export interface ReportCategory {
  name: string;
  type: string;
  total: number;
  percentage: number;
}

export interface ReportData {
  userName: string;
  userEmail: string;
  currency: string;
  periodLabel: string;
  generatedAt: string;
  overview: {
    income: number;
    expense: number;
    net: number;
  };
  expenseCategories: ReportCategory[];
  incomeCategories: ReportCategory[];
  transactions: ReportTransaction[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BRAND_GREEN = '#1a3c2e';
const BRAND_LIGHT = '#f0fdf4';
const MUTED = '#6b7280';
const INCOME_COLOR = '#059669';
const EXPENSE_COLOR = '#dc2626';
const BORDER_COLOR = '#e5e7eb';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111827',
    backgroundColor: '#ffffff',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_GREEN,
  },
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  periodLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
  },
  metaLine: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingBottom: 5,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },

  // ── Summary Cards ────────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    backgroundColor: BRAND_LIGHT,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  summaryCardLabel: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCardAmount: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Categories ───────────────────────────────────────────────────────────
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND_GREEN,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 9,
  },
  categoryAmount: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 70,
    textAlign: 'right',
  },
  categoryPct: {
    fontSize: 8,
    color: MUTED,
    width: 35,
    textAlign: 'right',
  },

  // ── Transaction Table ─────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: '5 4',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '4 4',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colDate: { width: '12%', fontSize: 8 },
  colDesc: { width: '28%', fontSize: 8 },
  colCat: { width: '20%', fontSize: 8 },
  colAcc: { width: '20%', fontSize: 8 },
  colAmt: {
    width: '20%',
    fontSize: 8,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  colHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: MUTED,
  },
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header({ data }: { data: ReportData }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brandName}>Pocketly</Text>
        <Text style={styles.brandTagline}>Personal Finance Report</Text>
      </View>
      <View style={styles.headerMeta}>
        <Text style={styles.periodLabel}>{data.periodLabel}</Text>
        <Text style={styles.metaLine}>{data.userName}</Text>
        <Text style={styles.metaLine}>{data.userEmail}</Text>
        <Text style={styles.metaLine}>Generated {data.generatedAt}</Text>
      </View>
    </View>
  );
}

function SummarySection({ data }: { data: ReportData }) {
  const { overview, currency } = data;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Financial Summary</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Income</Text>
          <Text style={[styles.summaryCardAmount, { color: INCOME_COLOR }]}>
            {fmt(overview.income, currency)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Expenses</Text>
          <Text style={[styles.summaryCardAmount, { color: EXPENSE_COLOR }]}>
            {fmt(overview.expense, currency)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Net Cash Flow</Text>
          <Text
            style={[
              styles.summaryCardAmount,
              { color: overview.net >= 0 ? INCOME_COLOR : EXPENSE_COLOR },
            ]}
          >
            {overview.net >= 0 ? '+' : ''}
            {fmt(overview.net, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CategorySection({
  title,
  categories,
  currency,
  color,
}: {
  title: string;
  categories: ReportCategory[];
  currency: string;
  color: string;
}) {
  if (categories.length === 0) return null;
  const topCategories = categories.slice(0, 8);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {topCategories.map((cat, i) => (
        <View key={i} style={styles.categoryRow}>
          <View
            style={[
              styles.categoryBar,
              {
                width: `${Math.max(cat.percentage * 0.6, 2)}%`,
                backgroundColor: color,
              },
            ]}
          />
          <Text style={styles.categoryName}>{cat.name}</Text>
          <Text style={[styles.categoryAmount, { color }]}>
            {fmt(cat.total, currency)}
          </Text>
          <Text style={styles.categoryPct}>{cat.percentage.toFixed(1)}%</Text>
        </View>
      ))}
    </View>
  );
}

function TransactionTable({ data }: { data: ReportData }) {
  const shown = data.transactions.slice(0, 100);
  const hidden = data.transactions.length - shown.length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Transactions ({data.transactions.length})
      </Text>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colDate, styles.colHeader]}>Date</Text>
        <Text style={[styles.colDesc, styles.colHeader]}>Description</Text>
        <Text style={[styles.colCat, styles.colHeader]}>Category</Text>
        <Text style={[styles.colAcc, styles.colHeader]}>Account</Text>
        <Text style={[styles.colAmt, styles.colHeader]}>Amount</Text>
      </View>

      {/* Rows */}
      {shown.map((tx, i) => (
        <View
          key={i}
          style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
        >
          <Text style={styles.colDate}>{tx.date}</Text>
          <Text style={styles.colDesc}>{tx.description || '—'}</Text>
          <Text style={styles.colCat}>{tx.category || '—'}</Text>
          <Text style={styles.colAcc}>{tx.account}</Text>
          <Text
            style={[
              styles.colAmt,
              {
                color:
                  tx.type === 'income'
                    ? INCOME_COLOR
                    : tx.type === 'expense'
                      ? EXPENSE_COLOR
                      : MUTED,
              },
            ]}
          >
            {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
            {fmt(tx.amount, data.currency)}
          </Text>
        </View>
      ))}

      {hidden > 0 && (
        <Text style={{ marginTop: 6, fontSize: 8, color: MUTED }}>
          + {hidden} more transactions not shown in this report.
        </Text>
      )}
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Pocketly — pocketly.app</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

function PocketlyReport(data: ReportData) {
  return (
    <Document
      title={`Pocketly Report — ${data.periodLabel}`}
      author="Pocketly"
      subject="Personal Finance Report"
    >
      <Page size="A4" style={styles.page}>
        <Header data={data} />
        <SummarySection data={data} />

        {/* Two-column categories */}
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <CategorySection
              title="Top Expenses by Category"
              categories={data.expenseCategories}
              currency={data.currency}
              color={EXPENSE_COLOR}
            />
          </View>
          {data.incomeCategories.length > 0 && (
            <View style={{ flex: 1 }}>
              <CategorySection
                title="Income Sources"
                categories={data.incomeCategories}
                currency={data.currency}
                color={INCOME_COLOR}
              />
            </View>
          )}
        </View>

        <TransactionTable data={data} />
        <Footer />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders the Pocketly report document to a PDF Buffer.
 *
 * The explicit cast is needed because TypeScript infers the element type as
 * FunctionComponentElement<ReportData> but react-pdf's renderToBuffer expects
 * ReactElement<DocumentProps>. The runtime type is correct — PocketlyReport
 * returns a <Document> root — so this cast is safe.
 */
export async function renderPocketlyReport(data: ReportData): Promise<Buffer> {
  const element = (
    <PocketlyReport {...data} />
  ) as React.ReactElement<DocumentProps>;
  const uint8 = await renderToBuffer(element);
  return Buffer.from(uint8);
}
