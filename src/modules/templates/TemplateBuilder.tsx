import { Copy, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import { useI18n } from '../../shared/i18n';
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
      panelClassName="max-w-[760px]"
      onClose={onClose}
      footer={
        <>
          <button className={ghostButtonClass} type="button" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className={primaryButtonClass} type="button" onClick={() => void copyOutput()}>
            <Copy size={17} aria-hidden="true" />
            <span>{t(copied ? 'Copied' : 'Copy result')}</span>
          </button>
        </>
      }
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-strong))] px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-app-accent-strong">
        <Wand2 size={15} aria-hidden="true" />
        {t('Build text')}
      </span>

      {variables.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
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
        <p className="text-sm text-app-muted">{t('This template has no variables.')}</p>
      )}

      <label>
        {t('Result')}
        <textarea className="min-h-[220px] font-mono text-sm" rows={9} readOnly value={output} />
      </label>
    </Modal>
  );
}

const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';

const primaryButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3.5 py-2.5 text-sm font-bold text-app-accent-strong transition-colors hover:border-[color-mix(in_srgb,var(--accent)_86%,var(--border))] hover:bg-[var(--button-bg-primary-hover)]';
