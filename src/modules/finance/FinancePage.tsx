import { lazy, Suspense, useState, type FormEvent } from 'react';
import { AddButton, DeleteButton, EditButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EntityForm } from '../../shared/components/EntityForm';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { PageTabs } from '../../shared/components/PageTabs';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, trashEntity } from '../../shared/utils/archiveUtils';
import { cn } from '../../shared/utils/classNames';
import { formatCurrency } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import { Minus } from 'lucide-react';
import {
  accountBalance,
  filterTransactions,
  getFinanceAccounts,
  resolveTransactionAccountId,
  totalBalance,
  transactionTags,
} from './financeUtils';
import { FinanceAccountCard } from './FinanceAccountCard';
import { FinanceAccountForm } from './FinanceAccountForm';
import { SavingsGoalCard } from './SavingsGoalCard';
import { SavingsGoalForm } from './SavingsGoalForm';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import type {
  FinanceAccount,
  FinanceData,
  FinanceTag,
  FinanceTagType,
  FinanceTransaction,
  SavingsGoal,
  TransactionType,
} from './types';

const FinanceChartsSection = lazy(() => import('./FinanceChartsSection').then((module) => ({ default: module.FinanceChartsSection })));

interface FinancePageProps {
  data: FinanceData;
  currency: string;
  onChange: (data: FinanceData) => void;
}

type OpenForm =
  | { kind: 'transaction'; type: TransactionType; item?: FinanceTransaction | null }
  | { kind: 'goal'; item?: SavingsGoal | null }
  | { kind: 'account'; item?: FinanceAccount | null }
  | { kind: 'start-balance' }
  | null;

type FinanceView = 'ledger' | 'goals' | 'charts' | 'settings';

