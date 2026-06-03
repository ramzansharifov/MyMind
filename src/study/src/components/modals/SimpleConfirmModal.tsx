import { BaseModal } from "./BaseModal";

interface SimpleConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SimpleConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Подтвердить",
  onCancel,
  onConfirm,
}: SimpleConfirmModalProps) {
  if (!open) return null;

  return (
    <BaseModal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="border border-black bg-white px-4 py-2 text-sm hover:bg-black hover:text-white"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="border border-black bg-black px-4 py-2 text-sm text-white"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="whitespace-pre-wrap text-sm leading-6">
        {message}
      </p>
    </BaseModal>
  );
}
