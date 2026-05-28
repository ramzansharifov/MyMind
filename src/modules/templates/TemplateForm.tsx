import { useMemo, useRef, useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { ContentGroup } from '../../shared/types/common';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import { createVariableToken, extractTemplateVariables } from './templateUtils';
import type { TemplateVariableType, TextTemplate } from './types';

interface TemplateFormProps {
  template?: TextTemplate | null;
  groups?: ContentGroup[];
  defaultGroupId?: string | null;
  onCancel: () => void;
  onSave: (template: TextTemplate) => void;
}

export function TemplateForm({ template, groups = [], defaultGroupId = null, onCancel, onSave }: TemplateFormProps) {
  const [title, setTitle] = useState(template?.title ?? '');
  const [category, setCategory] = useState(template?.category ?? '');
  const [groupId, setGroupId] = useState<string | null>(template?.groupId ?? defaultGroupId ?? null);
  const [tags, setTags] = useState(joinCsv(template?.tags ?? []));
  const [body, setBody] = useState(template?.body ?? '');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const variables = useMemo(() => extractTemplateVariables(body), [body]);
  const { t } = useI18n();

  function getUniqueVariableName(type: TemplateVariableType, baseName: string) {
    const usedNames = new Set(
      variables
        .filter((variable) => variable.type === type)
        .map((variable) => variable.name),
    );

    if (!usedNames.has(baseName)) {
      return baseName;
    }

    let index = 2;
    let nextName = `${baseName}${index}`;

    while (usedNames.has(nextName)) {
      index += 1;
      nextName = `${baseName}${index}`;
    }

    return nextName;
  }

  function insertTokenAtCursor(token: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setBody((currentBody) => `${currentBody}${currentBody ? '\n' : ''}${token}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const before = body.slice(0, start);
    const after = body.slice(end);
    const nextBody = `${before}${token}${after}`;

    setBody(nextBody);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function addTextVariable() {
    const name = getUniqueVariableName('text', 'text');
    const token = createVariableToken('text', name);

    insertTokenAtCursor(token);
  }

  function addDateVariable() {
    const token = createVariableToken('date', 'today');

    insertTokenAtCursor(token);
  }

  function addNumberedListVariable() {
    const name = getUniqueVariableName('numberedList', 'items');
    const token = createVariableToken('numberedList', name);

    insertTokenAtCursor(token);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const timestamp = new Date().toISOString();

    onSave({
      id: template?.id ?? createId('template'),
      title: title.trim() || 'Untitled template',
      body: body.trim(),
      category: category.trim(),
      groupId,
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

      {groups.length > 0 ? (
        <label>
          {t('Group')}
          <select value={groupId ?? ''} onChange={(event) => setGroupId(event.target.value || null)}>
            <option value="">{t('No group')}</option>
            {groups.map((group) => (
              <option value={group.id} key={group.id}>
                {group.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="template-variable-toolbar">
        <button className="button ghost" type="button" onClick={addTextVariable}>
          {t('Add text variable')}
        </button>

        <button className="button ghost" type="button" onClick={addDateVariable}>
          {t('Add date variable')}
        </button>

        <button className="button ghost" type="button" onClick={addNumberedListVariable}>
          {t('Add numbered list')}
        </button>
      </div>

      <label>
        {t('Template text')}
        <textarea
          ref={textareaRef}
          className="template-form-body"
          rows={12}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('Use buttons above to add variables automatically.')}
        />
      </label>

      <div className="template-variable-panel">
        <strong>{t('Variables')}</strong>

        {variables.length > 0 ? (
          <div className="chip-row">
            {variables.map((variable) => (
              <span className="chip" key={`${variable.type}:${variable.name}`}>
                {variable.type === 'date'
                  ? `date: ${variable.name}`
                  : variable.type === 'numberedList'
                    ? `list: ${variable.name}`
                    : `text: ${variable.name}`}
              </span>
            ))}
          </div>
        ) : (
          <span className="muted-text">{t('No variables detected.')}</span>
        )}
      </div>
    </EntityForm>
  );
}