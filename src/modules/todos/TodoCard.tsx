import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import type { TodoItem } from './types';

interface TodoCardProps {
  todo: TodoItem;
  groupTitle?: string;
  onToggle: () => void;
  onEdit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
}

export function TodoCard({ todo, groupTitle, onToggle, onEdit, onPin, onArchive, onTrash }: TodoCardProps) {
  const { t } = useI18n();
  const isCompleted = todo.status === 'completed';

  return (
    <article
      className={`card list-card todo-card ${todo.pinnedAt ? 'pinned' : ''} ${isCompleted ? 'completed' : ''}`}
    >
      <button
        className="todo-toggle-button"
        type="button"
        aria-pressed={isCompleted}
        aria-label={t(isCompleted ? 'Mark as pending' : 'Mark as completed')}
        onClick={onToggle}
      >
        <span className="todo-status-mark" aria-hidden="true" />
      </button>
      <div>
        <h3>{todo.title}</h3>
        <p>{todo.description || t('No description.')}</p>
        <div className="todo-meta-row">
          <small>
            {t(todo.priority)} {t('priority')} / {t('due')} {formatDate(todo.dueDate)}
          </small>
          {groupTitle ? <span className="chip">{t(groupTitle)}</span> : null}
        </div>
      </div>
      <div className="card-actions compact">
        <PinButton isPinned={Boolean(todo.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton
          label="Archive"
          confirmTitle="Archive task?"
          confirmMessage="The task will be hidden from regular lists but kept in local SQLite storage."
          onConfirm={onArchive}
        />
        <DeleteButton
          label="Move to trash"
          confirmTitle="Move to trash?"
          confirmMessage="The item will stay in trash for 30 days before permanent deletion."
          onConfirm={onTrash}
        />
      </div>
    </article>
  );
}
