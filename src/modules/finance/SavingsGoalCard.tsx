import { DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import type { SavingsGoal } from './types';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  currency: string;
  availableBalance: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function SavingsGoalCard({ goal, currency, availableBalance, onEdit, onDelete }: SavingsGoalCardProps) {
  const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((availableBalance / goal.targetAmount) * 100)) : 0;
  const { t } = useI18n();
  return (
    <article className="grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-base font-extrabold text-app-text">{goal.title}</h3>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-app-border bg-app-surface-soft">
        <span className="block h-full rounded-full bg-app-accent-strong" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-app-muted">{formatCurrency(availableBalance, currency)} {t('of')} {formatCurrency(goal.targetAmount, currency)}</p>
      <small className="text-xs font-bold text-app-muted">{t('Deadline')} {formatDate(goal.deadline)}</small>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <EditButton onClick={onEdit} />
        <DeleteButton onConfirm={onDelete} confirmTitle="Delete savings goal?" />
      </div>
    </article>
  );
}
