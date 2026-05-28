import { ArchiveButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { formatCurrency } from '../../shared/utils/formatters';
import { resolveTransactionAccountId } from './financeUtils';
import type { FinanceAccount, FinanceTransaction } from './types';

interface TransactionListProps {
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
  currency: string;
  onEdit: (transaction: FinanceTransaction) => void;
  onArchive: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}

export function TransactionList({ transactions, accounts, currency, onEdit, onArchive, onDelete }: TransactionListProps) {
  const { t } = useI18n();
  const fallbackAccountId = accounts[0]?.id ?? '';
  const accountMap = new Map(accounts.map((account) => [account.id, account.title]));

  function accountTitle(transaction: FinanceTransaction) {
    const accountId = resolveTransactionAccountId(transaction, fallbackAccountId);

    return accountMap.get(accountId) ?? t('Unknown account');
  }

  return (
    <div className="stack finance-transaction-list">
      {transactions.map((transaction) => (
        <article className="card finance-transaction-card" key={transaction.id}>
          <div className="finance-transaction-main">
            <div className="finance-transaction-title">
              <span className={`money-dot ${transaction.type}`} aria-hidden="true" />
              <h3>{transaction.title}</h3>
            </div>
            <small>
              {transaction.sourceOrCategory || t('Uncategorized')} / {accountTitle(transaction)} / {formatDate(transaction.date)}
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