import { useEffect, useRef, useState, type FormEvent } from "react";
import { BaseModal } from "./BaseModal";

interface TextInputModalProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}

export function TextInputModal({
  open,
  title,
  label,
  initialValue = "",
  placeholder,
  confirmLabel = "Сохранить",
  onCancel,
  onSubmit,
}: TextInputModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setValue(initialValue);

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open, initialValue]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedValue = value.trim();

    if (!trimmedValue) return;

    onSubmit(trimmedValue);
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
            form="text-input-modal-form"
            className="border border-black bg-black px-4 py-2 text-sm text-white"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <form id="text-input-modal-form" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">{label}</span>

          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="w-full border border-black bg-white px-3 py-2 outline-none"
          />
        </label>
      </form>
    </BaseModal>
  );
}
