import { useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, File as FileIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import { getCurrentDrawingData } from '../blocks/drawing';
import { markdownToHtml } from '../noteUtils';
import { DEFAULT_DRAWING_HEIGHT } from './constants';
import { inlineContentToSafeString } from './contentSanitizer';
import type { AnyBlock } from './types';

export function ReadOnlyBlocks({ blocks }: { blocks: AnyBlock[] }) {
  const { t } = useI18n();
  return <div className="note-read-content">{renderReadOnlyBlocks(blocks, t)}</div>;
}

type Translate = (value: string) => string;

function renderReadOnlyBlocks(blocks: AnyBlock[], t: Translate) {
  const output = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];

    if (block.type === 'bulletListItem' || block.type === 'numberedListItem' || block.type === 'checkListItem') {
      const group = [];
      const listType = block.type;
      while (index < blocks.length && blocks[index].type === listType) {
        group.push(blocks[index]);
        index += 1;
      }

      if (listType === 'checkListItem') {
        output.push(
          <div className="note-read-checklist" key={block.id}>
            {group.map((item) => {
              const checked = Boolean((item.props as any).checked);
              return (
                <div className={`note-read-check-row${checked ? ' checked' : ''}`} key={item.id}>
                  <span className="note-read-check" aria-hidden="true" />
                  <span>{renderInlineContent(item.content)}</span>
                </div>
              );
            })}
          </div>,
        );
        continue;
      }

      const ListTag = listType === 'numberedListItem' ? 'ol' : 'ul';
      output.push(
        <ListTag className={`note-read-list ${listType}`} key={block.id}>
          {group.map((item) => (
            <li key={item.id}>
              <span>{renderInlineContent(item.content)}</span>
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    output.push(renderReadOnlyBlock(block, t));
    index += 1;
  }

  return output;
}

function renderReadOnlyBlock(block: AnyBlock, t: Translate): ReactNode {
  const children = Array.isArray(block.children) && block.children.length > 0 ? <div className="note-read-children">{renderReadOnlyBlocks(block.children as AnyBlock[], t)}</div> : null;

  if (block.type === 'toggleListItem' || (block.type === 'heading' && (block.props as any).isToggleable)) {
    return <ReadOnlyToggleBlock block={block} t={t} key={block.id} />;
  }

  if (block.type === 'heading') {
    const level = Math.min(3, Math.max(1, Number((block.props as any).level ?? 1)));
    const HeadingTag = `h${level + 1}` as 'h2' | 'h3' | 'h4';
    return (
      <section className="note-read-block" key={block.id}>
        <HeadingTag>{renderInlineContent(block.content)}</HeadingTag>
        {children}
      </section>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="note-read-block note-read-quote" key={block.id}>
        {renderInlineContent(block.content)}
        {children}
      </blockquote>
    );
  }

  if (block.type === 'codeBlock') {
    const language = String((block.props as any).language ?? '').toLowerCase();
    if (language === 'markdown' || language === 'md') {
      return (
        <div
          className="note-read-block note-read-markdown"
          key={block.id}
          dangerouslySetInnerHTML={{ __html: markdownToHtml(inlineContentToSafeString(block.content)) }}
        />
      );
    }

    return (
      <pre className="note-read-block note-read-code" key={block.id}>
        <code>{inlineContentToSafeString(block.content)}</code>
      </pre>
    );
  }

  if (block.type === 'divider') {
    return <hr className="note-read-divider" key={block.id} />;
  }

  if (block.type === 'table') {
    return <ReadOnlyTable block={block} key={block.id} />;
  }

  if (block.type === 'image') {
    const url = String((block.props as any).url ?? '');
    const widthStyle = getMediaWidthStyle((block.props as any).previewWidth);
    return (
      <figure className="note-read-block note-read-media" key={block.id} style={widthStyle}>
        {url ? (
          <img src={url} alt={String((block.props as any).caption ?? t('Image'))} loading="lazy" decoding="async" />
        ) : (
          <div className="note-read-empty">{t('Image')}</div>
        )}
        {(block.props as any).caption ? <figcaption>{String((block.props as any).caption)}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === 'video') {
    const url = String((block.props as any).url ?? '');
    const caption = String((block.props as any).caption ?? '');
    return (
      <figure className="note-read-block note-read-media note-read-video" key={block.id}>
        {url ? (
          <video src={url} controls preload="metadata" />
        ) : (
          <div className="note-read-empty">{t('Video')}</div>
        )}
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === 'audio') {
    const url = String((block.props as any).url ?? '');
    const caption = String((block.props as any).caption ?? '');
    return (
      <figure className="note-read-block note-read-media note-read-audio" key={block.id}>
        {url ? (
          <audio src={url} controls preload="metadata" />
        ) : (
          <div className="note-read-empty">{t('Audio')}</div>
        )}
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === 'file') {
    const url = String((block.props as any).url ?? '');
    const caption = String((block.props as any).caption ?? '');
    const name = String((block.props as any).name ?? t('File'));
    return (
      <figure className="note-read-block note-read-file" key={block.id}>
        {url ? (
          <a className="note-read-file-link" href={url} target="_blank" rel="noreferrer">
            <FileIcon size={18} />
            <span>{name || url}</span>
          </a>
        ) : (
          <div className="note-read-empty">{t('File')}</div>
        )}
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === 'drawing') {
    const drawingData = getCurrentDrawingData(block.id, String((block.props as any).drawingData ?? ''));
    const canvasHeight = clampNumber(Number((block.props as any).canvasHeight ?? DEFAULT_DRAWING_HEIGHT), 220, 900);
    return (
      <div className="note-read-block note-read-drawing" key={block.id} style={{ '--note-drawing-height': `${canvasHeight}px` } as CSSProperties}>
        {isValidDrawingData(drawingData) ? <img src={drawingData} alt={t('Drawing')} /> : <div className="note-read-empty">{t('No drawing yet')}</div>}
      </div>
    );
  }

  return (
    <div className="note-read-block" key={block.id}>
      <p>{renderInlineContent(block.content)}</p>
      {children}
    </div>
  );
}

function ReadOnlyToggleBlock({ block, t }: { block: AnyBlock; t: Translate }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = Array.isArray(block.children) && block.children.length > 0;
  const isHeadingToggle = block.type === 'heading' && (block.props as any).isToggleable;
  const level = Math.min(3, Math.max(1, Number((block.props as any).level ?? 1)));
  const HeadingTag = `h${level + 1}` as 'h2' | 'h3' | 'h4';
  const title = renderInlineContent(block.content);

  return (
    <section className={`note-read-block note-read-toggle${isOpen ? ' open' : ''}${isHeadingToggle ? ` heading-toggle level-${level}` : ''}`}>
      <button
        className="note-read-toggle-button"
        type="button"
        aria-expanded={isOpen}
        disabled={!hasChildren}
        onClick={() => {
          if (hasChildren) {
            setIsOpen((current) => !current);
          }
        }}
      >
        <ChevronDown size={18} />
      </button>
      <div className="note-read-toggle-body">
        {isHeadingToggle ? <HeadingTag>{title}</HeadingTag> : <p>{title}</p>}
        {hasChildren && isOpen ? <div className="note-read-children">{renderReadOnlyBlocks(block.children as AnyBlock[], t)}</div> : null}
      </div>
    </section>
  );
}

function ReadOnlyTable({ block }: { block: AnyBlock }) {
  const rows = Array.isArray((block as any).content?.rows) ? (block as any).content.rows : [];
  return (
    <div className="note-read-block note-read-table-wrap">
      <table className="note-read-table">
        <tbody>
          {rows.map((row: any, rowIndex: number) => (
            <tr key={rowIndex}>
              {(row.cells ?? []).map((cell: unknown, cellIndex: number) => (
                <td key={cellIndex}>{renderInlineContent(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInlineContent(content: unknown): ReactNode {
  if (!content) {
    return null;
  }

  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return inlineContentToSafeString(content);
  }

  return content.map((item, index) => renderInlineItem(item, index));
}

function renderInlineItem(item: unknown, index: number): ReactNode {
  if (!item || typeof item !== 'object') {
    return String(item ?? '');
  }

  const value = item as Record<string, any>;
  if (value.type === 'hardBreak' || value.type === 'lineBreak') {
    return <br key={index} />;
  }

  if (value.type === 'link') {
    return (
      <a href={String(value.href ?? '#')} key={index} target="_blank" rel="noreferrer">
        {renderInlineContent(value.content)}
      </a>
    );
  }

  const text = typeof value.text === 'string' ? value.text : inlineContentToSafeString(value.content);
  const styles = value.styles ?? {};
  let node: ReactNode = text;

  if (styles.bold) node = <strong>{node}</strong>;
  if (styles.italic) node = <em>{node}</em>;
  if (styles.underline) node = <u>{node}</u>;
  if (styles.strike) node = <s>{node}</s>;

  return <span key={index}>{node}</span>;
}

function isValidDrawingData(value: string) {
  return value.startsWith('data:image/png;base64,') || value.startsWith('data:image/webp;base64,') || value.startsWith('data:image/jpeg;base64,');
}

function getMediaWidthStyle(value: unknown): CSSProperties | undefined {
  const width = Number(value);
  if (!Number.isFinite(width)) {
    return undefined;
  }

  return { '--note-read-media-width': `${clampNumber(width, 96, 1600)}px` } as CSSProperties;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
