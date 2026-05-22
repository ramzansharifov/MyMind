import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import { StatCard } from '../../shared/components/StatCard';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import { currentBalance, totalByType, visibleTransactions } from './financeUtils';
import type { FinanceData, FinanceTransaction } from './types';
import '../../styles/modules/charts.css';

interface FinanceChartsSectionProps {
  data: FinanceData;
  currency: string;
}

export function FinanceChartsSection({ data, currency }: FinanceChartsSectionProps) {
  const { t } = useI18n();
  const transactions = visibleTransactions(data.transactions);
  const dailyData = buildDailyFinanceData(transactions, data.startingBalance);
  const tagData = buildExpenseTagData(transactions);
  const incomeTotal = totalByType(transactions, 'income');
  const expenseTotal = totalByType(transactions, 'expense');

  return (
    <section className="panel section-block workout-section-panel">
      <div className="section-heading">
        <div>
          <h2>{t('Finance charts')}</h2>
          <p className="muted-text">{t('Income, expenses, balance, and spending structure over time.')}</p>
        </div>
      </div>

      <div className="stats-grid workout-chart-stats">
        <StatCard label="Starting balance" value={formatCurrency(data.startingBalance, currency)} />
        <StatCard label="Balance" value={formatCurrency(currentBalance(transactions, data.startingBalance), currency)} />
        <StatCard label="Income" value={`+${formatCurrency(incomeTotal, currency)}`} />
        <StatCard label="Expenses" value={`-${formatCurrency(expenseTotal, currency)}`} />
        <StatCard label="Savings goals" value={data.savingsGoals.length} />
      </div>

      <div className="workout-chart-grid">
        <ChartCard title="Cashflow" description="Income and expenses by day.">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(58, 169, 151, 0.08)' }} />
                <Legend />
                <Bar dataKey="income" name={t('Income')} fill="var(--positive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name={t('Expenses')} fill="var(--danger)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No transactions')} />
          )}
        </ChartCard>

        <ChartCard title="Balance trend" description="How your balance changes after each recorded day.">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="balance" name={t('Balance')} stroke="var(--accent-strong)" fill="rgba(58, 169, 151, 0.24)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No transactions')} />
          )}
        </ChartCard>

        <ChartCard title="Expense tags" description="Where expenses are concentrated.">
          {tagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tagData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="var(--line-soft)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis dataKey="tag" type="category" stroke="var(--muted)" tickLine={false} axisLine={false} width={120} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(216, 95, 95, 0.08)' }} />
                <Bar dataKey="total" name={t('Expenses')} fill="var(--danger)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No expense data yet.')} />
          )}
        </ChartCard>

        <ChartCard title="Income vs expenses" description="Net movement for the latest recorded days.">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="income" name={t('Income')} stroke="var(--positive)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expense" name={t('Expenses')} stroke="var(--danger)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No transactions')} />
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <article className="card workout-chart-card">
      <div className="workout-chart-heading">
        <h3>{t(title)}</h3>
        <p>{t(description)}</p>
      </div>
      {children}
    </article>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="workout-chart-empty">{label}</div>;
}

function buildDailyFinanceData(transactions: FinanceTransaction[], startingBalance: number) {
  const grouped = new Map<string, { income: number; expense: number }>();
  for (const transaction of transactions) {
    const date = transaction.date.slice(0, 10);
    const current = grouped.get(date) ?? { income: 0, expense: 0 };
    current[transaction.type] += transaction.amount;
    grouped.set(date, current);
  }

  let balance = startingBalance;
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => {
      balance += totals.income - totals.expense;
      return {
        label: formatDate(date),
        income: Number(totals.income.toFixed(2)),
        expense: Number(totals.expense.toFixed(2)),
        balance: Number(balance.toFixed(2)),
      };
    })
    .slice(-14);
}

function buildExpenseTagData(transactions: FinanceTransaction[]) {
  const totals = new Map<string, number>();
  for (const transaction of transactions.filter((item) => item.type === 'expense')) {
    const tags = transaction.tags.length ? transaction.tags : ['untagged'];
    for (const tag of tags) {
      totals.set(tag, (totals.get(tag) ?? 0) + transaction.amount);
    }
  }

  return Array.from(totals.entries())
    .map(([tag, total]) => ({ tag, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

const tooltipStyle = {
  background: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};
