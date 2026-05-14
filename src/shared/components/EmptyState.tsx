import { useI18n } from '../i18n/I18nProvider';

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  const { t } = useI18n();
  return (
    <section className="empty-state">
      <strong>{t(title)}</strong>
      <span>{t(message)}</span>
    </section>
  );
}
