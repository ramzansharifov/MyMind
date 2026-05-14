import { isHiddenFromRegularLists } from '../../shared/utils/archiveUtils';
import type { FinanceTransaction, TransactionType } from './types';

export function totalByType(transactions: FinanceTransaction[], type: TransactionType) {
  return visibleTransactions(transactions).filter((transaction) => transaction.type === type).reduce((sum, item) => sum + item.amount, 0);
}

export function currentBalance(transactions: FinanceTransaction[], startingBalance = 0) {
  return startingBalance + totalByType(transactions, 'income') - totalByType(transactions, 'expense');
}

export function transactionTags(transactions: FinanceTransaction[]) {
  return Array.from(new Set(visibleTransactions(transactions).flatMap((transaction) => transaction.tags))).sort();
}

export function filterTransactions(
  transactions: FinanceTransaction[],
  query: string,
  type: TransactionType | 'all',
  tag: string,
  date: string,
) {
  const normalized = query.trim().toLowerCase();
  return visibleTransactions(transactions)
    .filter((transaction) => {
      const matchesQuery =
        !normalized ||
        transaction.title.toLowerCase().includes(normalized) ||
        transaction.description.toLowerCase().includes(normalized) ||
        transaction.sourceOrCategory.toLowerCase().includes(normalized);
      const matchesType = type === 'all' || transaction.type === type;
      const matchesTag = !tag || transaction.tags.includes(tag);
      const matchesDate = !date || transaction.date.slice(0, 10) === date;
      return matchesQuery && matchesType && matchesTag && matchesDate;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function visibleTransactions(transactions: FinanceTransaction[]) {
  return transactions.filter((transaction) => !isHiddenFromRegularLists(transaction));
}
