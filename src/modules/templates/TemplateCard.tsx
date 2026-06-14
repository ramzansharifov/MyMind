import { Copy, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
import { copyTextToClipboard, normalizeTemplateVariables, templatePreview, templateVariableLabel } from './templateUtils';
import type { TextTemplate } from './types';

interface TemplateCardProps {
  template: TextTemplate;
  onBuild: () => void;
  onEdit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
}

export function TemplateCard({ template, onBuild, onEdit, onPin, onArchive, onTrash }: TemplateCardProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  const variables = useMemo(() => normalizeTemplateVariables(template.variables, template.body), [template.variables, template.body]);

  async function copyTemplate() {
    await copyTextToClipboard(template.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className={cn(cardClass, template.pinnedAt && pinnedClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold text-app-text">{template.title}</h3>
          <small className="text-app-muted">{template.category || t('No category')}</small>
        </div>
        <span className={countPillClass}>{variables.length > 0 ? `${variables.length} ${t('variables')}` : t('plain')}</span>
      </div>

      <p className="line-clamp-4 min-h-[72px] whitespace-pre-wrap rounded-panel border border-app-border bg-app-surface-soft p-3 text-sm text-app-muted">{templatePreview(template.body)}</p>

      <div className="flex flex-wrap gap-2">
        {variables.slice(0, 5).map((variable) => (
          <span className={variableChipClass} key={`${variable.type}:${variable.name}`}>
            {templateVariableLabel(variable)}
          </span>
        ))}

        {variables.length > 5 ? <span className={chipClass}>+{variables.length - 5}</span> : null}

        {variables.length === 0 && template.tags.length === 0 ? <span className="text-sm text-app-muted">{t('Ready to copy as is.')}</span> : null}

        {template.tags.slice(0, 4).map((tag) => (
          <span className={chipClass} key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className={ghostButtonClass} type="button" onClick={() => void copyTemplate()}>
          <Copy size={17} aria-hidden="true" />
          <span>{t(copied ? 'Copied' : 'Copy')}</span>
        </button>

        <button className={primaryButtonClass} type="button" onClick={onBuild}>
          <Wand2 size={17} aria-hidden="true" />
          <span>{t(variables.length > 0 ? 'Build' : 'Preview')}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <PinButton isPinned={Boolean(template.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton
          label="Archive"
          onConfirm={onArchive}
          confirmTitle="Archive template?"
          confirmMessage="The template will be hidden from regular lists but kept in local SQLite storage."
        />
        <DeleteButton
          label="Move to trash"
          onConfirm={onTrash}
          confirmTitle="Move template to trash?"
          confirmMessage="The template will stay in trash for 30 days before permanent deletion."
        />
      </div>
    </article>
  );
}

const cardClass =
  'grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel transition-colors hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]';

const pinnedClass = 'border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]';

const countPillClass =
  'inline-flex w-fit shrink-0 items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-extrabold text-app-chip-text';

const chipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';

const variableChipClass =
  'inline-flex w-fit items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-strong))] px-2.5 py-1 text-xs font-bold text-app-accent-strong';

const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';

const primaryButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3 py-2.5 text-sm font-bold text-app-accent-strong transition-colors hover:border-[color-mix(in_srgb,var(--accent)_86%,var(--border))] hover:bg-[var(--button-bg-primary-hover)]';
