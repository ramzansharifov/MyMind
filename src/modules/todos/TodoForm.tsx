import { useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Circle, Folder } from 'lucide-react';
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
        <div className="form-section todo-choice-section">
          <strong>{t('Status')}</strong>
          <div className="todo-status-picker">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const isActive = status === option.value;
              return (
                <button
                  className={`todo-choice-card${isActive ? ' active' : ''}`}
                  type="button"
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                >
                  <span className="todo-choice-icon">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{t(option.label)}</strong>
                    <small>{t(option.description)}</small>
                  </span>
                  {isActive ? <Check size={16} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-section todo-choice-section">
          <strong>{t('Priority')}</strong>
          <div className="todo-priority-picker">
            {priorityOptions.map((option) => {
              const isActive = priority === option.value;
              return (
                <button
                  className={`todo-choice-card priority-${option.value}${isActive ? ' active' : ''}`}
                  type="button"
                  key={option.value}
                  onClick={() => setPriority(option.value)}
                >
                  <span className="todo-priority-dot" aria-hidden="true" />
                  <span>
                    <strong>{t(option.label)}</strong>
                  </span>
                  {isActive ? <Check size={16} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="form-section todo-choice-section">
        <strong>{t('Group')}</strong>
        <div className="todo-group-picker">
          {groups
            .filter((group) => group.kind !== 'all' && group.kind !== 'completed')
            .map((group) => {
              const isActive = groupId === group.id;
              return (
                <button
                  className={`todo-choice-card${isActive ? ' active' : ''}`}
                  type="button"
                  key={group.id}
                  onClick={() => setGroupId(group.id)}
                >
                  <span className="todo-choice-icon">
                    <Folder size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{t(group.title)}</strong>
                  </span>
                  {isActive ? <Check size={16} aria-hidden="true" /> : null}
                </button>
              );
            })}
        </div>
      </div>
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

const statusOptions: Array<{ value: TodoStatus; label: string; description: string; icon: typeof Circle }> = [
  { value: 'pending', label: 'Pending', description: 'Task is still open', icon: Circle },
  { value: 'completed', label: 'Completed', description: 'Task is done', icon: CheckCircle2 },
];

const priorityOptions: Array<{ value: TodoPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

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
