import { DeleteButton, EditButton } from '../../shared/components/ActionButtons';
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
}

export function HabitCard({ habit, isCompleted, note, onToggle, onNoteChange, onEdit, onRemove }: HabitCardProps) {
  const { t } = useI18n();
  return (
    <article className={`card habit-card ${isCompleted ? 'completed' : ''}`}>
      <input type="checkbox" checked={isCompleted} onChange={onToggle} aria-label={habit.title} />
      <div className="habit-card-body">
        <div className="card-title-row">
          <div>
            <h3>{habit.title}</h3>
            <p>{habit.description || t('No description.')}</p>
          </div>
          <span className="rating-pill">{isCompleted ? t('Completed') : t('Pending')}</span>
        </div>
        <label className="habit-note-field">
          {t('Today note')}
          <input value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder={t('Optional note for today')} />
        </label>
      </div>
      <div className="card-actions compact">
        <EditButton onClick={onEdit} />
        <DeleteButton
          label="Remove from active"
          onConfirm={onRemove}
          confirmTitle="Remove habit from active list?"
          confirmMessage="Past habit history will be kept."
        />
      </div>
    </article>
  );
}
