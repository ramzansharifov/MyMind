import { useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import type { FinanceAccount } from './types';

interface FinanceAccountFormProps {
    account?: FinanceAccount | null;
    onCancel: () => void;
    onSave: (account: FinanceAccount) => void;
}

export function FinanceAccountForm({ account, onCancel, onSave }: FinanceAccountFormProps) {
    const [title, setTitle] = useState(account?.title ?? '');
    const [startingBalance, setStartingBalance] = useState(String(account?.startingBalance ?? 0));
    const [description, setDescription] = useState(account?.description ?? '');
    const { t } = useI18n();

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const timestamp = new Date().toISOString();

        onSave({
            id: account?.id ?? createId('account'),
            title: title.trim() || 'Untitled account',
            startingBalance: Number.parseFloat(startingBalance) || 0,
            description: description.trim(),
            createdAt: account?.createdAt ?? timestamp,
            updatedAt: timestamp,
        });
    }

    return (
        <EntityForm title={account ? 'Edit account' : 'Add account'} saveLabel="Save account" onCancel={onCancel} onSubmit={submit}>
            <label>
                {t('Account name')}
                <input required value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label>
                {t('Starting balance')}
                <input
                    type="number"
                    value={startingBalance}
                    onChange={(event) => setStartingBalance(event.target.value)}
                />
            </label>

            <label>
                {t('Description')}
                <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
        </EntityForm>
    );
}