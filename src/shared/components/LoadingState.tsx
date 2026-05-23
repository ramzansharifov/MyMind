interface LoadingStateProps {
  title?: string;
  message?: string;
  detail?: string;
  variant?: 'page' | 'panel' | 'compact' | 'overlay';
  className?: string;
}

export function LoadingState({
  title = 'Loading',
  message = 'Preparing your workspace...',
  detail,
  variant = 'panel',
  className = '',
}: LoadingStateProps) {
  const classes = ['loading-panel', `loading-panel-${variant}`, className].filter(Boolean).join(' ');

  return (
    <section className={classes} aria-busy="true" aria-live="polite">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="loading-copy">
        <strong>{title}</strong>
        <span>{message}</span>
        {detail ? <small>{detail}</small> : null}
      </div>
    </section>
  );
}

export function LoadingOverlay({ title = 'Loading', message = 'Opening tools...' }: Pick<LoadingStateProps, 'title' | 'message'>) {
  return (
    <div className="loading-overlay">
      <LoadingState title={title} message={message} variant="overlay" />
    </div>
  );
}
