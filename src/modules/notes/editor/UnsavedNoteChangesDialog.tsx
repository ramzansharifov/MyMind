import { Modal } from '../../../shared/components/Modal';
import { useI18n } from '../../../shared/i18n/I18nProvider';

interface UnsavedNoteChangesDialogProps {
  message?: string;
  saveLabel?: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedNoteChangesDialog({
  message = 'Save this note before switching modules?',
  saveLabel = 'Save and switch',
  onCancel,
  onDiscard,
  onSave,
}: UnsavedNoteChangesDialogProps) {
  const { t } = useI18n();

  return (
    <Modal
      title="Unsaved note changes"
      size="sm"
      panelClassName="confirm-dialog"
      onClose={onCancel}
      footer={
        <>
          <button className="button ghost" type="button" onClick={onCancel}>
            {t('Stay in editor')}
          </button>
          <button className="button danger" type="button" onClick={onDiscard}>
            {t('Leave without saving')}
          </button>
          <button className="button primary" type="button" onClick={onSave}>
            {t(saveLabel)}
          </button>
        </>
      }
    >
      <p>{t(message)}</p>
    </Modal>
  );
}
