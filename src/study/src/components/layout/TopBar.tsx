import { useRef } from "react";

interface TopBarProps {
  path: string;
  status: string;
  sidebarHidden: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onClearState: () => void;
  hasBackup: boolean;
  backupLabel: string;
  onRestoreBackup: () => void;
}

function getStatusText(status: string): string {
  if (status === "loading") return "Загрузка";
  if (status === "saving") return "Сохранение";
  if (status === "saved") return "Сохранено в JSON";
  if (status === "error") return "Ошибка";
  return "Готово";
}

export function TopBar({
  path,
  status,
  sidebarHidden,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleSidebar,
  onOpenCommandPalette,
  onExportJson,
  onImportJson,
  onClearState,
  hasBackup,
  backupLabel,
  onRestoreBackup,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="border-b border-black bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-neutral-600">{path || "Study"}</p>
          <h1 className="text-xl font-bold">MyMind Study</h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
          >
            {sidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
          </button>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={
              canUndo
                ? "border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
                : "border border-neutral-400 bg-neutral-100 px-3 py-1 text-sm text-neutral-400"
            }
          >
            Undo
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={
              canRedo
                ? "border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
                : "border border-neutral-400 bg-neutral-100 px-3 py-1 text-sm text-neutral-400"
            }
          >
            Redo
          </button>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
          >
            Commands
          </button>

          <button
            type="button"
            onClick={onExportJson}
            className="border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
          >
            Export
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
          >
            Import
          </button>

          <button
            type="button"
            onClick={onRestoreBackup}
            disabled={!hasBackup}
            title={backupLabel}
            className={
              hasBackup
                ? "border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
                : "border border-neutral-400 bg-neutral-100 px-3 py-1 text-sm text-neutral-400"
            }
          >
            Restore Backup
          </button>

          <button
            type="button"
            onClick={onClearState}
            className="border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
          >
            Clear
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onImportJson(file);
              }

              event.currentTarget.value = "";
            }}
          />

          <div className="border border-black px-3 py-1 text-sm">
            {getStatusText(status)}
          </div>
        </div>
      </div>
    </header>
  );
}
