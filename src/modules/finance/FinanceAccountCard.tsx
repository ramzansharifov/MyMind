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
        <article className="card finance-account-card">
            <div className="card-title-row">
                <div>
                    <h3>{account.title}</h3>
                    <small>{account.description || t('No description')}</small>
                </div>
                <span className="rating-pill">{formatCurrency(balance, currency)}</span>
            </div>

            <div className="finance-start-value">
                <span>{t('Starting balance')}</span>
                <strong>{formatCurrency(account.startingBalance, currency)}</strong>
                <small>{t('Current account balance')}</small>
            </div>

            <div className="card-actions">
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