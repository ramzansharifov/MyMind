import { useI18n } from '../../shared/i18n/I18nProvider';

export function ChartsSection() {
  const { t } = useI18n();

  return (
    <section className="panel section-block workout-section-panel">
      <div className="section-heading">
        <div>
          <h2>{t('Charts & Analytics')}</h2>
          <p className="muted-text">{t('View your training progress, nutrition trends, and metrics over time.')}</p>
        </div>
      </div>
      <div className="workout-placeholder">
        <h3>{t('Charts coming soon')}</h3>
        <p>{t('Training progress, body metrics, nutrition trends, and cross-signals will appear here.')}</p>
      </div>
    </section>
  );
}
