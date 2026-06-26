import { useI18n } from '../i18n';

interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, placeholder, onChange }: SearchInputProps) {
  const { t } = useI18n();
  return (
    <label className="grid gap-1.5 text-[13px] text-app-muted">
      <span>{t('Search')}</span>
      <input
        className="min-h-11 border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_90%,var(--accent)_10%)] focus:border-[color-mix(in_srgb,var(--accent)_74%,var(--border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
        value={value}
        placeholder={t(placeholder)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
