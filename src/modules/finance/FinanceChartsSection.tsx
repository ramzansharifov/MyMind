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
import { useI18n } from '../../shared/i18n';
import { formatDate } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import {
  accountBalance,
  getFinanceAccounts,
  totalBalance,
  totalByType,
  totalStartingBalance,
  visibleTransactions,
} from './financeUtils';
import type { FinanceAccount, FinanceData, FinanceTransaction } from './types';

interface FinanceChartsSectionProps {
  data: FinanceData;
  currency: string;
}

export function FinanceChartsSection({ data, currency }: FinanceChartsSectionProps) {
  const { t } = useI18n();

  const accounts = getFinanceAccounts(data);
  const transactions = visibleTransactions(data.transactions);
  const dailyData = buildDailyFinanceData(transactions, totalStartingBalance(accounts));
  const tagData = buildExpenseTagData(transactions);
  const accountData = buildAccountBalanceData(accounts, transactions);

  const incomeTotal = totalByType(transactions, 'income');
  const expenseTotal = totalByType(transactions, 'expense');

  return (
    <section className={chartSectionClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-app-text">{t('Finance charts')}</h2>
          <p className="mt-1 text-sm text-app-muted">{t('Income, expenses, balance, accounts, and spending structure over time.')}</p>
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatCard label="Starting balance" value={formatCurrency(totalStartingBalance(accounts), currency)} />
        <StatCard label="Balance" value={formatCurrency(totalBalance(data), currency)} />
        <StatCard label="Income" value={`+${formatCurrency(incomeTotal, currency)}`} />
        <StatCard label="Expenses" value={`-${formatCurrency(expenseTotal, currency)}`} />
        <StatCard label="Accounts" value={accounts.length} />
        <StatCard label="Savings goals" value={data.savingsGoals.length} />
      </div>

      <div className={chartGridClass}>
        <ChartCard title="Cashflow" description="Income and expenses by day.">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--chart-cursor-accent)' }} />
                <Legend />
                <Bar dataKey="income" name={t('Income')} fill="var(--positive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name={t('Expenses')} fill="var(--danger)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No transactions')} />
          )}
        </ChartCard>

        <ChartCard title="Balance trend" description="How your total balance changes after each recorded day.">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="balance" name={t('Balance')} stroke="var(--accent-strong)" fill="var(--chart-area-accent)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No transactions')} />
          )}
        </ChartCard>

        <ChartCard title="Account balances" description="Current balance by account.">
          {accountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={accountData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="var(--line-soft)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis dataKey="account" type="category" stroke="var(--muted)" tickLine={false} axisLine={false} width={120} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--chart-cursor-accent)' }} />
                <Bar dataKey="balance" name={t('Balance')} fill="var(--accent-strong)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No accounts')} />
          )}
        </ChartCard>

        <ChartCard title="Expense tags" description="Where expenses are concentrated.">
          {tagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tagData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="var(--line-soft)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis dataKey="tag" type="category" stroke="var(--muted)" tickLine={false} axisLine={false} width={120} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--chart-cursor-danger)' }} />
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
    <article className={chartCardClass}>
      <div className="grid gap-1">
        <h3 className="text-base font-extrabold text-app-text">{t(title)}</h3>
        <p className="text-sm text-app-muted">{t(description)}</p>
      </div>
      {children}
    </article>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className={emptyChartClass}>{label}</div>;
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

function buildAccountBalanceData(accounts: FinanceAccount[], transactions: FinanceTransaction[]) {
  const fallbackAccountId = accounts[0]?.id;

  return accounts
    .map((account) => ({
      account: account.title,
      balance: Number(accountBalance(account, transactions, fallbackAccountId).toFixed(2)),
    }))
    .sort((a, b) => b.balance - a.balance);
}

const tooltipStyle = {
  background: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};

const chartSectionClass =
  'rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-[18px] text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel';
const chartGridClass = 'grid grid-cols-[repeat(2,minmax(320px,1fr))] gap-4 max-[980px]:grid-cols-1';
const chartCardClass =
  'grid min-h-[360px] min-w-0 gap-3.5 rounded-panel border border-app-border bg-app-surface-soft p-4 [&_.recharts-default-legend]:text-app-muted [&_.recharts-text]:fill-app-muted';
const emptyChartClass =
  'grid min-h-[240px] place-items-center rounded-panel border border-dashed border-app-border p-4 text-center text-app-muted';
