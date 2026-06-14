import { Archive, Check, Trash2 } from 'lucide-react';
import { CancelButton } from './ActionButtons';
import { Modal } from './Modal';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  action?: 'archive' | 'delete' | 'confirm';
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  action = 'delete',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const Icon = action === 'archive' ? Archive : action === 'confirm' ? Check : Trash2;
  return (
    <Modal
      title={title}
      size="sm"
      panelClassName="dialog confirm-dialog"
      showClose={false}
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel} />
          <button
            className={cn(
              'inline-flex min-h-control items-center justify-center gap-2 whitespace-nowrap rounded-control border px-3.5 py-2.5 transition-[border-color,box-shadow,transform,background,color] duration-150 ease-out hover:-translate-y-px hover:shadow-[0_8px_22px_var(--shadow)]',
              confirmVariant === 'primary' &&
                'border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] text-app-accent-strong hover:border-[color-mix(in_srgb,var(--accent)_86%,var(--border))] hover:bg-[var(--button-bg-primary-hover)]',
              confirmVariant === 'danger' &&
                'border-[color-mix(in_srgb,var(--danger)_72%,var(--border))] bg-[var(--button-bg-danger)] text-app-danger hover:border-[color-mix(in_srgb,var(--danger)_88%,var(--border))] hover:bg-[var(--button-bg-danger-hover)] hover:text-[color-mix(in_srgb,var(--danger)_92%,white)]',
              action === 'archive' &&
                'border-[color-mix(in_srgb,var(--warning)_72%,var(--border))] bg-[var(--button-bg-warning)] text-app-warning hover:border-[color-mix(in_srgb,var(--warning)_86%,var(--border))] hover:bg-[var(--button-bg-warning-hover)] hover:text-[var(--warning-strong)]',
            )}
            type="button"
            onClick={onConfirm}
          >
            <Icon size={17} aria-hidden="true" />
            {t(confirmLabel)}
          </button>
        </>
      }
    >
        <p className="text-app-muted">{t(message)}</p>
    </Modal>
  );
}
