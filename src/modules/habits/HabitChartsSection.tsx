import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReactNode } from 'react';
import { StatCard } from '../../shared/components/StatCard';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import type { Habit, HabitLog } from './types';

interface HabitChartsSectionProps {
  habits: Habit[];
  logs: HabitLog[];
  completedToday: number;
  todayTotal: number;
}

export function HabitChartsSection({ habits, logs, completedToday, todayTotal }: HabitChartsSectionProps) {
  const { t } = useI18n();
  const dailyData = buildDailyData(logs);
  const habitData = buildHabitData(habits, logs);
  const activeCount = habits.filter((habit) => habit.isActive).length;

  return (
    <section className={chartSectionClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-app-text">{t('Habit analytics')}</h2>
          <p className="mt-1 text-sm text-app-muted">{t('Completion, streak signals, and history density for your habits.')}</p>
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatCard label="Active habits" value={activeCount} />
        <StatCard label="Today" value={`${completedToday}/${todayTotal}`} detail="completed today" />
        <StatCard label="History entries" value={logs.length} />
      </div>

      <div className={chartGridClass}>
        <ChartCard title="Daily completion" description="Completed and pending habits by day.">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--chart-cursor-accent)' }} />
                <Legend />
                <Bar dataKey="completed" name={t('Completed')} fill="var(--positive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" name={t('Pending')} fill="var(--neutral)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No habit history yet.')} />
          )}
        </ChartCard>

        <ChartCard title="Completion rate" description="Percent of completed habits in each recorded day.">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="rate" name={t('Completion rate')} stroke="var(--accent-strong)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No habit history yet.')} />
          )}
        </ChartCard>

        <ChartCard title="Habits by completion" description="Which habits have the most completed records.">
          {habitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={habitData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="var(--line-soft)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted)" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="title" type="category" stroke="var(--muted)" tickLine={false} axisLine={false} width={130} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--chart-cursor-accent)' }} />
                <Bar dataKey="completed" name={t('Completed')} fill="var(--accent-strong)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No habit history yet.')} />
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

function buildDailyData(logs: HabitLog[]) {
  const grouped = new Map<string, HabitLog[]>();
  for (const log of logs) {
    grouped.set(log.date, [...(grouped.get(log.date) ?? []), log]);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, dayLogs]) => {
      const completed = dayLogs.filter((log) => log.isCompleted).length;
      const pending = dayLogs.length - completed;
      return {
        label: formatDate(date),
        completed,
        pending,
        rate: dayLogs.length ? Math.round((completed / dayLogs.length) * 100) : 0,
      };
    });
}

function buildHabitData(habits: Habit[], logs: HabitLog[]) {
  return habits
    .map((habit) => ({
      title: habit.title,
      completed: logs.filter((log) => log.habitId === habit.id && log.isCompleted).length,
    }))
    .filter((item) => item.completed > 0)
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);
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
