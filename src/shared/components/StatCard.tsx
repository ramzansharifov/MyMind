import { useI18n } from '../i18n/I18nProvider';

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  const { t } = useI18n();
  return (
    <article className="stat-card">
      <span>{t(label)}</span>
      <strong>{value}</strong>
      {detail ? <small>{t(detail)}</small> : null}
    </article>
  );
}
