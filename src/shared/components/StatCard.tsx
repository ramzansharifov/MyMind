import { useI18n } from '../i18n';

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  const { t } = useI18n();
  return (
    <article className="grid gap-1.5 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]">
      <span className="text-app-muted">{t(label)}</span>
      <strong className="text-2xl">{value}</strong>
      {detail ? <small className="text-app-muted">{t(detail)}</small> : null}
    </article>
  );
}
