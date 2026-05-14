import type { BaseEntity } from '../../shared/types/common';

export type TransactionType = 'income' | 'expense';
export type FinanceTagType = TransactionType | 'both';

export interface FinanceTransaction extends BaseEntity {
  type: TransactionType;
  amount: number;
  title: string;
  description: string;
  tags: string[];
  sourceOrCategory: string;
  date: string;
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
  transactions: FinanceTransaction[];
  savingsGoals: SavingsGoal[];
  tags: FinanceTag[];
}
