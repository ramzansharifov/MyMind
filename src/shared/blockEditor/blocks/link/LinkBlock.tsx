import { ExternalLink, FileText, Globe2, Image, Link as LinkIcon, Music, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { StudyLinkBlock, StudyLinkKind } from "../../core/blockCore";

interface LinkBlockEditorProps {
  block: StudyLinkBlock;
  onChange: (block: StudyLinkBlock) => void;
}

interface LinkPreviewData {
  href: string;
  title: string;
  displayUrl: string;
  kind: StudyLinkKind;
}

export function LinkBlockEditor({ block, onChange }: LinkBlockEditorProps) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 rounded-panel border border-app-border bg-app-surface p-3">
        <label className={fieldLabelClass}>
          <span>Ссылка</span>
          <input
            value={block.url}
            placeholder="https://example.com/image.png"
            spellCheck={false}
            onChange={(event) => {
              const url = event.target.value;
              onChange({
                ...block,
                url,
                kind: inferLinkKind(url),
              });
            }}
          />
        </label>

        <label className={fieldLabelClass}>
          <span>Название</span>
          <input
            value={block.title}
            placeholder="Необязательно"
            onChange={(event) =>
              onChange({
                ...block,
                title: event.target.value,
              })
            }
          />
        </label>
      </div>

      <LinkBlockViewer block={block} />
    </div>
  );
}

export function LinkBlockViewer({ block }: { block: StudyLinkBlock }) {
  const preview = useMemo(() => getLinkPreviewData(block), [block]);
  const autoPreview = useAutoDetectedLinkKind(preview.href, preview.kind);
  const visiblePreview = useMemo(
    () => ({
      ...preview,
      kind: autoPreview.kind,
    }),
    [autoPreview.kind, preview],
  );

  if (!block.url.trim()) {
    return (
      <div className="grid min-h-[110px] place-items-center rounded-control border border-dashed border-app-border bg-app-surface px-4 py-5 text-center text-sm font-bold text-app-muted">
        Вставь ссылку, чтобы увидеть предпросмотр.
      </div>
    );
  }

  if (!preview.href) {
    return (
      <div className="overflow-hidden rounded-control border border-app-border bg-app-surface">
        <div className="grid min-h-[110px] place-items-center bg-app-bg px-4 py-8 text-center text-sm font-bold text-app-muted">
          Ссылка выглядит некорректно.
        </div>
        <LinkFooter preview={preview} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-control border border-app-border bg-app-surface">
      {renderLinkPreview(visiblePreview, autoPreview.checking)}
      <LinkFooter preview={visiblePreview} />
    </div>
  );
}

function LinkFooter({ preview }: { preview: LinkPreviewData }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-app-border px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-app-border bg-app-surface-strong text-app-accent-strong">
        <LinkKindIcon kind={preview.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold text-app-text">{preview.title}</div>
        <div className="truncate text-xs font-bold text-app-muted">{preview.displayUrl}</div>
      </div>
      {preview.href ? (
        <a
          className="inline-flex min-h-control items-center gap-2 rounded-control border border-app-border bg-app-surface-strong px-3 py-2 text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-accent-strong"
          href={preview.href}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={16} />
          Открыть
        </a>
      ) : null}
    </div>
  );
}

function renderLinkPreview(preview: LinkPreviewData, isChecking = false) {
  if (preview.kind === "image" && isEmbeddableUrl(preview.href)) {
    return (
      <div className="bg-app-bg p-3">
        <img className="mx-auto max-h-[520px] max-w-full rounded-control object-contain" src={preview.href} alt={preview.title} />
      </div>
    );
  }

  if (preview.kind === "video" && isEmbeddableUrl(preview.href)) {
    return (
      <div className="bg-app-bg p-3">
        <video className="max-h-[520px] w-full rounded-control bg-black" src={preview.href} controls preload="metadata" />
      </div>
    );
  }

  if (preview.kind === "audio" && isEmbeddableUrl(preview.href)) {
    return (
      <div className="bg-app-bg p-4">
        <audio className="w-full" src={preview.href} controls preload="metadata" />
      </div>
    );
  }

  if (preview.kind === "pdf" && isEmbeddableUrl(preview.href)) {
    return (
      <div className="bg-app-bg p-3">
        <iframe className="h-[560px] w-full rounded-control border border-app-border bg-white" src={preview.href} title={preview.title} />
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="grid min-h-[120px] place-items-center bg-app-bg px-4 py-8 text-center text-sm font-bold text-app-muted">
        Проверяю медиа...
      </div>
    );
  }

  return (
    <div className="grid min-h-[120px] place-items-center bg-app-bg px-4 py-8 text-app-muted">
      <Globe2 size={34} />
    </div>
  );
}

function useAutoDetectedLinkKind(href: string, initialKind: StudyLinkKind) {
  const [detectedKind, setDetectedKind] = useState<StudyLinkKind>(initialKind);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setDetectedKind(initialKind);
    setChecking(false);

    if (initialKind !== "link" || !isEmbeddableUrl(href)) {
      return () => {
        cancelled = true;
      };
    }

    setChecking(true);

    async function detectMedia() {
      if (await probeImage(href)) {
        if (!cancelled) {
          setDetectedKind("image");
          setChecking(false);
        }
        return;
      }

      if (await probeMediaElement("video", href)) {
        if (!cancelled) {
          setDetectedKind("video");
          setChecking(false);
        }
        return;
      }

      if (await probeMediaElement("audio", href)) {
        if (!cancelled) {
          setDetectedKind("audio");
          setChecking(false);
        }
        return;
      }

      if (!cancelled) {
        setDetectedKind("link");
        setChecking(false);
      }
    }

    void detectMedia();

    return () => {
      cancelled = true;
    };
  }, [href, initialKind]);

  return {
    kind: detectedKind,
    checking,
  };
}

