import type { ReactNode } from "react";

interface BaseModalProps {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}

export function BaseModal({
  title,
  children,
  footer,
  onClose,
}: BaseModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl border border-black bg-white"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="font-bold">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
          >
            X
          </button>
        </header>

        <div className="p-4">
          {children}
        </div>

        <footer className="flex justify-end gap-2 border-t border-black px-4 py-3">
          {footer}
        </footer>
      </div>
    </div>
  );
}
