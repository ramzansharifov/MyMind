import { DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatCurrency } from '../../shared/utils/formatters';
import type { FinanceAccount } from './types';

interface FinanceAccountCardProps {
    account: FinanceAccount;
    balance: number;
    currency: string;
    canDelete: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

export function FinanceAccountCard({ account, balance, currency, canDelete, onEdit, onDelete }: FinanceAccountCardProps) {
    const { t } = useI18n();

    return (
        <article className="grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-base font-extrabold text-app-text">{account.title}</h3>
                    <small className="text-app-muted">{account.description || t('No description')}</small>
                </div>
                <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text">{formatCurrency(balance, currency)}</span>
            </div>

            <div className="grid gap-0.5 rounded-panel border border-app-border bg-app-surface-soft p-3">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-app-muted">{t('Starting balance')}</span>
                <strong className="text-xl text-app-text">{formatCurrency(account.startingBalance, currency)}</strong>
                <small className="text-app-muted">{t('Current account balance')}</small>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
                <EditButton onClick={onEdit} />
                {canDelete ? (
                    <DeleteButton
                        label="Delete account"
                        confirmTitle="Delete account?"
                        confirmMessage="Transactions from this account will be moved to another available account."
                        onConfirm={onDelete}
                    />
                ) : null}
            </div>
        </article>
    );
}
