import { useMemo, useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import { extractTemplateVariables } from './templateUtils';
import type { TextTemplate } from './types';

interface TemplateFormProps {
  template?: TextTemplate | null;
  onCancel: () => void;
  onSave: (template: TextTemplate) => void;
}

export function TemplateForm({ template, onCancel, onSave }: TemplateFormProps) {
  const [title, setTitle] = useState(template?.title ?? '');
  const [category, setCategory] = useState(template?.category ?? '');
  const [tags, setTags] = useState(joinCsv(template?.tags ?? []));
  const [body, setBody] = useState(template?.body ?? '');
  const variables = useMemo(() => extractTemplateVariables(body), [body]);
  const { t } = useI18n();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: template?.id ?? createId('template'),
      title: title.trim() || 'Untitled template',
      body: body.trim(),
      category: category.trim(),
      tags: splitCsv(tags),
      variables,
      pinnedAt: template?.pinnedAt ?? null,
      archivedAt: template?.archivedAt ?? null,
      trashedAt: template?.trashedAt ?? null,
      trashExpiresAt: template?.trashExpiresAt ?? null,
      createdAt: template?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={template ? 'Edit template' : 'Add template'} saveLabel="Save template" onCancel={onCancel} onSubmit={submit} wide>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          {t('Category')}
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label>
          {t('Tags')}
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t('Comma-separated names')} />
        </label>
      </div>
      <label>
        {t('Template text')}
        <textarea
          className="template-form-body"
          rows={12}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('Use {{name}} to add variables.')}
        />
      </label>
      <div className="template-variable-panel">
        <strong>{t('Variables')}</strong>
        {variables.length > 0 ? (
          <div className="chip-row">
            {variables.map((variable) => (
              <span className="chip" key={variable}>{variable}</span>
            ))}
          </div>
        ) : (
          <span className="muted-text">{t('No variables detected.')}</span>
        )}
      </div>
    </EntityForm>
  );
}
