import { DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import type { SavingsGoal } from './types';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
}

export function SavingsGoalCard({ goal, onEdit, onDelete }: SavingsGoalCardProps) {
  const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  const { t } = useI18n();
  return (
    <article className="card">
      <div className="card-title-row">
        <h3>{goal.title}</h3>
        <span>{progress}%</span>
      </div>
      <div className="progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p>
        {formatCurrency(goal.currentAmount)} {t('of')} {formatCurrency(goal.targetAmount)}
      </p>
      <small>{t('Deadline')} {formatDate(goal.deadline)}</small>
      <div className="card-actions">
        <EditButton onClick={onEdit} />
        <DeleteButton onConfirm={onDelete} confirmTitle="Delete savings goal?" />
      </div>
    </article>
  );
}
