import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
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

      <div className="workout-tabs" role="tablist" aria-label={t('Habit sections')}>
        {[
          { id: 'routine', label: 'Routine' },
          { id: 'history', label: 'History' },
          { id: 'charts', label: 'Charts' },
        ].map((tab) => (
          <button
            className={`workout-tab${activeTab === tab.id ? ' active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as 'routine' | 'history' | 'charts')}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
      <div className="habit-tab-actions">
        <div className="habit-today-label">
          <span>{t('Today')}</span>
          <strong>{todayLabel}</strong>
        </div>
        <div className="habit-tab-action-buttons">
          {activeTab === 'routine' ? <AddButton label="Add habit" onClick={() => setEditing(null)} /> : null}
        </div>
      </div>

      {activeTab === 'routine' ? (
        <section className="panel habits-panel today-habits-panel">
          <div className="section-heading">
            <h2>{t('Daily routine')}</h2>
            <span className="rating-pill">{completedToday}/{habitsForToday.length}</span>
          </div>
          {habitsForToday.length === 0 ? <EmptyState title="No active habits" message="Create habits, then mark them every day." /> : null}
          <div className="habit-card-grid">
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
        <section className="panel habits-panel all-habits-panel">
          <div className="section-heading">
            <div>
              <h2>{t('Habit history')}</h2>
              <p className="muted-text">{t('Recent habit records grouped by day.')}</p>
            </div>
          </div>
          <div className="habit-history-list">
            {historyDays.map((day) => (
              <article className="card habit-history-day" key={day.date}>
                <div className="section-heading">
                  <h3>{formatDate(day.date)} / {weekdayFormatter.format(new Date(`${day.date}T00:00:00`))}</h3>
                  <span className="rating-pill">{day.items.filter((item) => item.isCompleted).length}/{day.items.length}</span>
                </div>
                <div className="habit-history-grid">
                  {day.items.map((item) => (
                    <div className="habit-history-card" key={item.id}>
                      <span className={`habit-history-status ${item.isCompleted ? 'completed' : ''}`} aria-hidden="true" />
                      <div>
                        <strong>{item.title || t('Deleted habit')}</strong>
                        <span>{item.notes || t('No notes yet.')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {historyDays.length === 0 ? <p className="muted-text">{t('No habit history yet.')}</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'charts' ? (
        <Suspense fallback={<section className="panel">Loading charts...</section>}>
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
