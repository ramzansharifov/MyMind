import { ExternalLink, FileText, Image, Music, Upload, Video } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../../utils/classNames";
import type { StudyFileBlock, StudyFileKind } from "../../core/blockCore";

interface FileBlockEditorProps {
  block: StudyFileBlock;
  onChange: (block: StudyFileBlock) => void;
}

export function FileBlockEditor({ block, onChange }: FileBlockEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveFile(file: File) {
    if (!window.mymind.files?.saveAsset) {
      setError("Файловое хранилище недоступно.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const data = await file.arrayBuffer();
      const url = await window.mymind.files.saveAsset({
        name: file.name,
        data,
      });

      onChange({
        ...block,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        url,
        kind: inferFileKind(file.type, file.name),
      });
    } catch {
      setError("Не удалось сохранить файл.");
    } finally {
      setIsSaving(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void saveFile(file);
        }}
      />

      {block.url ? <FileBlockViewer block={block} /> : null}

      <button
        className={cn(
          "grid min-h-[140px] place-items-center rounded-control border border-dashed border-app-border bg-app-surface px-4 py-6 text-center text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_48%,var(--border))] hover:bg-app-surface-soft hover:text-app-accent-strong",
          block.url && "min-h-0 border-solid py-3",
        )}
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isSaving}
      >
        <span className="grid gap-2 justify-items-center">
          <Upload size={22} />
          <span className="text-sm font-extrabold text-app-text">
            {isSaving ? "Сохраняю файл..." : block.url ? "Заменить файл" : "Выбрать файл"}
          </span>
          {!block.url ? <span className="text-xs text-app-muted">Картинки, видео и аудио откроются прямо в материале.</span> : null}
        </span>
      </button>

      {error ? <p className="text-sm font-bold text-app-danger">{error}</p> : null}
    </div>
  );
}

export function FileBlockViewer({ block }: { block: StudyFileBlock }) {
  if (!block.url) {
    return (
      <div className="rounded-control border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm font-bold text-app-muted">
        Файл не выбран.
      </div>
    );
  }

  const media = renderFilePreview(block);

  return (
    <div className="overflow-hidden rounded-control border border-app-border bg-app-surface">
      {media}

      <div className="flex flex-wrap items-center gap-3 border-t border-app-border px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-app-border bg-app-surface-strong text-app-accent-strong">
          <FileKindIcon kind={block.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-app-text">{block.name}</div>
          <div className="text-xs font-bold text-app-muted">{formatFileSize(block.sizeBytes)}</div>
        </div>
        <button
          className="inline-flex min-h-control items-center gap-2 rounded-control border border-app-border bg-app-surface-strong px-3 py-2 text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-accent-strong"
          type="button"
          onClick={() => {
            void window.mymind.files?.openFile?.(block.url);
          }}
        >
          <ExternalLink size={16} />
          Открыть
        </button>
      </div>
    </div>
  );
}

function renderFilePreview(block: StudyFileBlock) {
  if (block.kind === "image") {
    return (
      <div className="bg-app-bg p-3">
        <img className="mx-auto max-h-[520px] max-w-full rounded-control object-contain" src={block.url} alt={block.name} />
      </div>
    );
  }

  if (block.kind === "video") {
    return (
      <div className="bg-app-bg p-3">
        <video className="max-h-[520px] w-full rounded-control bg-black" src={block.url} controls preload="metadata" />
      </div>
    );
  }

  if (block.kind === "audio") {
    return (
      <div className="bg-app-bg p-4">
        <audio className="w-full" src={block.url} controls preload="metadata" />
      </div>
    );
  }

  return (
    <div className="grid min-h-[120px] place-items-center bg-app-bg px-4 py-8 text-app-muted">
      <FileText size={34} />
    </div>
  );
}

function FileKindIcon({ kind }: { kind: StudyFileKind }) {
  if (kind === "image") return <Image size={18} />;
  if (kind === "video") return <Video size={18} />;
  if (kind === "audio") return <Music size={18} />;
  return <FileText size={18} />;
}

function inferFileKind(mimeType: string, name: string): StudyFileKind {
  const mime = mimeType.toLowerCase();
  const fileName = name.toLowerCase();

  if (mime.startsWith("image/") || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(fileName)) return "image";
  if (mime.startsWith("video/") || /\.(m4v|mov|mp4|mpeg|ogv|webm)$/.test(fileName)) return "video";
  if (mime.startsWith("audio/") || /\.(aac|flac|m4a|mp3|oga|ogg|wav|weba)$/.test(fileName)) return "audio";

  return "file";
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "Размер неизвестен";

  const units = ["Б", "КБ", "МБ", "ГБ"];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}
