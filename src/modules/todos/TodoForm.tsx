import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { splitCsv, joinCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import type { TodoGroup, TodoItem, TodoPriority, TodoStatus } from './types';

interface TodoFormProps {
  todo?: TodoItem | null;
  groups: TodoGroup[];
  defaultGroupId?: string;
  onCancel: () => void;
  onSave: (todo: TodoItem) => void;
}

export function TodoForm({ todo, groups, defaultGroupId = 'pending', onCancel, onSave }: TodoFormProps) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [status, setStatus] = useState<TodoStatus>(todo?.status === 'archived' ? 'pending' : todo?.status ?? 'pending');
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority ?? 'medium');
  const [groupId, setGroupId] = useState(todo?.groupId ?? defaultGroupId);
  const [tags, setTags] = useState(joinCsv(todo?.tags ?? []));
  const [dueDate, setDueDate] = useState(todo?.dueDate?.slice(0, 10) ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(todo?.reminderEnabled ?? false);
  const [reminderAt, setReminderAt] = useState(toDateTimeLocalValue(todo?.reminderAt));
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    const nextReminderAt = reminderEnabled && reminderAt ? localDateTimeToIso(reminderAt) : null;
    onSave({
      id: todo?.id ?? createId('todo'),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      groupId,
      tags: splitCsv(tags),
      dueDate: dueDate || null,
      reminderAt: nextReminderAt,
      reminderEnabled,
      reminderFiredAt: nextReminderAt === todo?.reminderAt ? todo?.reminderFiredAt ?? null : null,
      createdAt: todo?.createdAt ?? timestamp,
      updatedAt: timestamp,
      completedAt: status === 'completed' ? todo?.completedAt ?? timestamp : null,
    });
  }

  return (
    <EntityForm title={todo ? 'Edit task' : 'Add task'} saveLabel="Save task" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('Description')}
        <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          {t('Status')}
          <select value={status} onChange={(event) => setStatus(event.target.value as TodoStatus)}>
            <option value="pending">{t('Pending')}</option>
            <option value="completed">{t('Completed')}</option>
          </select>
        </label>
        <label>
          {t('Priority')}
          <select value={priority} onChange={(event) => setPriority(event.target.value as TodoPriority)}>
            <option value="low">{t('Low')}</option>
            <option value="medium">{t('Medium')}</option>
            <option value="high">{t('High')}</option>
          </select>
        </label>
      </div>
      <label>
        {t('Group')}
        <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          {groups
            .filter((group) => group.kind !== 'all' && group.kind !== 'completed')
            .map((group) => (
              <option value={group.id} key={group.id}>
                {t(group.title)}
              </option>
            ))}
        </select>
      </label>
      <label>
        {t('Due date')}
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </label>
      <label className="checkbox-line">
        <input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} />
        {t('Local reminder')}
      </label>
      {reminderEnabled ? (
        <label>
          {t('Reminder time')}
          <input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
        </label>
      ) : null}
      <label>
        {t('Tags')}
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
    </EntityForm>
  );
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function localDateTimeToIso(value: string) {
  return new Date(value).toISOString();
}
