import { isHiddenFromRegularLists } from "../../shared/utils/archiveUtils";
import type {
  FinanceAccount,
  FinanceData,
  FinanceTransaction,
  TransactionType,
} from "./types";

export const LEGACY_ACCOUNT_ID = "legacy-main-account";

export function createLegacyAccount(data: FinanceData): FinanceAccount {
  const timestamp = data.startedAt ?? new Date().toISOString();

  return {
    id: LEGACY_ACCOUNT_ID,
    title: "Main account",
    startingBalance: data.startingBalance ?? 0,
    description: "Default account created from the previous starting balance.",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getFinanceAccounts(data: FinanceData) {
  if (data.accounts && data.accounts.length > 0) {
    return data.accounts;
  }

  return [createLegacyAccount(data)];
}

export function resolveTransactionAccountId(
  transaction: FinanceTransaction,
  fallbackAccountId = LEGACY_ACCOUNT_ID,
) {
  return transaction.accountId || fallbackAccountId;
}

export function visibleTransactions(transactions: FinanceTransaction[]) {
  return transactions.filter(
    (transaction) => !isHiddenFromRegularLists(transaction),
  );
}

export function totalByType(
  transactions: FinanceTransaction[],
  type: TransactionType,
  accountId?: string,
  fallbackAccountId = LEGACY_ACCOUNT_ID,
) {
  return visibleTransactions(transactions)
    .filter((transaction) => transaction.type === type)
    .filter(
      (transaction) =>
        !accountId ||
        resolveTransactionAccountId(transaction, fallbackAccountId) ===
          accountId,
    )
    .reduce((sum, item) => sum + item.amount, 0);
}

export function currentBalance(
  transactions: FinanceTransaction[],
  startingBalance = 0,
) {
  return (
    startingBalance +
    totalByType(transactions, "income") -
    totalByType(transactions, "expense")
  );
}

export function accountBalance(
  account: FinanceAccount,
  transactions: FinanceTransaction[],
  fallbackAccountId = account.id,
) {
  const accountTransactions = visibleTransactions(transactions).filter(
    (transaction) =>
      resolveTransactionAccountId(transaction, fallbackAccountId) ===
      account.id,
  );

  const income = accountTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expense = accountTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return account.startingBalance + income - expense;
}

export function totalStartingBalance(accounts: FinanceAccount[]) {
  return accounts.reduce((sum, account) => sum + account.startingBalance, 0);
}

export function totalBalance(data: FinanceData) {
  const accounts = getFinanceAccounts(data);
  const fallbackAccountId = accounts[0]?.id ?? LEGACY_ACCOUNT_ID;

  return accounts.reduce(
    (sum, account) =>
      sum + accountBalance(account, data.transactions, fallbackAccountId),
    0,
  );
}

export function transactionsByAccount(
  transactions: FinanceTransaction[],
  accountId: string,
  fallbackAccountId = LEGACY_ACCOUNT_ID,
) {
  return visibleTransactions(transactions).filter(
    (transaction) =>
      resolveTransactionAccountId(transaction, fallbackAccountId) === accountId,
  );
}

export function transactionTags(transactions: FinanceTransaction[]) {
  return Array.from(
    new Set(
      visibleTransactions(transactions).flatMap(
        (transaction) => transaction.tags,
      ),
    ),
  ).sort();
}

export function filterTransactions(
  transactions: FinanceTransaction[],
  query: string,
  type: TransactionType | "all",
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

      const matchesType = type === "all" || transaction.type === type;
      const matchesTag = !tag || transaction.tags.includes(tag);
      const matchesDate = !date || transaction.date.slice(0, 10) === date;

      return matchesQuery && matchesType && matchesTag && matchesDate;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
