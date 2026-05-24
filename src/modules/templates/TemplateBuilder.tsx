import { Copy, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CloseButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { copyTextToClipboard, renderTemplate } from './templateUtils';
import type { TextTemplate } from './types';

interface TemplateBuilderProps {
  template: TextTemplate;
  onClose: () => void;
}

export function TemplateBuilder({ template, onClose }: TemplateBuilderProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  const output = useMemo(() => renderTemplate(template.body, values), [template.body, values]);

  async function copyOutput() {
    await copyTextToClipboard(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      className="dialog-backdrop form-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="panel form-panel template-builder" role="dialog" aria-modal="true" aria-labelledby="template-builder-title">
        <div className="form-heading">
          <div>
            <span className="template-builder-kicker">
              <Wand2 size={15} aria-hidden="true" />
              {t('Build text')}
            </span>
            <h2 id="template-builder-title">{template.title}</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        {template.variables.length > 0 ? (
          <div className="template-builder-fields">
            {template.variables.map((variable) => (
              <label key={variable}>
                {variable}
                <input value={values[variable] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [variable]: event.target.value }))} />
              </label>
            ))}
          </div>
        ) : (
          <p className="muted-text">{t('This template has no variables.')}</p>
        )}
        <label>
          {t('Result')}
          <textarea className="template-result" rows={9} readOnly value={output} />
        </label>
        <div className="form-actions">
          <button className="button ghost" type="button" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="button primary" type="button" onClick={() => void copyOutput()}>
            <Copy size={17} aria-hidden="true" />
            <span>{t(copied ? 'Copied' : 'Copy result')}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
