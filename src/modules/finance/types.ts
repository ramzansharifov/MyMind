import type { BaseEntity } from '../../shared/types/common';

export type TransactionType = 'income' | 'expense';
export type FinanceTagType = TransactionType | 'both';

export interface FinanceAccount extends BaseEntity {
  title: string;
  startingBalance: number;
  description: string;
}

export interface FinanceTransaction extends BaseEntity {
  type: TransactionType;
  amount: number;
  title: string;
  description: string;
  tags: string[];
  sourceOrCategory: string;
  date: string;
  accountId?: string | null;
}

export interface SavingsGoal extends BaseEntity {
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  description: string;
}

export interface FinanceTag {
  id: string;
  name: string;
  type: FinanceTagType;
  description: string;
  createdAt: string;
}

export interface FinanceData {
  startingBalance: number;
  startedAt: string | null;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  savingsGoals: SavingsGoal[];
  tags: FinanceTag[];
}
