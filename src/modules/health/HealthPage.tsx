import { useState, type FormEvent } from 'react';
import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
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
    <section>
      <PageHeader
        title="Health"
        subtitle="Sleep, mood, energy, symptoms, and simple body metrics."
        actions={
          <AddButton label="Add health entry" onClick={() => setEditing(null)} />
        }
      />
      <div className="stats-grid">
        <article className="stat-card">
          <span>{t('Entries')}</span>
          <strong>{data.entries.length}</strong>
        </article>
        <article className="stat-card">
          <span>{t('Average sleep')}</span>
          <strong>{average(data.entries.map((entry) => entry.sleepHours)).toFixed(1)}h</strong>
        </article>
        <article className="stat-card">
          <span>{t('Average energy')}</span>
          <strong>{average(data.entries.map((entry) => entry.energy)).toFixed(1)}/10</strong>
        </article>
      </div>
      {entries.length === 0 ? (
        <EmptyState title="No health entries" message="Add daily health notes to notice patterns over time." />
      ) : (
        <div className="stack">
          {entries.map((entry) => (
            <article className="card list-card" key={entry.id}>
              <div>
                <h3>{formatDate(entry.date)}</h3>
                <p>{entry.notes || entry.symptoms || 'No notes.'}</p>
                <small>
                  {t('Mood')} {entry.mood || t('none')} / {t('sleep')} {entry.sleepHours}h / {t('energy')} {entry.energy}/10 / {t('weight')} {entry.weight || 0}
                </small>
              </div>
              <div className="card-actions compact">
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
    </section>
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
      <div className="form-grid">
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
