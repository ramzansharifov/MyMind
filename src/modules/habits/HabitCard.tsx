import { ArchiveButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
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
    <article className={`card habit-card ${isCompleted ? 'completed' : ''}`}>
      <div className="habit-card-body">
        <div className="habit-card-header">
          <button
            className="habit-toggle-button"
            type="button"
            aria-pressed={isCompleted}
            aria-label={t(isCompleted ? 'Mark as pending' : 'Mark as completed')}
            onClick={onToggle}
          >
            <span className="habit-status-mark" aria-hidden="true" />
          </button>
          <div className="habit-card-copy">
            <h3>{habit.title}</h3>
            <p>{habit.description || t('No description.')}</p>
          </div>
          <span className={`rating-pill habit-status ${isCompleted ? 'completed' : ''}`}>{isCompleted ? t('Completed') : t('Pending')}</span>
        </div>
        <div className="habit-meta-row">
          {habit.category ? <span className="chip">{habit.category}</span> : null}
          {habit.timeOfDay ? <span className="chip">{habit.timeOfDay}</span> : null}
        </div>
        <label className="habit-note-field">
          {t('Today note')}
          <input value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder={t('Optional note for today')} />
        </label>
      </div>
      <div className="card-actions habit-card-actions">
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
