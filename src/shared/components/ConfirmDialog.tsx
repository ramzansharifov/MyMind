import { Archive, Check, Trash2 } from 'lucide-react';
import { CancelButton } from './ActionButtons';
import { Modal } from './Modal';
import { useI18n } from '../i18n/I18nProvider';

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
          <button className={`button ${confirmVariant} ${action === 'archive' ? 'archive' : ''}`} type="button" onClick={onConfirm}>
            <Icon size={17} aria-hidden="true" />
            {t(confirmLabel)}
          </button>
        </>
      }
    >
        <p>{t(message)}</p>
    </Modal>
  );
}
