import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import type { JournalEntry } from './types';

interface JournalEntryFormProps {
  entry?: JournalEntry | null;
  onCancel: () => void;
  onSave: (entry: JournalEntry) => void;
}

export function JournalEntryForm({ entry, onCancel, onSave }: JournalEntryFormProps) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [mood, setMood] = useState(entry?.mood ?? '');
  const [tags, setTags] = useState(joinCsv(entry?.tags ?? []));
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: entry?.id ?? createId('entry'),
      title: title.trim(),
      content: content.trim(),
      mood: mood.trim(),
      tags: splitCsv(tags),
      createdAt: entry?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={entry ? 'Edit entry' : 'Add entry'} saveLabel="Save entry" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('Mood')}
        <input value={mood} onChange={(event) => setMood(event.target.value)} />
      </label>
      <label>
        {t('Tags')}
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
      <label>
        {t('Content')}
        <textarea rows={10} value={content} onChange={(event) => setContent(event.target.value)} />
      </label>
    </EntityForm>
  );
}
