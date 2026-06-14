import { ArchiveButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
import type { Habit } from './types';

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  note: string;
  onToggle: () => void;
  onNoteChange: (note: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  onTrash: () => void;
}

export function HabitCard({ habit, isCompleted, note, onToggle, onNoteChange, onEdit, onRemove, onTrash }: HabitCardProps) {
  const { t } = useI18n();
  return (
    <article className={cn(cardClass, isCompleted && 'border-[color-mix(in_srgb,var(--success)_42%,var(--border))]')}>
      <div className="grid gap-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 max-[680px]:grid-cols-[auto_minmax(0,1fr)]">
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
            <h3 className="text-base font-extrabold text-app-text">{habit.title}</h3>
            <p className="mt-1 text-sm text-app-muted">{habit.description || t('No description.')}</p>
          </div>
          <span className={cn(statusPillClass, isCompleted && 'border-[color-mix(in_srgb,var(--success)_48%,var(--border))] bg-[color-mix(in_srgb,var(--success)_14%,var(--surface-strong))] text-app-success')}>{isCompleted ? t('Completed') : t('Pending')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {habit.category ? <span className={chipClass}>{habit.category}</span> : null}
          {habit.timeOfDay ? <span className={chipClass}>{habit.timeOfDay}</span> : null}
        </div>
        <label className="grid gap-1.5 text-[13px] font-bold text-app-muted">
          {t('Today note')}
          <input value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder={t('Optional note for today')} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <EditButton onClick={onEdit} />
        <ArchiveButton
          label="Remove from active"
          onConfirm={onRemove}
          confirmTitle="Remove habit from active list?"
          confirmMessage="Past habit history will be kept."
        />
        <DeleteButton
          label="Move to trash"
          onConfirm={onTrash}
          confirmTitle="Move habit to trash?"
          confirmMessage="The habit will stay in trash for 30 days. Past habit history will be kept."
        />
      </div>
    </article>
  );
}

const cardClass =
  'grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel transition-colors';

const toggleButtonClass =
  'grid h-10 w-10 shrink-0 place-items-center rounded-panel border border-app-border bg-app-surface-soft text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] hover:text-app-accent-strong';

const toggleButtonActiveClass =
  'border-[color-mix(in_srgb,var(--success)_58%,var(--border))] bg-[color-mix(in_srgb,var(--success)_16%,var(--surface-strong))] text-app-success';

const statusMarkClass = 'h-3.5 w-3.5 rounded-full border-2 border-current';

const statusMarkActiveClass = 'bg-current';

const statusPillClass =
  'inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text';

const chipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
