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
import type { ExerciseDefinition, NutritionEntry, ProgressRecord, WorkoutPlan, WorkoutSession } from './types';
import '../../styles/modules/charts.css';

interface ChartsSectionProps {
  exercises: ExerciseDefinition[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  progressRecords: ProgressRecord[];
  nutritionEntries: NutritionEntry[];
}

export function ChartsSection({ exercises, plans, sessions, progressRecords, nutritionEntries }: ChartsSectionProps) {
  const { t } = useI18n();
  const trainingData = buildTrainingData(sessions);
  const nutritionData = buildNutritionData(nutritionEntries);
  const progressData = buildProgressData(progressRecords);

  return (
    <section className="panel section-block workout-section-panel">
      <div className="section-heading">
        <div>
          <h2>{t('Charts & Analytics')}</h2>
          <p className="muted-text">{t('View your training progress, nutrition trends, and metrics over time.')}</p>
        </div>
      </div>

      <div className="stats-grid workout-chart-stats">
        <StatCard label="Exercises" value={exercises.length} />
        <StatCard label="Plans" value={plans.length} />
        <StatCard label="Workouts" value={sessions.length} />
        <StatCard label="Progress Records" value={progressRecords.length} />
        <StatCard label="Nutrition Entries" value={nutritionEntries.length} />
      </div>

      <div className="workout-chart-grid">
        <ChartCard title="Workout volume" description="Completed and skipped exercises by session.">
          {trainingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trainingData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(58, 169, 151, 0.08)' }} />
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
                <Line type="monotone" dataKey="mood" name={t('Mood')} stroke="#d59d31" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No workout sessions yet.')} />
          )}
        </ChartCard>

        <ChartCard title="Nutrition calories" description="Daily calories from recorded meals.">
          {nutritionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={nutritionData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="calories" name={t('Calories')} stroke="var(--accent-strong)" fill="rgba(58, 169, 151, 0.24)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No nutrition entries yet.')} />
          )}
        </ChartCard>

        <ChartCard title="Nutrition macros" description="Protein, carbs, and fats by day.">
          {nutritionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={nutritionData}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(58, 169, 151, 0.08)' }} />
                <Legend />
                <Bar dataKey="protein" name={t('protein')} stackId="macros" fill="var(--accent-strong)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="carbs" name={t('carbs')} stackId="macros" fill="#d59d31" radius={[6, 6, 0, 0]} />
                <Bar dataKey="fats" name={t('fats')} stackId="macros" fill="#6f8fd6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label={t('No nutrition entries yet.')} />
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

function buildNutritionData(entries: NutritionEntry[]) {
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((entry) => {
      const meals = Array.isArray(entry.meals) ? entry.meals : [];
      return {
        label: formatDate(entry.date),
        calories: Math.round(meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0)),
        protein: Number(meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0).toFixed(1)),
        carbs: Number(meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0).toFixed(1)),
        fats: Number(meals.reduce((sum, meal) => sum + (Number(meal.fats) || 0), 0).toFixed(1)),
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

const chartColors = ['var(--accent-strong)', '#d59d31', '#6f8fd6', '#d85f5f', '#4ab58d'];

const tooltipStyle = {
  background: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};
