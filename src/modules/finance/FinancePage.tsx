import { useState, type FormEvent } from 'react';
import { AddButton, BackButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterBar } from '../../shared/components/FilterBar';
import { PageHeader } from '../../shared/components/PageHeader';
import { SearchInput } from '../../shared/components/SearchInput';
import { StatCard } from '../../shared/components/StatCard';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatCurrency } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import { currentBalance, filterTransactions, totalByType, transactionTags } from './financeUtils';
import { SavingsGoalCard } from './SavingsGoalCard';
import { SavingsGoalForm } from './SavingsGoalForm';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import type { FinanceData, FinanceTag, FinanceTagType, FinanceTransaction, SavingsGoal, TransactionType } from './types';

interface FinancePageProps {
  data: FinanceData;
  currency: string;
  onChange: (data: FinanceData) => void;
}

type OpenForm =
  | { kind: 'transaction'; type: TransactionType; item?: FinanceTransaction | null }
  | { kind: 'goal'; item?: SavingsGoal | null }
  | { kind: 'start-balance' }
  | null;

export function FinancePage({ data, currency, onChange }: FinancePageProps) {
  const [view, setView] = useState<'ledger' | 'goals'>('ledger');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [tag, setTag] = useState('');
  const [date, setDate] = useState('');
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<FinanceTagType>('both');
  const filtered = filterTransactions(data.transactions, query, type, tag, date);
  const { t } = useI18n();

  function saveTransaction(transaction: FinanceTransaction) {
    const exists = data.transactions.some((item) => item.id === transaction.id);
    onChange({
      ...data,
      transactions: exists
        ? data.transactions.map((item) => (item.id === transaction.id ? transaction : item))
        : [transaction, ...data.transactions],
    });
    setOpenForm(null);
  }

  function saveGoal(goal: SavingsGoal) {
    const exists = data.savingsGoals.some((item) => item.id === goal.id);
    onChange({
      ...data,
      savingsGoals: exists ? data.savingsGoals.map((item) => (item.id === goal.id ? goal : item)) : [goal, ...data.savingsGoals],
    });
    setOpenForm(null);
  }

  function saveStartingBalance(amount: number) {
    onChange({ ...data, startingBalance: amount, startedAt: data.startedAt ?? new Date().toISOString() });
    setOpenForm(null);
  }

  function resetFinance() {
    onChange({
      startingBalance: 0,
      startedAt: null,
      transactions: [],
      savingsGoals: [],
      tags: [],
    });
    setQuery('');
    setType('all');
    setTag('');
    setDate('');
    setView('ledger');
    setOpenForm({ kind: 'start-balance' });
  }

  function addTag() {
    if (!newTagName.trim()) {
      return;
    }
    const normalizedName = newTagName.trim();
    if (data.tags.some((tagItem) => tagItem.name.toLowerCase() === normalizedName.toLowerCase())) {
      setNewTagName('');
      return;
    }
    const createdAt = new Date().toISOString();
    const nextTag: FinanceTag = {
      id: createId('tag'),
      name: normalizedName,
      type: newTagType,
      description: '',
      createdAt,
    };
    onChange({ ...data, tags: [...data.tags, nextTag] });
    setNewTagName('');
  }

  if (view === 'goals') {
    return (
      <section>
        <PageHeader
          title="Savings goals"
          subtitle="A focused place for money targets without crowding the finance ledger."
          actions={
            <>
              <BackButton label="Back to finance" onClick={() => setView('ledger')} />
              <AddButton label="Add savings goal" onClick={() => setOpenForm({ kind: 'goal' })} />
            </>
          }
        />
        <div className="card-grid">
          {data.savingsGoals.map((goal) => (
            <SavingsGoalCard
              goal={goal}
              key={goal.id}
              onEdit={() => setOpenForm({ kind: 'goal', item: goal })}
              onDelete={() => onChange({ ...data, savingsGoals: data.savingsGoals.filter((item) => item.id !== goal.id) })}
            />
          ))}
        </div>
        {data.savingsGoals.length === 0 ? <EmptyState title="No savings goals" message="Create a goal when you want to track a target amount." /> : null}
        {openForm?.kind === 'goal' ? <SavingsGoalForm goal={openForm.item} onCancel={() => setOpenForm(null)} onSave={saveGoal} /> : null}
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title="Finance"
        subtitle="Starting balance, income, expenses, and tags for local financial tracking."
        actions={
          <>
            <AddButton label="Income" onClick={() => setOpenForm({ kind: 'transaction', type: 'income' })} />
            <AddButton label="Expense" onClick={() => setOpenForm({ kind: 'transaction', type: 'expense' })} />
            <button className="button ghost" type="button" onClick={() => setView('goals')}>
              {t('Savings goals')}
            </button>
          </>
        }
      />
      <div className="stats-grid">
        <StatCard label="Starting balance" value={formatCurrency(data.startingBalance, currency)} detail={data.startedAt ? t('Financial tracking started') : t('Not set')} />
        <StatCard label="Balance" value={formatCurrency(currentBalance(data.transactions, data.startingBalance), currency)} />
        <StatCard label="Income" value={formatCurrency(totalByType(data.transactions, 'income'), currency)} />
        <StatCard label="Expenses" value={formatCurrency(totalByType(data.transactions, 'expense'), currency)} />
        <StatCard label="Savings goals" value={data.savingsGoals.length} />
      </div>
      <section className="panel section-block finance-start-panel">
        <div className="card-title-row">
          <div>
            <h2>{t('Financial start')}</h2>
            <p className="muted-text">{t('Set the amount you already have before adding income and expenses.')}</p>
          </div>
          <div className="card-actions">
            <EditButton label={data.startedAt ? 'Edit starting balance' : 'Set starting balance'} onClick={() => setOpenForm({ kind: 'start-balance' })} />
            <DeleteButton
              iconOnly={false}
              label="Reset finance"
              confirmTitle="Reset finance?"
              confirmMessage="This clears starting balance, transactions, tags, and savings goals so you can start again."
              onConfirm={resetFinance}
            />
          </div>
        </div>
      </section>
      <section className="panel section-block">
        <h2>{t('Expense tags')}</h2>
        <div className="chart-list">
          {expenseTagTotals(data.transactions).map((item) => (
            <div className="chart-row" key={item.tag}>
              <span>{item.tag}</span>
              <div>
                <i style={{ width: `${item.percent}%` }} />
              </div>
              <strong>{formatCurrency(item.total, currency)}</strong>
            </div>
          ))}
        </div>
      </section>
      <FilterBar>
        <SearchInput value={query} placeholder="Search transactions" onChange={setQuery} />
        <label>
          {t('Type')}
          <select value={type} onChange={(event) => setType(event.target.value as TransactionType | 'all')}>
            <option value="all">{t('All')}</option>
            <option value="income">{t('Income')}</option>
            <option value="expense">{t('Expense')}</option>
          </select>
        </label>
        <label>
          {t('Tag')}
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">{t('All')}</option>
            {[...new Set([...transactionTags(data.transactions), ...data.tags.map((item) => item.name)])].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Date')}
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </FilterBar>
      <div className="two-column">
        <section className="panel">
          <h2>{t('Transactions')}</h2>
          {filtered.length === 0 ? (
            <EmptyState title="No transactions" message="Add income or expenses to build your local ledger." />
          ) : (
            <TransactionList
              transactions={filtered}
              currency={currency}
              onEdit={(transaction) => setOpenForm({ kind: 'transaction', type: transaction.type, item: transaction })}
              onDelete={(transaction) =>
                onChange({ ...data, transactions: data.transactions.filter((item) => item.id !== transaction.id) })
              }
            />
          )}
        </section>
        <section className="panel finance-tags-panel">
          <h2>{t('Tags')}</h2>
          <p className="muted-text">{t('Create tags for income, expenses, or both. These tags appear as quick choices in the transaction form.')}</p>
          <div className="inline-form inline-form-three">
            <input placeholder={t('Tag name')} value={newTagName} onChange={(event) => setNewTagName(event.target.value)} />
            <select value={newTagType} onChange={(event) => setNewTagType(event.target.value as FinanceTagType)}>
              <option value="both">{t('Both')}</option>
              <option value="income">{t('Income')}</option>
              <option value="expense">{t('Expense')}</option>
            </select>
            <AddButton label="Add tag" onClick={addTag} />
          </div>
          <div className="chip-row">
            {data.tags.map((item) => (
              <span className={`chip tag-chip tag-${item.type}`} key={item.id}>
                {item.name} / {t(item.type)}
                <DeleteButton
                  label="Delete tag"
                  className="chip-delete"
                  onConfirm={() => onChange({ ...data, tags: data.tags.filter((tagItem) => tagItem.id !== item.id) })}
                  confirmTitle="Delete tag?"
                />
              </span>
            ))}
          </div>
        </section>
      </div>
      {openForm?.kind === 'transaction' ? (
        <TransactionForm
          type={openForm.type}
          transaction={openForm.item}
          tags={data.tags}
          onCancel={() => setOpenForm(null)}
          onSave={saveTransaction}
        />
      ) : null}
      {openForm?.kind === 'goal' ? <SavingsGoalForm goal={openForm.item} onCancel={() => setOpenForm(null)} onSave={saveGoal} /> : null}
      {openForm?.kind === 'start-balance' ? (
        <StartingBalanceForm
          value={data.startingBalance}
          onCancel={() => setOpenForm(null)}
          onSave={saveStartingBalance}
        />
      ) : null}
    </section>
  );
}

function StartingBalanceForm({ value, onCancel, onSave }: { value: number; onCancel: () => void; onSave: (amount: number) => void }) {
  const [amount, setAmount] = useState(String(value));
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(Number.parseFloat(amount) || 0);
  }

  return (
    <EntityForm title="Starting balance" saveLabel="Save" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Amount')}
        <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
    </EntityForm>
  );
}

function expenseTagTotals(transactions: FinanceTransaction[]) {
  const totals = new Map<string, number>();
  for (const transaction of transactions.filter((item) => item.type === 'expense')) {
    const tags = transaction.tags.length ? transaction.tags : ['untagged'];
    for (const tag of tags) {
      totals.set(tag, (totals.get(tag) ?? 0) + transaction.amount);
    }
  }
  const max = Math.max(...totals.values(), 1);
  return Array.from(totals.entries())
    .map(([tag, total]) => ({ tag, total, percent: Math.max(4, (total / max) * 100) }))
    .sort((a, b) => b.total - a.total);
}
