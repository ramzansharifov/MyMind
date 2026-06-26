import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/forms';
import { useI18n } from '../../shared/i18n';
import { createId } from '../../shared/utils/idGenerator';
import type { FinanceAccount, FinanceTag, FinanceTransaction, TransactionType } from './types';

interface TransactionFormProps {
  type: TransactionType;
  transaction?: FinanceTransaction | null;
  tags: FinanceTag[];
  accounts: FinanceAccount[];
  onCancel: () => void;
  onSave: (transaction: FinanceTransaction) => void;
}

export function TransactionForm({ type, transaction, tags: availableTags, accounts, onCancel, onSave }: TransactionFormProps) {
  const [nextType, setNextType] = useState<TransactionType>(transaction?.type ?? type);
  const [title, setTitle] = useState(transaction?.title ?? '');
  const [amount, setAmount] = useState(String(transaction?.amount ?? 0));
  const [date, setDate] = useState(transaction?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState(transaction?.accountId ?? accounts[0]?.id ?? '');
  const [selectedTag, setSelectedTag] = useState(transaction?.tags?.[0] ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');

  const visibleTags = availableTags.filter((tag) => tag.type === 'both' || tag.type === nextType);
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const timestamp = new Date().toISOString();

    onSave({
      id: transaction?.id ?? createId('transaction'),
      type: nextType,
      amount: Math.max(0, Number.parseFloat(amount) || 0),
      title: title.trim(),
      description: description.trim(),
      tags: selectedTag ? [selectedTag] : [],
      sourceOrCategory: selectedTag,
      date,
      accountId: selectedAccountId || accounts[0]?.id || null,
      createdAt: transaction?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={transaction ? 'Edit transaction' : 'Add transaction'} saveLabel="Save transaction" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Type')}
        <select value={nextType} onChange={(event) => setNextType(event.target.value as TransactionType)}>
          <option value="income">{t('Income')}</option>
          <option value="expense">{t('Expense')}</option>
        </select>
      </label>

      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        <label>
          {t('Amount')}
          <input
            required
            type="number"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <label>
          {t('Date')}
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      <label>
        {t('Account')}
        <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
          {accounts.map((account) => (
            <option value={account.id} key={account.id}>
              {account.title}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t(nextType === 'income' ? 'Income source tag' : 'Expense category tag')}
        <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
          <option value="">{t('No tag')}</option>
          {visibleTags.map((tag) => (
            <option value={tag.name} key={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        {visibleTags.length === 0 ? <small>{t('No tags for this transaction type yet.')}</small> : null}
      </label>

      <label>
        {t('Description')}
        <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
    </EntityForm>
  );
}