export function FinancePage({ data, currency, onChange }: FinancePageProps) {
  const [view, setView] = useState<FinanceView>('ledger');
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<FinanceTagType>('both');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  const { t } = useI18n();

  const accounts = getFinanceAccounts(data);
  const fallbackAccountId = accounts[0]?.id ?? '';
  const balance = totalBalance(data);

  const searchedTransactions = filterTransactions(data.transactions, query, 'all', '', date);
  const filtered = searchedTransactions.filter((transaction) => {
    const matchesType = types.length === 0 || types.includes(transaction.type);
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => transaction.tags.includes(tag));

    return matchesType && matchesTags;
  });

  const availableTransactionTags = [...new Set([...transactionTags(data.transactions), ...data.tags.map((item) => item.name)])];
  const activeFilterCount = types.length + selectedTags.length + (date ? 1 : 0);
  const incomeTags = data.tags.filter((tag) => tag.type === 'income' || tag.type === 'both');
  const expenseTags = data.tags.filter((tag) => tag.type === 'expense' || tag.type === 'both');

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

  function saveAccount(account: FinanceAccount) {
    const existingAccounts = data.accounts && data.accounts.length > 0 ? data.accounts : accounts;
    const exists = existingAccounts.some((item) => item.id === account.id);

    onChange({
      ...data,
      accounts: exists
        ? existingAccounts.map((item) => (item.id === account.id ? account : item))
        : [...existingAccounts, account],
      startedAt: data.startedAt ?? new Date().toISOString(),
    });

    setOpenForm(null);
  }

  function deleteAccount(accountId: string) {
    const existingAccounts = data.accounts && data.accounts.length > 0 ? data.accounts : accounts;

    if (existingAccounts.length <= 1) {
      return;
    }

    const timestamp = new Date().toISOString();
    const remainingAccounts = existingAccounts.filter((account) => account.id !== accountId);
    const nextAccountId = remainingAccounts[0]?.id ?? null;

    onChange({
      ...data,
      accounts: remainingAccounts,
      transactions: data.transactions.map((transaction) => {
        const resolvedAccountId = resolveTransactionAccountId(transaction, fallbackAccountId);

        if (resolvedAccountId !== accountId) {
          return transaction;
        }

        return {
          ...transaction,
          accountId: nextAccountId,
          updatedAt: timestamp,
        };
      }),
    });
  }

  function resetFinance() {
    onChange({
      startingBalance: 0,
      startedAt: null,
      accounts: [],
      transactions: [],
      savingsGoals: [],
      tags: [],
    });

    setQuery('');
    setTypes([]);
    setSelectedTags([]);
    setDate('');
    setView('settings');
    setOpenForm({ kind: 'account' });
  }

  function addTag() {
    if (!newTagName.trim()) {
      return;
    }

    const normalizedName = newTagName.trim();

    if (data.tags.some((tagItem) => tagItem.id !== editingTagId && tagItem.name.toLowerCase() === normalizedName.toLowerCase())) {
      setNewTagName('');
      setEditingTagId(null);
      return;
    }

    if (editingTagId) {
      onChange({
        ...data,
        tags: data.tags.map((tagItem) =>
          tagItem.id === editingTagId ? { ...tagItem, name: normalizedName, type: newTagType } : tagItem,
        ),
      });

      setNewTagName('');
      setNewTagType('both');
      setEditingTagId(null);
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

  function startEditTag(tag: FinanceTag) {
    setEditingTagId(tag.id);
    setNewTagName(tag.name);
    setNewTagType(tag.type);
  }

  function toggleTypeFilter(value: TransactionType) {
    setTypes((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleTransactionTag(value: string) {
    setSelectedTags((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function clearFinanceFilters() {
    setTypes([]);
    setSelectedTags([]);
    setDate('');
  }

  return (
    <section>
      <PageHeader
        title="Finance"
        subtitle="Accounts, starting balances, income, expenses, goals, and tags for local financial tracking."
      />

      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-3 [backdrop-filter:var(--glass-blur)] shadow-panel">
        <PageTabs tabs={financeTabs} activeTab={view} ariaLabel="Finance sections" onChange={setView} />

        <div className="flex flex-wrap items-center gap-2">
          {view === 'ledger' ? (
            <>
              <AddButton label="Income" onClick={() => setOpenForm({ kind: 'transaction', type: 'income' })} />
              <button className={dangerButtonClass} type="button" onClick={() => setOpenForm({ kind: 'transaction', type: 'expense' })}>
                <Minus size={17} aria-hidden="true" />
                <span>{t('Expense')}</span>
              </button>
            </>
          ) : null}

          {view === 'goals' ? <AddButton label="Add savings goal" onClick={() => setOpenForm({ kind: 'goal' })} /> : null}

          {view === 'settings' ? <AddButton label="Add account" onClick={() => setOpenForm({ kind: 'account' })} /> : null}
        </div>
      </div>

      {view === 'ledger' ? (
        <>
          <section className={panelClass}>
            <div className="flex items-start justify-between gap-4 max-[700px]:flex-col">
              <div>
                <h2 className="text-xl font-extrabold text-app-text">{t('Total balance')}</h2>
                <p className="text-app-muted">{t('Combined balance across all accounts.')}</p>
              </div>
              <strong className="text-3xl font-extrabold text-app-accent-strong">{formatCurrency(balance, currency)}</strong>
            </div>
          </section>

          <CollapsibleFilters
            query={query}
            placeholder="Search transactions"
            isOpen={filtersOpen}
            activeCount={activeFilterCount}
            onQueryChange={setQuery}
            onToggle={() => setFiltersOpen((current) => !current)}
          >
            <div className={filterChoiceGroupClass}>
              <div className={filterChoiceHeadingClass}>
                <strong className="text-app-text">{t('Type')}</strong>
                {types.length > 0 ? <button className={filterClearInlineClass} type="button" onClick={() => setTypes([])}>{t('Clear')}</button> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {transactionTypeFilters.map((item) => (
                  <button className={cn(filterChipClass, types.includes(item) && filterChipActiveClass)} type="button" key={item} onClick={() => toggleTypeFilter(item)}>
                    {t(item === 'income' ? 'Income' : 'Expense')}
                  </button>
                ))}
              </div>
            </div>

            <div className={filterChoiceGroupClass}>
              <div className={filterChoiceHeadingClass}>
                <strong className="text-app-text">{t('Tag')}</strong>
                {selectedTags.length > 0 ? <button className={filterClearInlineClass} type="button" onClick={() => setSelectedTags([])}>{t('Clear')}</button> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTransactionTags.length > 0 ? availableTransactionTags.map((item) => (
                  <button className={cn(filterChipClass, selectedTags.includes(item) && filterChipActiveClass)} type="button" key={item} onClick={() => toggleTransactionTag(item)}>
                    {item}
                  </button>
                )) : <span className="text-sm text-app-muted">{t('No tags yet.')}</span>}
              </div>
            </div>

            <div className={filterChoiceGroupClass}>
              <div className={filterChoiceHeadingClass}>
                <strong className="text-app-text">{t('Date')}</strong>
                {date ? <button className={filterClearInlineClass} type="button" onClick={() => setDate('')}>{t('Clear')}</button> : null}
              </div>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>

            {activeFilterCount > 0 ? <button className={ghostButtonClass} type="button" onClick={clearFinanceFilters}>{t('Clear filters')}</button> : null}
          </CollapsibleFilters>

          <section className={panelClass}>
            <h2 className="mb-3 text-xl font-extrabold text-app-text">{t('Transactions')}</h2>
            {filtered.length === 0 ? (
              <EmptyState title="No transactions" message="Add income or expenses to build your local ledger." />
            ) : (
              <TransactionList
                transactions={filtered}
                accounts={accounts}
                currency={currency}
                onEdit={(transaction) => setOpenForm({ kind: 'transaction', type: transaction.type, item: transaction })}
                onArchive={(transaction) =>
                  onChange({ ...data, transactions: data.transactions.map((item) => (item.id === transaction.id ? archiveEntity(item) : item)) })
                }
                onDelete={(transaction) =>
                  onChange({ ...data, transactions: data.transactions.map((item) => (item.id === transaction.id ? trashEntity(item) : item)) })
                }
              />
            )}
          </section>
        </>
      ) : null}

      {view === 'goals' ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
            {data.savingsGoals.map((goal) => (
              <SavingsGoalCard
                goal={goal}
                currency={currency}
                availableBalance={balance}
                key={goal.id}
                onEdit={() => setOpenForm({ kind: 'goal', item: goal })}
                onDelete={() => onChange({ ...data, savingsGoals: data.savingsGoals.filter((item) => item.id !== goal.id) })}
              />
            ))}
          </div>

          {data.savingsGoals.length === 0 ? <EmptyState title="No savings goals" message="Create a goal when you want to track a target amount." /> : null}
        </>
      ) : null}

      {view === 'charts' ? (
        <Suspense fallback={<LoadingState title="Loading charts" message="Preparing finance analytics..." variant="compact" />}>
          <FinanceChartsSection data={data} currency={currency} />
        </Suspense>
      ) : null}

      {view === 'settings' ? (
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-[18px] max-[1100px]:grid-cols-1">
          <section className={panelClass}>
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--line-soft)] pb-3 max-[760px]:flex-col">
              <div>
                <h2 className="text-xl font-extrabold text-app-text">{t('Accounts')}</h2>
                <p className="text-app-muted">{t('Create separate accounts with their own starting balances.')}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AddButton label="Add account" onClick={() => setOpenForm({ kind: 'account' })} />
                <DeleteButton
                  iconOnly={false}
                  label="Reset finance"
                  confirmTitle="Reset finance?"
                  confirmMessage="This clears accounts, transactions, tags, and savings goals so you can start again."
                  onConfirm={resetFinance}
                />
              </div>
            </div>

            <div className="mb-4 grid gap-0.5 rounded-panel border border-app-border bg-app-surface-soft p-3">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-app-muted">{t('Total balance')}</span>
              <strong className="text-2xl text-app-accent-strong">{formatCurrency(balance, currency)}</strong>
              <small className="text-app-muted">{t('Across all accounts')}</small>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
              {accounts.map((account) => (
                <FinanceAccountCard
                  account={account}
                  balance={accountBalance(account, data.transactions, fallbackAccountId)}
                  currency={currency}
                  canDelete={accounts.length > 1}
                  key={account.id}
                  onEdit={() => setOpenForm({ kind: 'account', item: account })}
                  onDelete={() => deleteAccount(account.id)}
                />
              ))}
            </div>
          </section>

          <section className={panelClass}>
            <h2 className="text-xl font-extrabold text-app-text">{t('Tag builder')}</h2>
            <p className="mt-1 text-app-muted">{t('Create tags for income, expenses, or both. These tags appear as quick choices in the transaction form.')}</p>

            <div className="my-4 grid gap-3 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3">
              <input placeholder={t('Tag name')} value={newTagName} onChange={(event) => setNewTagName(event.target.value)} />

              <div className="flex flex-wrap gap-2">
                {financeTagTypes.map((item) => (
                  <button className={cn(filterChipClass, newTagType === item && filterChipActiveClass)} type="button" key={item} onClick={() => setNewTagType(item)}>
                    {t(item === 'both' ? 'Both' : item === 'income' ? 'Income' : 'Expense')}
                  </button>
                ))}
              </div>

              <AddButton label={editingTagId ? 'Save tag' : 'Add tag'} onClick={addTag} />
            </div>

            <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
              <FinanceTagGroup title="Income tags" variant="income" tags={incomeTags} data={data} onEdit={startEditTag} onChange={onChange} />
              <FinanceTagGroup title="Expense tags" variant="expense" tags={expenseTags} data={data} onEdit={startEditTag} onChange={onChange} />
            </div>
          </section>
        </div>
      ) : null}

      {openForm?.kind === 'transaction' ? (
        <TransactionForm
          type={openForm.type}
          transaction={openForm.item}
          tags={data.tags}
          accounts={accounts}
          onCancel={() => setOpenForm(null)}
          onSave={saveTransaction}
        />
      ) : null}

      {openForm?.kind === 'goal' ? <SavingsGoalForm goal={openForm.item} onCancel={() => setOpenForm(null)} onSave={saveGoal} /> : null}

      {openForm?.kind === 'account' ? (
        <FinanceAccountForm
          account={openForm.item}
          onCancel={() => setOpenForm(null)}
          onSave={saveAccount}
        />
      ) : null}

      {openForm?.kind === 'start-balance' ? (
        <StartingBalanceForm
          value={data.startingBalance}
          onCancel={() => setOpenForm(null)}
          onSave={(amount) => {
            onChange({ ...data, startingBalance: amount, startedAt: data.startedAt ?? new Date().toISOString() });
            setOpenForm(null);
          }}
        />
      ) : null}
    </section>
  );
}

function FinanceTagGroup({
  title,
  variant,
  tags,
  data,
  onEdit,
  onChange,
}: {
  title: string;
  variant: TransactionType;
  tags: FinanceTag[];
  data: FinanceData;
  onEdit: (tag: FinanceTag) => void;
  onChange: (data: FinanceData) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-2 rounded-panel border border-app-border bg-app-surface-soft p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold text-app-text">{t(title)}</h3>
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-app-border bg-app-chip px-2 text-xs font-extrabold text-app-chip-text">{tags.length}</span>
      </div>

      <div className="grid gap-2">
        {tags.map((item) => (
          <div className={cn(tagCardClass, variant === 'income' ? 'border-[color-mix(in_srgb,var(--success)_34%,var(--border))]' : 'border-[color-mix(in_srgb,var(--danger)_34%,var(--border))]')} key={`${title}-${item.id}`}>
            <div className="min-w-0">
              <strong className="block truncate text-sm text-app-text">{item.name}</strong>
              <small className="text-xs text-app-muted">{t(item.type === 'both' ? 'Both' : item.type === 'income' ? 'Income' : 'Expense')}</small>
            </div>

            <div className="flex items-center gap-2">
              <EditButton onClick={() => onEdit(item)} />
              <DeleteButton
                label="Delete tag"
                onConfirm={() => onChange({ ...data, tags: data.tags.filter((tagItem) => tagItem.id !== item.id) })}
                confirmTitle="Delete tag?"
              />
            </div>
          </div>
        ))}

        {tags.length === 0 ? <span className="text-sm text-app-muted">{t('No tags yet.')}</span> : null}
      </div>
    </div>
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

const transactionTypeFilters: TransactionType[] = ['income', 'expense'];
const financeTagTypes: FinanceTagType[] = ['both', 'income', 'expense'];

const financeTabs: Array<{ id: FinanceView; label: string }> = [
  { id: 'ledger', label: 'Transactions' },
  { id: 'goals', label: 'Savings goals' },
  { id: 'settings', label: 'Settings' },
  { id: 'charts', label: 'Charts' },
];

const panelClass =
  'mb-[18px] rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel';

const dangerButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--danger)_72%,var(--border))] bg-[var(--button-bg-danger)] px-3.5 py-2.5 text-sm font-bold text-app-danger transition-colors hover:border-[color-mix(in_srgb,var(--danger)_88%,var(--border))] hover:bg-[var(--button-bg-danger-hover)]';

const ghostButtonClass =
  'inline-flex min-h-control w-fit items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';

const filterChoiceGroupClass = 'grid gap-2';

const filterChoiceHeadingClass = 'flex items-center justify-between gap-3 text-sm';

const filterClearInlineClass = 'text-xs font-bold text-app-accent-strong transition-colors hover:text-app-text';

const filterChipClass =
  'inline-flex min-h-9 items-center gap-2 rounded-full border border-app-border bg-app-chip px-3 py-1.5 text-sm font-bold text-app-chip-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_46%,var(--border))] hover:bg-app-surface-strong';

const filterChipActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_70%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-strong))] text-app-accent-strong';

const tagCardClass =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-panel border bg-app-surface p-2.5';
