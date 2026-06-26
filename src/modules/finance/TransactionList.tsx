import { ArchiveButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n';
import { cn } from '../../shared/utils/classNames';
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
    <div className="grid gap-3">
      {transactions.map((transaction) => (
        <article className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel max-[900px]:grid-cols-1" key={transaction.id}>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn(moneyDotClass, transaction.type === 'income' ? 'bg-app-success' : 'bg-app-danger')} aria-hidden="true" />
              <h3 className="truncate text-base font-extrabold text-app-text">{transaction.title}</h3>
            </div>
            <small className="mt-1 block text-xs font-bold text-app-muted">
              {transaction.sourceOrCategory || t('Uncategorized')} / {accountTitle(transaction)} / {formatDate(transaction.date)}
            </small>
          </div>

          <div className="justify-self-end max-[900px]:justify-self-start">
            <strong className={cn('text-lg font-extrabold', transaction.type === 'income' ? 'text-app-success' : 'text-app-danger')}>
              {transaction.type === 'expense' ? '-' : '+'}
              {formatCurrency(transaction.amount, currency)}
            </strong>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 max-[900px]:justify-start">
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

const moneyDotClass = 'h-2.5 w-2.5 shrink-0 rounded-full';
