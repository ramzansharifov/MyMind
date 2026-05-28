import { Copy, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { copyTextToClipboard, createVariableKey, formatTemplateDate, normalizeTemplateVariables, renderTemplate } from './templateUtils';
import type { TextTemplate } from './types';

interface TemplateBuilderProps {
  template: TextTemplate;
  onClose: () => void;
}

export function TemplateBuilder({ template, onClose }: TemplateBuilderProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const variables = useMemo(() => normalizeTemplateVariables(template.variables, template.body), [template.variables, template.body]);
  const output = useMemo(() => renderTemplate(template.body, values), [template.body, values]);

  async function copyOutput() {
    await copyTextToClipboard(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function setVariableValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <Modal
      title={template.title}
      size="md"
      className="form-modal-backdrop"
      panelClassName="form-panel template-builder"
      onClose={onClose}
      footer={
        <>
          <button className="button ghost" type="button" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="button primary" type="button" onClick={() => void copyOutput()}>
            <Copy size={17} aria-hidden="true" />
            <span>{t(copied ? 'Copied' : 'Copy result')}</span>
          </button>
        </>
      }
    >
      <span className="template-builder-kicker">
        <Wand2 size={15} aria-hidden="true" />
        {t('Build text')}
      </span>

      {variables.length > 0 ? (
        <div className="template-builder-fields">
          {variables.map((variable) => {
            const key = createVariableKey(variable);

            if (variable.type === 'date') {
              return (
                <label key={key}>
                  {variable.name}
                  <input
                    type="date"
                    value={values[key] ?? ''}
                    onChange={(event) => setVariableValue(key, event.target.value)}
                  />
                  <small>{formatTemplateDate(values[key])}</small>
                </label>
              );
            }

            if (variable.type === 'numberedList') {
              return (
                <label key={key}>
                  {variable.name}
                  <textarea
                    rows={6}
                    value={values[key] ?? ''}
                    onChange={(event) => setVariableValue(key, event.target.value)}
                    placeholder={t('Write each item on a new line.')}
                  />
                </label>
              );
            }

            return (
              <label key={key}>
                {variable.name}
                <input value={values[key] ?? ''} onChange={(event) => setVariableValue(key, event.target.value)} />
              </label>
            );
          })}
        </div>
      ) : (
        <p className="muted-text">{t('This template has no variables.')}</p>
      )}

      <label>
        {t('Result')}
        <textarea className="template-result" rows={9} readOnly value={output} />
      </label>
    </Modal>
  );
}
