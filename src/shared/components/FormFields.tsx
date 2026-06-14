import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useI18n } from '../i18n/I18nProvider';

interface BaseFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, hint, children }: BaseFieldProps) {
  const { t } = useI18n();

  return (
    <label className="grid gap-[7px] text-[13px] text-app-muted">
      <span className="font-bold text-app-muted">{t(label)}</span>
      {children}
      {hint ? <small className="text-app-muted leading-snug">{t(hint)}</small> : null}
    </label>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function TextField({ label, hint, ...props }: TextFieldProps) {
  return (
    <FormField label={label} hint={hint}>
      <input {...props} />
    </FormField>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextareaField({ label, hint, rows = 4, ...props }: TextareaFieldProps) {
  return (
    <FormField label={label} hint={hint}>
      <textarea rows={rows} {...props} />
    </FormField>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({ label, hint, options, ...props }: SelectFieldProps) {
  const { t } = useI18n();

  return (
    <FormField label={label} hint={hint}>
      <select {...props}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {t(option.label)}
          </option>
        ))}
      </select>
    </FormField>
  );
}
