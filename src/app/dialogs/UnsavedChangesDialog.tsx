import { AppButton, CancelButton, SaveButton } from '../../shared/ui/buttons';
import { Modal } from '../../shared/ui/modal';

interface UnsavedChangesDialogProps {
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedChangesDialog({ onCancel, onDiscard, onSave }: UnsavedChangesDialogProps) {
  return (
    <Modal
      title="Несохранённые изменения"
      subtitle="Сохрани или отбрось изменения перед переходом в другой модуль."
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel}>Отмена</CancelButton>
          <AppButton label="Discard" variant="danger" type="button" onClick={onDiscard}>
            Отбросить
          </AppButton>
          <SaveButton label="Сохранить" type="button" onClick={onSave} />
        </>
      }
    >
      <p className="text-app-muted">В текущем редакторе есть несохранённые изменения.</p>
    </Modal>
  );
}
