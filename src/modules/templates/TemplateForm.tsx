import { useMemo, useRef, useState, type FormEvent } from 'react';
import { EntityForm } from '../../shared/forms';
import { useI18n } from '../../shared/i18n';
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

      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
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

      <div className="flex flex-wrap gap-2 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3">
        <button className={ghostButtonClass} type="button" onClick={addTextVariable}>
          {t('Add text variable')}
        </button>

        <button className={ghostButtonClass} type="button" onClick={addDateVariable}>
          {t('Add date variable')}
        </button>

        <button className={ghostButtonClass} type="button" onClick={addNumberedListVariable}>
          {t('Add numbered list')}
        </button>
      </div>

      <label>
        {t('Template text')}
        <textarea
          ref={textareaRef}
          className="min-h-[260px] font-mono text-sm"
          rows={12}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('Use buttons above to add variables automatically.')}
        />
      </label>

      <div className="grid gap-2 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3">
        <strong className="text-sm font-extrabold text-app-text">{t('Variables')}</strong>

        {variables.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => (
              <span className={chipClass} key={`${variable.type}:${variable.name}`}>
                {variable.type === 'date'
                  ? `date: ${variable.name}`
                  : variable.type === 'numberedList'
                    ? `list: ${variable.name}`
                    : `text: ${variable.name}`}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-app-muted">{t('No variables detected.')}</span>
        )}
      </div>
    </EntityForm>
  );
}

const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';

const chipClass =
  'inline-flex w-fit items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-strong))] px-2.5 py-1 text-xs font-bold text-app-accent-strong';
