import { useI18n } from '../i18n';

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  const { t } = useI18n();
  return (
    <section className="grid min-h-[220px] place-content-center gap-2 rounded-panel border border-[var(--glass-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_96%,transparent),color-mix(in_srgb,var(--surface-soft)_92%,transparent))] p-7 text-center text-app-muted [backdrop-filter:var(--glass-blur)] shadow-panel">
      <strong className="text-app-text">{t(title)}</strong>
      <span>{t(message)}</span>
    </section>
  );
}
