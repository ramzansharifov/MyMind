interface LoadingStateProps {
  title?: string;
  message?: string;
  detail?: string;
  variant?: 'page' | 'panel' | 'compact' | 'overlay';
  className?: string;
}

const orbitClass =
  'relative grid h-[58px] w-[58px] animate-spin place-items-center rounded-full border-2 border-transparent bg-[linear-gradient(var(--surface),var(--surface))_padding-box,conic-gradient(from_0deg,transparent,var(--accent),var(--accent-strong),transparent)_border-box] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent),0_14px_34px_color-mix(in_srgb,var(--accent)_20%,transparent)] before:h-6 before:w-6 before:rounded-full before:bg-[color-mix(in_srgb,var(--accent)_20%,var(--surface))] before:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-strong)_34%,transparent)] before:content-[\'\']';
const compactOrbitClass =
  'relative grid h-[38px] w-[38px] animate-spin place-items-center rounded-full border-2 border-transparent bg-[linear-gradient(var(--surface),var(--surface))_padding-box,conic-gradient(from_0deg,transparent,var(--accent),var(--accent-strong),transparent)_border-box] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent),0_14px_34px_color-mix(in_srgb,var(--accent)_20%,transparent)] before:h-4 before:w-4 before:rounded-full before:bg-[color-mix(in_srgb,var(--accent)_20%,var(--surface))] before:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-strong)_34%,transparent)] before:content-[\'\']';

export function LoadingState({
  title = 'Loading',
  message = 'Preparing your workspace...',
  detail,
  variant = 'panel',
  className = '',
}: LoadingStateProps) {
  const classes = [
    'relative grid min-h-60 grid-cols-[auto_minmax(0,max-content)] place-content-center place-items-center gap-[18px] overflow-hidden rounded-panel border border-[var(--glass-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_96%,transparent),color-mix(in_srgb,var(--surface-soft)_92%,transparent))] p-7 text-left text-app-muted [backdrop-filter:var(--glass-blur)] shadow-panel',
    variant === 'page' && 'min-h-[min(640px,calc(100vh-96px))]',
    variant === 'compact' && 'min-h-[110px] grid-cols-[auto_minmax(0,1fr)] p-[18px]',
    variant === 'overlay' && 'min-h-[190px] w-[min(440px,100%)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} aria-busy="true" aria-live="polite">
      <div className={variant === 'compact' ? compactOrbitClass : orbitClass} aria-hidden="true">
        <span className="absolute top-[3px] h-[9px] w-[9px] rounded-full bg-app-accent-strong shadow-[0_0_18px_color-mix(in_srgb,var(--accent-strong)_80%,transparent)]" />
        <span className="absolute bottom-[9px] right-1 h-1.5 w-1.5 rounded-full bg-app-accent-strong opacity-80 shadow-[0_0_18px_color-mix(in_srgb,var(--accent-strong)_80%,transparent)]" />
      </div>
      <div className="relative z-[1] grid max-w-[min(420px,100%)] gap-1">
        <strong className="text-lg text-app-text">{title}</strong>
        <span className="text-app-muted">{message}</span>
        {detail ? <small className="text-xs text-app-muted">{detail}</small> : null}
      </div>
    </section>
  );
}

export function LoadingOverlay({ title = 'Loading', message = 'Opening tools...' }: Pick<LoadingStateProps, 'title' | 'message'>) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[color-mix(in_srgb,var(--backdrop)_86%,transparent)] p-6 [backdrop-filter:blur(12px)]">
      <LoadingState title={title} message={message} variant="overlay" />
    </div>
  );
}
