import {
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
import type { ExerciseDefinition, ProgressRecord, WorkoutPlan, WorkoutSession } from './types';

interface ChartsSectionProps {
  exercises: ExerciseDefinition[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  progressRecords: ProgressRecord[];
}

export function ChartsSection({ exercises, plans, sessions, progressRecords }: ChartsSectionProps) {
  const { t } = useI18n();
  const trainingData = buildTrainingData(sessions);
  const progressData = buildProgressData(progressRecords);

  return (
    <section className={chartSectionClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-app-text">{t('Charts & Analytics')}</h2>
          <p className="mt-1 text-sm text-app-muted">{t('View your training progress and body metrics over time.')}</p>
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatCard label="Exercises" value={exercises.length} />
        <StatCard label="Plans" value={plans.length} />
        <StatCard label="Workouts" value={sessions.length} />
        <StatCard label="Progress Records" value={progressRecords.length} />
      </div>

      <div className={chartGridClass}>
        <ChartCard title="Workout volume" description="Completed and skipped exercises by session.">
          {trainingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trainingData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--chart-cursor-accent)' }} />
                <Legend />
                <Bar dataKey="completed" name={t('Completed')} fill="var(--accent-strong)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="skipped" name={t('Skipped')} fill="var(--neutral)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No workout sessions yet.')} />
          )}
        </ChartCard>

        <ChartCard title="Mood and energy" description="How each workout felt on a 1-10 scale.">
          {trainingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trainingData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} domain={[0, 10]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="energy" name={t('Energy')} stroke="var(--accent-strong)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="mood" name={t('Mood')} stroke="var(--chart-series-2)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No workout sessions yet.')} />
          )}
        </ChartCard>

        <ChartCard title="Body metrics" description="Numeric progress metrics over time.">
          {progressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={progressData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {progressMetricKeys(progressData).map((key, index) => (
                  <Line
                    type="monotone"
                    dataKey={key}
                    key={key}
                    name={key}
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No progress records yet.')} />
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

function buildTrainingData(sessions: WorkoutSession[]) {
  return [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((session) => {
      const rows = session.exercises ?? session.completedExercises ?? [];
      return {
        label: formatDate(session.date),
        completed: rows.filter((row) => row.status === 'completed').length,
        skipped: rows.filter((row) => row.status === 'skipped').length,
        energy: session.energyLevel,
        mood: session.mood,
      };
    });
}

function buildProgressData(records: ProgressRecord[]) {
  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((record) => {
      const row: Record<string, string | number> = { label: formatDate(record.date) };
      for (const metric of record.metrics ?? []) {
        const value = Number.parseFloat(String(metric.value).replace(',', '.'));
        if (!Number.isNaN(value)) {
          row[metric.label] = value;
        }
      }
      return row;
    })
    .filter((row) => Object.keys(row).length > 1);
}

function progressMetricKeys(rows: Array<Record<string, string | number>>) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row).filter((key) => key !== 'label'))));
}

const chartColors = ['var(--chart-series-1)', 'var(--chart-series-2)', 'var(--chart-series-3)', 'var(--chart-series-4)', 'var(--chart-series-5)'];

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
