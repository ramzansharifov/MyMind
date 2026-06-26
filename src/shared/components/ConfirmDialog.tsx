import { Archive, Check, Trash2 } from 'lucide-react';
import { AppButton, CancelButton } from './ActionButtons';
import { Modal } from './Modal';
import { useI18n } from '../i18n';

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
      showClose={false}
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel} />
          <AppButton
            label={confirmLabel}
            variant={action === 'archive' ? 'archive' : confirmVariant}
            icon={<Icon size={17} aria-hidden="true" />}
            type="button"
            onClick={onConfirm}
          />
        </>
      }
    >
        <p className="text-app-muted">{t(message)}</p>
    </Modal>
  );
}
