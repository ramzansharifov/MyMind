import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n';
import { cn } from '../../shared/utils/classNames';
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
      className={cn(cardClass, todo.pinnedAt && pinnedClass, isCompleted && 'opacity-75')}
    >
      <button
        className={cn(toggleButtonClass, isCompleted && toggleButtonActiveClass)}
        type="button"
        aria-pressed={isCompleted}
        aria-label={t(isCompleted ? 'Mark as pending' : 'Mark as completed')}
        onClick={onToggle}
      >
        <span className={cn(statusMarkClass, isCompleted && statusMarkActiveClass)} aria-hidden="true" />
      </button>
      <div className="min-w-0">
        <h3 className={cn('text-base font-extrabold text-app-text', isCompleted && 'line-through decoration-app-muted')}>{todo.title}</h3>
        <p className="mt-1 text-sm text-app-muted">{todo.description || t('No description.')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <small className="text-xs font-bold text-app-muted">
            {t(todo.priority)} {t('priority')} / {t('due')} {formatDate(todo.dueDate)}
          </small>
          {groupTitle ? <span className={chipClass}>{t(groupTitle)}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
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

const cardClass =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel transition-colors hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))] max-[760px]:grid-cols-[auto_minmax(0,1fr)]';

const pinnedClass = 'border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]';

const toggleButtonClass =
  'grid h-10 w-10 shrink-0 place-items-center rounded-panel border border-app-border bg-app-surface-soft text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] hover:text-app-accent-strong';

const toggleButtonActiveClass =
  'border-[color-mix(in_srgb,var(--success)_58%,var(--border))] bg-[color-mix(in_srgb,var(--success)_16%,var(--surface-strong))] text-app-success';

const statusMarkClass = 'h-3.5 w-3.5 rounded-full border-2 border-current';

const statusMarkActiveClass = 'bg-current';

const chipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
