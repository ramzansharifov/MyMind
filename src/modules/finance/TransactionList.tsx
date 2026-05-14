import { ArchiveButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import type { FinanceTransaction } from './types';

interface TransactionListProps {
  transactions: FinanceTransaction[];
  currency: string;
  onEdit: (transaction: FinanceTransaction) => void;
  onArchive: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}

export function TransactionList({ transactions, currency, onEdit, onArchive, onDelete }: TransactionListProps) {
  const { t } = useI18n();
  return (
    <div className="stack finance-transaction-list">
      {transactions.map((transaction) => (
        <article className="card finance-transaction-card" key={transaction.id}>
          <span className={`money-dot ${transaction.type}`} aria-hidden="true" />
          <div className="finance-transaction-main">
            <h3>{transaction.title}</h3>
            <small>
              {transaction.sourceOrCategory || t('Uncategorized')} / {formatDate(transaction.date)}
            </small>
          </div>
          <div className="finance-transaction-side">
            <strong className={`transaction-amount ${transaction.type}`}>
              {transaction.type === 'expense' ? '-' : '+'}
              {formatCurrency(transaction.amount, currency)}
            </strong>
          </div>
          <div className="card-actions finance-transaction-actions">
            <EditButton onClick={() => onEdit(transaction)} />
            <ArchiveButton
              label="Archive transaction"
              onConfirm={() => onArchive(transaction)}
              confirmTitle="Archive transaction?"
              confirmMessage="The transaction will be hidden from the ledger, balance, and charts, but kept in archive."
            />
            <DeleteButton
              label="Move to trash"
              onConfirm={() => onDelete(transaction)}
              confirmTitle="Move transaction to trash?"
              confirmMessage="The transaction will stay in trash for 30 days before permanent deletion."
            />
          </div>
        </article>
      ))}
    </div>
  );
}
