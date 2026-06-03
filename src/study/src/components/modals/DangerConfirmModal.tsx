import { useEffect, useRef, useState, type FormEvent } from "react";
import { BaseModal } from "./BaseModal";

interface DangerConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  requiredText: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DangerConfirmModal({
  open,
  title,
  message,
  requiredText,
  confirmLabel = "Удалить",
  onCancel,
  onConfirm,
}: DangerConfirmModalProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setValue("");

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!open) return null;

  const canConfirm = value === requiredText;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canConfirm) return;

    onConfirm();
  }

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
            type="submit"
            form="danger-confirm-modal-form"
            disabled={!canConfirm}
            className={
              canConfirm
                ? "border border-black bg-black px-4 py-2 text-sm text-white"
                : "border border-neutral-400 bg-neutral-200 px-4 py-2 text-sm text-neutral-500"
            }
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <form id="danger-confirm-modal-form" onSubmit={handleSubmit}>
        <p className="whitespace-pre-wrap text-sm leading-6">
          {message}
        </p>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold">
            Для подтверждения введи:
          </span>

          <div className="mb-2 border border-black bg-neutral-100 px-3 py-2 font-mono text-sm">
            {requiredText}
          </div>

          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full border border-black bg-white px-3 py-2 outline-none"
          />
        </label>
      </form>
    </BaseModal>
  );
}
