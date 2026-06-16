import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { PageTabs } from '../../shared/components/PageTabs';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { trashEntity } from '../../shared/utils/archiveUtils';
import { formatDate, localDateOnly, millisecondsUntilNextLocalDay } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';
import { activeHabits, isHabitCompletedToday, isHabitScheduledForDate, todayHabits, todayLog } from './habitUtils';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';
import type { Habit, HabitData, HabitLog } from './types';

const HabitChartsSection = lazy(() => import('./HabitChartsSection').then((module) => ({ default: module.HabitChartsSection })));

interface HabitsPageProps {
  data: HabitData;
  onChange: (data: HabitData) => void;
}

export function HabitsPage({ data, onChange }: HabitsPageProps) {
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'routine' | 'history' | 'charts'>('routine');
  const [todayKey, setTodayKey] = useState(() => localDateOnly());
  const today = useMemo(() => new Date(`${todayKey}T00:00:00`), [todayKey]);
  const habitsForToday = todayHabits(data.habits, today);
  const { t } = useI18n();
  const completedToday = habitsForToday.filter((habit) => isHabitCompletedToday(habit.id, data.logs, todayKey)).length;
  const active = activeHabits(data.habits);
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today);
  const historyDays = useMemo(() => buildHabitHistoryDays(data.habits, data.logs, todayKey), [data.habits, data.logs, todayKey]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: 'long' }), []);

  useEffect(() => {
    let nextDayTimer = 0;
    const refreshToday = () => setTodayKey(localDateOnly());
    const scheduleNextDay = () => {
      window.clearTimeout(nextDayTimer);
      nextDayTimer = window.setTimeout(() => {
        refreshToday();
        scheduleNextDay();
      }, millisecondsUntilNextLocalDay());
    };

    scheduleNextDay();
    window.addEventListener('focus', refreshToday);
    document.addEventListener('visibilitychange', refreshToday);
    return () => {
      window.clearTimeout(nextDayTimer);
      window.removeEventListener('focus', refreshToday);
      document.removeEventListener('visibilitychange', refreshToday);
    };
  }, []);

  function saveHabit(habit: Habit) {
    const exists = data.habits.some((item) => item.id === habit.id);
    onChange({ ...data, habits: exists ? data.habits.map((item) => (item.id === habit.id ? habit : item)) : [habit, ...data.habits] });
    setEditing(undefined);
  }

  function upsertTodayLog(habit: Habit, patch: Partial<HabitLog>) {
    const timestamp = new Date().toISOString();
    const date = localDateOnly();
    if (date !== todayKey) {
      setTodayKey(date);
    }
    const existing = todayLog(habit.id, data.logs, date);
    const nextIsCompleted = patch.isCompleted ?? existing?.isCompleted ?? false;
    const nextLog: HabitLog = {
      id: existing?.id ?? createId('habitlog'),
      habitId: habit.id,
      habitTitle: habit.title,
      date,
      isCompleted: nextIsCompleted,
      notes: existing?.notes ?? '',
      reminderFiredAt: existing?.reminderFiredAt ?? null,
      completedAt: patch.isCompleted === true ? timestamp : patch.isCompleted === false ? null : existing?.completedAt ?? null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      ...patch,
    };
    onChange({
      ...data,
      logs: existing ? data.logs.map((log) => (log.id === existing.id ? nextLog : log)) : [...data.logs, nextLog],
    });
  }

  function removeFromActive(habit: Habit) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      habits: data.habits.map((item) => (item.id === habit.id ? { ...item, isActive: false, archivedAt: timestamp, updatedAt: timestamp } : item)),
    });
  }

  function moveToTrash(habit: Habit) {
    onChange({
      ...data,
      habits: data.habits.map((item) => (item.id === habit.id ? { ...trashEntity(item), isActive: false } : item)),
    });
  }

  return (
    <section>
      <PageHeader
        title="Habits"
        subtitle="A daily routine list with notes and preserved history."
      />

      <PageTabs
        tabs={[
          { id: 'routine', label: 'Routine' },
          { id: 'history', label: 'History' },
          { id: 'charts', label: 'Charts' },
        ]}
        activeTab={activeTab}
        ariaLabel="Habit sections"
        onChange={setActiveTab}
      />
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-3 [backdrop-filter:var(--glass-blur)] shadow-panel">
        <div className="grid gap-0.5">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-app-muted">{t('Today')}</span>
          <strong className="text-app-text">{todayLabel}</strong>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'routine' ? <AddButton label="Add habit" onClick={() => setEditing(null)} /> : null}
        </div>
      </div>

      {activeTab === 'routine' ? (
        <section className={panelClass}>
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
            <h2 className="text-xl font-extrabold text-app-text">{t('Daily routine')}</h2>
            <span className={countPillClass}>{completedToday}/{habitsForToday.length}</span>
          </div>
          {habitsForToday.length === 0 ? <EmptyState title="No active habits" message="Create habits, then mark them every day." /> : null}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
            {habitsForToday.map((habit) => {
              const log = todayLog(habit.id, data.logs, todayKey);
              return (
                <HabitCard
                  habit={habit}
                  key={habit.id}
                  isCompleted={Boolean(log?.isCompleted)}
                  note={log?.notes ?? ''}
                  onToggle={() => upsertTodayLog(habit, { isCompleted: !log?.isCompleted })}
                  onNoteChange={(notes) => upsertTodayLog(habit, { notes })}
                  onEdit={() => setEditing(habit)}
                  onRemove={() => removeFromActive(habit)}
                  onTrash={() => moveToTrash(habit)}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'history' ? (
        <section className={panelClass}>
          <div className="mb-4 border-b border-[var(--line-soft)] pb-3">
            <div>
              <h2 className="text-xl font-extrabold text-app-text">{t('Habit history')}</h2>
              <p className="text-app-muted">{t('Recent habit records grouped by day.')}</p>
            </div>
          </div>
          <div className="grid gap-3.5">
            {historyDays.map((day) => (
              <article className="grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel" key={day.date}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-extrabold text-app-text">{formatDate(day.date)} / {weekdayFormatter.format(new Date(`${day.date}T00:00:00`))}</h3>
                  <span className={countPillClass}>{day.items.filter((item) => item.isCompleted).length}/{day.items.length}</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
                  {day.items.map((item) => (
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-panel border border-app-border bg-app-surface-soft p-3" key={item.id}>
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.isCompleted ? 'bg-app-success' : 'bg-[var(--muted)]'}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-app-text">{item.title || t('Deleted habit')}</strong>
                        <span className="mt-0.5 block truncate text-xs text-app-muted">{item.notes || t('No notes yet.')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {historyDays.length === 0 ? <p className="text-sm text-app-muted">{t('No habit history yet.')}</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'charts' ? (
        <Suspense fallback={<LoadingState title="Loading charts" message="Preparing habit progress analytics..." variant="compact" />}>
          <HabitChartsSection habits={active} logs={data.logs} completedToday={completedToday} todayTotal={habitsForToday.length} />
        </Suspense>
      ) : null}
      {editing !== undefined ? <HabitForm habit={editing} onCancel={() => setEditing(undefined)} onSave={saveHabit} /> : null}
    </section>
  );
}

interface HabitHistoryItem {
  id: string;
  habitId: string;
  title: string;
  notes: string;
  isCompleted: boolean;
}

function buildHabitHistoryDays(habits: Habit[], logs: HabitLog[], todayKey: string) {
  const dateKeys = new Set<string>();
  const today = parseDateKey(todayKey);
  for (let index = 0; index < 14; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    dateKeys.add(localDateOnly(date));
  }
  for (const log of logs) {
    dateKeys.add(log.date);
  }

  const logsByDay = new Map<string, Map<string, HabitLog>>();
  for (const log of logs) {
    if (!logsByDay.has(log.date)) {
      logsByDay.set(log.date, new Map());
    }
    logsByDay.get(log.date)?.set(log.habitId, log);
  }

  return Array.from(dateKeys)
    .sort((a, b) => b.localeCompare(a))
    .map((dateKey) => {
      const dayDate = parseDateKey(dateKey);
      const dayLogs = logsByDay.get(dateKey) ?? new Map<string, HabitLog>();
      const scheduledHabits = habits.filter((habit) => isHabitTrackedOnDate(habit, dateKey) && isHabitScheduledForDate(habit, dayDate));
      const plannedItems: HabitHistoryItem[] = scheduledHabits.map((habit) => {
        const log = dayLogs.get(habit.id);
        return {
          id: `${dateKey}-${habit.id}`,
          habitId: habit.id,
          title: log?.habitTitle || habit.title,
          notes: log?.notes ?? '',
          isCompleted: Boolean(log?.isCompleted),
        };
      });
      const plannedIds = new Set(plannedItems.map((item) => item.habitId));
      const orphanLogItems: HabitHistoryItem[] = Array.from(dayLogs.values())
        .filter((log) => !plannedIds.has(log.habitId))
        .map((log) => ({
          id: log.id,
          habitId: log.habitId,
          title: log.habitTitle,
          notes: log.notes,
          isCompleted: log.isCompleted,
        }));
      return { date: dateKey, items: [...plannedItems, ...orphanLogItems] };
    })
    .filter((day) => day.items.length > 0)
    .slice(0, 30);
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function isHabitTrackedOnDate(habit: Habit, dateKey: string) {
  const createdAt = new Date(habit.createdAt);
  const archivedAt = habit.archivedAt ? new Date(habit.archivedAt) : null;
  const createdDate = Number.isNaN(createdAt.getTime()) ? dateKey : localDateOnly(createdAt);
  const archivedDate = archivedAt && !Number.isNaN(archivedAt.getTime()) ? localDateOnly(archivedAt) : null;
  return createdDate <= dateKey && (!archivedDate || archivedDate >= dateKey);
}

const panelClass =
  'rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel';

const countPillClass =
  'inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text';
