import { useI18n } from '../i18n/I18nProvider';

interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, placeholder, onChange }: SearchInputProps) {
  const { t } = useI18n();
  return (
    <label className="search-input">
      <span>{t('Search')}</span>
      <input value={value} placeholder={t(placeholder)} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
