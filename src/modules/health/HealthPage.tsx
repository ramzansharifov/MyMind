import { useState, type FormEvent } from 'react';
import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/forms';
import { EmptyState } from '../../shared/components/EmptyState';
import { ModulePageShell } from '../../shared/components/ModulePageShell';
import { useI18n } from '../../shared/i18n';
import { formatDate } from '../../shared/utils/dateUtils';
import { createId } from '../../shared/utils/idGenerator';
import type { HealthData, HealthEntry } from './types';

export function HealthPage({ data, onChange }: { data: HealthData; onChange: (data: HealthData) => void }) {
  const [editing, setEditing] = useState<HealthEntry | null | undefined>(undefined);
  const entries = [...data.entries].sort((a, b) => b.date.localeCompare(a.date));
  const { t } = useI18n();

  function saveEntry(entry: HealthEntry) {
    const exists = data.entries.some((item) => item.id === entry.id);
    onChange({ ...data, entries: exists ? data.entries.map((item) => (item.id === entry.id ? entry : item)) : [entry, ...data.entries] });
    setEditing(undefined);
  }

  return (
    <ModulePageShell
      title="Health"
      subtitle="Sleep, mood, energy, symptoms, and simple body metrics."
      actions={<AddButton label="Add health entry" onClick={() => setEditing(null)} />}
    >
      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        <article className={statCardClass}>
          <span className="text-app-muted">{t('Entries')}</span>
          <strong className="text-2xl text-app-text">{data.entries.length}</strong>
        </article>
        <article className={statCardClass}>
          <span className="text-app-muted">{t('Average sleep')}</span>
          <strong className="text-2xl text-app-text">{average(data.entries.map((entry) => entry.sleepHours)).toFixed(1)}h</strong>
        </article>
        <article className={statCardClass}>
          <span className="text-app-muted">{t('Average energy')}</span>
          <strong className="text-2xl text-app-text">{average(data.entries.map((entry) => entry.energy)).toFixed(1)}/10</strong>
        </article>
      </div>
      {entries.length === 0 ? (
        <EmptyState title="No health entries" message="Add daily health notes to notice patterns over time." />
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <article className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel max-[760px]:grid-cols-1" key={entry.id}>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-app-text">{formatDate(entry.date)}</h3>
                <p className="mt-1 text-sm text-app-muted">{entry.notes || entry.symptoms || 'No notes.'}</p>
                <small className="mt-2 block text-xs font-bold text-app-muted">
                  {t('Mood')} {entry.mood || t('none')} / {t('sleep')} {entry.sleepHours}h / {t('energy')} {entry.energy}/10 / {t('weight')} {entry.weight || 0}
                </small>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <EditButton onClick={() => setEditing(entry)} />
                <DeleteButton
                  onConfirm={() => onChange({ ...data, entries: data.entries.filter((item) => item.id !== entry.id) })}
                  confirmTitle="Delete health entry?"
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined ? <HealthEntryForm entry={editing} onCancel={() => setEditing(undefined)} onSave={saveEntry} /> : null}
    </ModulePageShell>
  );
}

function average(values: number[]) {
  const realValues = values.filter((value) => value > 0);
  return realValues.length ? realValues.reduce((sum, value) => sum + value, 0) / realValues.length : 0;
}

function HealthEntryForm({
  entry,
  onCancel,
  onSave,
}: {
  entry?: HealthEntry | null;
  onCancel: () => void;
  onSave: (entry: HealthEntry) => void;
}) {
  const [date, setDate] = useState(entry?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState(entry?.mood ?? '');
  const [sleepHours, setSleepHours] = useState(String(entry?.sleepHours ?? 0));
  const [weight, setWeight] = useState(String(entry?.weight ?? 0));
  const [energy, setEnergy] = useState(entry?.energy ?? 5);
  const [symptoms, setSymptoms] = useState(entry?.symptoms ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: entry?.id ?? createId('health'),
      date,
      mood: mood.trim(),
      sleepHours: Number.parseFloat(sleepHours) || 0,
      weight: Number.parseFloat(weight) || 0,
      energy,
      symptoms: symptoms.trim(),
      notes: notes.trim(),
      tags: [],
      createdAt: entry?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={entry ? 'Edit health entry' : 'Add health entry'} saveLabel="Save entry" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Date')}
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label>
        {t('Mood')}
        <input value={mood} onChange={(event) => setMood(event.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        <label>
          {t('Sleep hours')}
          <input type="number" value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} />
        </label>
        <label>
          {t('Weight')}
          <input type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
        </label>
      </div>
      <label>
        {t('Energy')} {energy}/10
        <input type="range" min="1" max="10" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} />
      </label>
      <label>
        {t('Symptoms')}
        <textarea rows={3} value={symptoms} onChange={(event) => setSymptoms(event.target.value)} />
      </label>
      <label>
        {t('Notes')}
        <textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
    </EntityForm>
  );
}

const statCardClass =
  'grid gap-1.5 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel';
