import type { ReactNode } from 'react';
import { CloseButton } from './ActionButtons';
import { ModalPortal } from './ModalPortal';
import { useI18n } from '../i18n/I18nProvider';

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
        className={['dialog-backdrop app-modal-backdrop', className].filter(Boolean).join(' ')}
        role="presentation"
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <section
          className={['panel app-modal-panel', `app-modal-panel-${size}`, panelClassName].filter(Boolean).join(' ')}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {(title || showClose) ? (
            <div className="form-heading app-modal-heading">
              <div>
                {title ? <h2 id={titleId}>{t(title)}</h2> : null}
                {subtitle ? <p className="muted-text">{t(subtitle)}</p> : null}
              </div>
              {showClose ? <CloseButton onClick={onClose} /> : null}
            </div>
          ) : null}
          <div className="app-modal-body">{children}</div>
          {footer ? <div className="form-actions app-modal-footer">{footer}</div> : null}
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
