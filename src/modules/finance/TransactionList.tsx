import { DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import type { FinanceTransaction } from './types';

interface TransactionListProps {
  transactions: FinanceTransaction[];
  currency: string;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}

export function TransactionList({ transactions, currency, onEdit, onDelete }: TransactionListProps) {
  const { t } = useI18n();
  return (
    <div className="stack">
      {transactions.map((transaction) => (
        <article className="card list-card" key={transaction.id}>
          <span className={`money-dot ${transaction.type}`} />
          <div>
            <h3>{transaction.title}</h3>
            <small>
              {transaction.sourceOrCategory || t('Uncategorized')} / {formatDate(transaction.date)}
            </small>
          </div>
          <strong>{formatCurrency(transaction.amount, currency)}</strong>
          <div className="card-actions compact">
            <EditButton onClick={() => onEdit(transaction)} />
            <DeleteButton onConfirm={() => onDelete(transaction)} confirmTitle="Delete transaction?" />
          </div>
        </article>
      ))}
    </div>
  );
}
