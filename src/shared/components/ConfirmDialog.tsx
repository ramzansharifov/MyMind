import { Archive, Check, Trash2 } from 'lucide-react';
import { CancelButton } from './ActionButtons';
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
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{t(title)}</h2>
        <p>{t(message)}</p>
        <div className="dialog-actions">
          <CancelButton onClick={onCancel} />
          <button className={`button ${confirmVariant}`} type="button" onClick={onConfirm}>
            <Icon size={17} aria-hidden="true" />
            {t(confirmLabel)}
          </button>
        </div>
      </div>
    </div>
  );
}
