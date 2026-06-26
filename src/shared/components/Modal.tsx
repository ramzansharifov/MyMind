import type { ReactNode } from 'react';
import { CloseButton } from './ActionButtons';
import { ModalPortal } from './ModalPortal';
import { useI18n } from '../i18n';
import { cn } from '../utils/classNames';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
  panelClassName?: string;
  labelledBy?: string;
  closeOnBackdrop?: boolean;
  showClose?: boolean;
  onClose: () => void;
}

export function Modal({
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  className = '',
  panelClassName = '',
  labelledBy,
  closeOnBackdrop = true,
  showClose = true,
  onClose,
}: ModalProps) {
  const { t } = useI18n();
  const titleId = labelledBy ?? (title ? `modal-${slugify(title)}-title` : undefined);

  return (
    <ModalPortal>
      <div
        className={cn(
          'fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--backdrop)_86%,transparent)] p-6 [backdrop-filter:blur(14px)_saturate(125%)]',
          className,
        )}
        role="presentation"
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <section
          className={cn(
            'grid max-h-[calc(100vh-48px)] gap-3.5 overflow-auto rounded-panel border border-[color-mix(in_srgb,var(--accent)_32%,var(--glass-border))]',
            'bg-[var(--panel-bg)] p-[18px] text-app-text [backdrop-filter:var(--glass-blur)] shadow-modal',
            size === 'sm' && 'w-[min(420px,100%)]',
            size === 'md' && 'w-[min(560px,100%)]',
            size === 'lg' && 'w-[min(920px,100%)]',
            size === 'xl' && 'w-[min(1120px,100%)]',
            panelClassName,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {(title || showClose) ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                {title ? <h2 id={titleId} className="text-lg font-extrabold text-app-text">{t(title)}</h2> : null}
                {subtitle ? <p className="mt-1 text-app-muted">{t(subtitle)}</p> : null}
              </div>
              {showClose ? <CloseButton data-modal-close="true" onClick={onClose} /> : null}
            </div>
          ) : null}
          <div className="grid min-w-0 gap-3.5">{children}</div>
          {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line-soft)] pt-3">{footer}</div> : null}
        </section>
      </div>
    </ModalPortal>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
