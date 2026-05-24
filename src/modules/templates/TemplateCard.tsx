import { Copy, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { copyTextToClipboard, templatePreview } from './templateUtils';
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

  async function copyTemplate() {
    await copyTextToClipboard(template.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className={`card template-card ${template.pinnedAt ? 'pinned' : ''}`}>
      <div className="card-title-row">
        <div>
          <h3>{template.title}</h3>
          <small>{template.category || t('No category')}</small>
        </div>
        <span className="rating-pill">{template.variables.length > 0 ? `${template.variables.length} ${t('variables')}` : t('plain')}</span>
      </div>
      <p className="template-card-preview">{templatePreview(template.body)}</p>
      <div className="chip-row template-card-chips">
        {template.variables.slice(0, 5).map((variable) => (
          <span className="chip template-variable-chip" key={variable}>{`{{${variable}}}`}</span>
        ))}
        {template.variables.length > 5 ? <span className="chip">+{template.variables.length - 5}</span> : null}
        {template.variables.length === 0 && template.tags.length === 0 ? <span className="muted-text">{t('Ready to copy as is.')}</span> : null}
        {template.tags.slice(0, 4).map((tag) => (
          <span className="chip" key={tag}>{tag}</span>
        ))}
      </div>
      <div className="template-primary-actions">
        <button className="button ghost" type="button" onClick={() => void copyTemplate()}>
          <Copy size={17} aria-hidden="true" />
          <span>{t(copied ? 'Copied' : 'Copy')}</span>
        </button>
        <button className="button primary" type="button" onClick={onBuild}>
          <Wand2 size={17} aria-hidden="true" />
          <span>{t(template.variables.length > 0 ? 'Build' : 'Preview')}</span>
        </button>
      </div>
      <div className="card-actions">
        <PinButton isPinned={Boolean(template.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton label="Archive" onConfirm={onArchive} confirmTitle="Archive template?" confirmMessage="The template will be hidden from regular lists but kept in local JSON storage." />
        <DeleteButton label="Move to trash" onConfirm={onTrash} confirmTitle="Move template to trash?" confirmMessage="The template will stay in trash for 30 days before permanent deletion." />
      </div>
    </article>
  );
}
