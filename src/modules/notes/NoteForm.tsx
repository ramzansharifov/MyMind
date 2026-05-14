import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import type { Note } from './types';

interface NoteFormProps {
  note?: Note | null;
  onCancel: () => void;
  onSave: (note: Note) => void;
}

export function NoteForm({ note, onCancel, onSave }: NoteFormProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [category, setCategory] = useState(note?.category ?? '');
  const [tags, setTags] = useState(joinCsv(note?.tags ?? []));
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: note?.id ?? createId('note'),
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      tags: splitCsv(tags),
      pinned,
      createdAt: note?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={note ? 'Edit note' : 'Add note'} saveLabel="Save note" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('Category')}
        <input value={category} onChange={(event) => setCategory(event.target.value)} />
      </label>
      <label>
        {t('Tags')}
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
      <label>
        {t('Content')}
        <textarea rows={12} value={content} onChange={(event) => setContent(event.target.value)} />
      </label>
      <label className="checkbox-line">
        <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
        {t('Pin note')}
      </label>
    </EntityForm>
  );
}