function probeImage(href: string) {
  return new Promise<boolean>((resolve) => {
    const image = new globalThis.Image();
    const timeout = window.setTimeout(() => finish(false), 1600);
    let settled = false;

    function finish(result: boolean) {
      if (settled) return;

      settled = true;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    }

    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = href;
  });
}

function probeMediaElement(tagName: "video" | "audio", href: string) {
  return new Promise<boolean>((resolve) => {
    const media = document.createElement(tagName);
    const timeout = window.setTimeout(() => finish(false), 1800);
    let settled = false;

    function finish(result: boolean) {
      if (settled) return;

      settled = true;
      window.clearTimeout(timeout);
      media.removeAttribute("src");
      media.load();
      resolve(result);
    }

    media.preload = "metadata";
    media.muted = true;
    media.addEventListener("loadedmetadata", () => finish(true), { once: true });
    media.addEventListener("canplay", () => finish(true), { once: true });
    media.addEventListener("error", () => finish(false), { once: true });
    media.src = href;
    media.load();
  });
}

function LinkKindIcon({ kind }: { kind: StudyLinkKind }) {
  if (kind === "image") return <Image size={18} />;
  if (kind === "video") return <Video size={18} />;
  if (kind === "audio") return <Music size={18} />;
  if (kind === "pdf") return <FileText size={18} />;
  return <LinkIcon size={18} />;
}

function getLinkPreviewData(block: StudyLinkBlock): LinkPreviewData {
  const href = normalizeLinkHref(block.url);
  const kind = inferLinkKind(block.url, block.kind);
  const displayUrl = getDisplayUrl(block.url, href);
  const title = block.title.trim() || getLinkTitle(displayUrl, href) || "Ссылка";

  return {
    href,
    title,
    displayUrl: displayUrl || block.url.trim(),
    kind,
  };
}

function normalizeLinkHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return "";

  return `https://${trimmed}`;
}

function inferLinkKind(value: string, fallback: StudyLinkKind = "link"): StudyLinkKind {
  const href = normalizeLinkHref(value);

  if (!href || !isEmbeddableUrl(href)) return "link";

  const pathname = getLinkPathname(href);

  if (/\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(pathname)) return "image";
  if (/\.(m4v|mov|mp4|mpeg|ogv|webm)$/i.test(pathname)) return "video";
  if (/\.(aac|flac|m4a|mp3|oga|ogg|wav|weba)$/i.test(pathname)) return "audio";
  if (/\.pdf$/i.test(pathname)) return "pdf";

  return "link";
}

function getLinkPathname(href: string) {
  try {
    return new URL(href).pathname;
  } catch {
    return href.split(/[?#]/, 1)[0] ?? "";
  }
}

function getDisplayUrl(rawUrl: string, href: string) {
  if (!href) return rawUrl.trim();

  try {
    const url = new URL(href);
    if (url.protocol === "mailto:") return url.href.replace(/^mailto:/i, "");
    if (url.protocol === "tel:") return url.href.replace(/^tel:/i, "");

    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return rawUrl.trim();
  }
}

function getLinkTitle(displayUrl: string, href: string) {
  if (!href) return "";

  try {
    const url = new URL(href);
    if (url.protocol === "mailto:" || url.protocol === "tel:") return displayUrl;

    return url.hostname || displayUrl;
  } catch {
    return displayUrl;
  }
}

function isEmbeddableUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

const fieldLabelClass =
  "grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-app-muted [&_input]:min-h-control [&_input]:w-full [&_input]:px-3 [&_input]:text-sm [&_input]:font-bold [&_input]:normal-case [&_input]:tracking-normal";
