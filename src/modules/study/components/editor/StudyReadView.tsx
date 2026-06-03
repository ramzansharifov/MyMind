import { FileText, Printer, ChevronRight, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { StudyBlock, StudyCustomBlockTemplate, StudyNode, StudyContentBlock } from '../../types';
import { replaceTextNodesWithInternalLinks, toEditableHtml } from '../../utils/richTextCore';
import { isContentBlock } from '../../studyUtils';
import { StudyFilePreview } from './StudyFilePreview';
import { StudyLatexView } from './StudyLatexView';
import { StudyCodeBlock } from './StudyCodeBlock';
import { formatStudyFileSize } from '../../utils/fileStore';

interface StudyReadViewProps {
  title: string;
  tags: string[];
  blocks: StudyBlock[];
  nodes: StudyNode[];
  templates: StudyCustomBlockTemplate[];
  collapsedBlockIds: Set<string>;
  onToggleCollapsed: (blockId: string) => void;
  onOpenNode: (nodeId: string) => void;
}

export function StudyReadView({
  title,
  tags,
  blocks,
  nodes,
  templates,
  collapsedBlockIds,
  onToggleCollapsed,
  onOpenNode,
}: StudyReadViewProps) {
  const [pageWidth, setPageWidth] = useState(1000);

  return (
    <div className="study-read-shell">
      <div className="study-read-toolbar glass-panel">
        <div className="study-inline-actions">
          <button className="button ghost icon-text" type="button" onClick={() => window.print()}>
            <Printer size={16} aria-hidden />
            Print
          </button>
          <label className="study-read-width">
            <span>Width</span>
            <select value={pageWidth} onChange={(event) => setPageWidth(Number(event.target.value))}>
              <option value={900}>900px</option>
              <option value={1000}>1000px</option>
              <option value={1100}>1100px</option>
              <option value={1200}>1200px</option>
            </select>
          </label>
        </div>
      </div>

      <div className="study-read-layout">
        <article className="study-read-page glass-panel" style={{ maxWidth: pageWidth }}>
          <header className="study-read-page-header">
            <h1>{title || 'Untitled material'}</h1>
            {tags.length > 0 ? (
              <div className="study-read-tags">
                {tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}
          </header>

          {blocks.length === 0 ? (
            <p className="study-muted">This material has no blocks yet.</p>
          ) : (
            blocks.map((block) => (
              <ReadBlock
                key={block.id}
                block={block}
                nodes={nodes}
                templates={templates}
                collapsedBlockIds={collapsedBlockIds}
                onToggleCollapsed={onToggleCollapsed}
                onOpenNode={onOpenNode}
              />
            ))
          )}
        </article>
      </div>
    </div>
  );
}

function ReadBlock({
  block,
  nodes,
  templates,
  collapsedBlockIds,
  onToggleCollapsed,
  onOpenNode,
  level = 0,
}: {
  block: StudyBlock;
  nodes: StudyNode[];
  templates: StudyCustomBlockTemplate[];
  collapsedBlockIds: Set<string>;
  onToggleCollapsed: (blockId: string) => void;
  onOpenNode: (nodeId: string) => void;
  level?: number;
}) {
  const collapsed = collapsedBlockIds.has(block.id);
  const hasChildren = (block.children ?? []).length > 0;

  return (
    <section
        className={`study-read-block type-${block.type}${collapsed ? ' is-collapsed' : ''}`}
        data-study-read-block-id={block.id}
        style={{
            color: block.settings?.textColor,
            background: block.settings?.backgroundColor,
            padding: block.settings?.padding,
            textAlign: block.settings?.textAlign,
            fontSize: block.settings?.fontSize,
        }}
    >
      <div className={hasChildren ? "study-read-block-with-toggle" : ""}>
        {hasChildren && (
            <button
                type="button"
                onClick={() => onToggleCollapsed(block.id)}
                className="study-read-toggle-btn"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
        )}
        <div className="study-read-block-main">
            <ReadBlockContent
                block={block}
                nodes={nodes}
                templates={templates}
                collapsed={collapsed}
                onToggleCollapsed={onToggleCollapsed}
                onOpenNode={onOpenNode}
            />
            {hasChildren && collapsed && (
                <div className="study-read-collapsed-hint">
                    Children hidden: {block.children?.length}
                </div>
            )}
        </div>
      </div>

      {!collapsed && hasChildren && (
        <div className={`study-read-children level-${level}`}>
          {(block.children ?? []).map((child) => (
            <ReadBlock
              key={child.id}
              block={child}
              nodes={nodes}
              templates={templates}
              collapsedBlockIds={collapsedBlockIds}
              onToggleCollapsed={onToggleCollapsed}
              onOpenNode={onOpenNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReadBlockContent({
  block,
  nodes,
  templates,
  collapsed,
  onToggleCollapsed,
  onOpenNode,
}: {
  block: StudyBlock;
  nodes: StudyNode[];
  templates: StudyCustomBlockTemplate[];
  collapsed: boolean;
  onToggleCollapsed: (blockId: string) => void;
  onOpenNode: (nodeId: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
        replaceTextNodesWithInternalLinks(contentRef.current, nodes, onOpenNode);
    }
  }, [block, nodes, onOpenNode]);

  if (isContentBlock(block)) {
    if (block.type === 'heading') {
      const Tag = (block.settings?.headingStyle ?? 'h1') as 'h1' | 'h2' | 'h3';
      return (
        <div className="study-read-heading-row">
          {(block.children ?? []).length > 0 ? (
            <button className="study-collapse-button accent" type="button" onClick={() => onToggleCollapsed(block.id)}>
              {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
            </button>
          ) : null}
          <Tag ref={contentRef}>{block.content}</Tag>
        </div>
      );
    }
    if (block.type === 'markdown') {
      return (
        <div className="study-markdown-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
        </div>
      );
    }
    if (block.type === 'code') {
      return (
        <StudyCodeBlock
          value={block.content}
          language={block.language || block.settings?.codeLanguage}
          editable={false}
          wrap={block.settings?.codeWrap}
          fontSize={block.settings?.fontSize}
          textColor={block.settings?.textColor}
          backgroundColor={block.settings?.backgroundColor}
          padding={block.settings?.padding}
        />
      );
    }

    // Default content block rendering - simplified rich text view
    return (
        <div
            ref={contentRef}
            className="study-rich-text-view"
            dangerouslySetInnerHTML={{ __html: toEditableHtml(block.content) }}
        />
    );
  }

  if (block.type === 'table') {
    return (
      <div className="study-table-wrap">
        <table className="study-table read">
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`read-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => {
                  const Cell = block.hasHeader && rowIndex === 0 ? 'th' : 'td';
                  return <Cell key={`${rowIndex}-${cellIndex}`} dangerouslySetInnerHTML={{ __html: cell }} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === 'board') {
    return (
      <svg className="study-board-canvas read" style={{ height: block.settings?.boardHeight ?? 360 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {block.strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    );
  }

  if (block.type === 'file') {
    return (
      <div className="study-file-read">
        <FileText size={18} aria-hidden />
        <div>
          <strong>{block.fileName || 'File'}</strong>
          <span>{block.mimeType || 'unknown'} - {formatStudyFileSize(block.size || 0)}</span>
          {block.note ? <p>{block.note}</p> : null}
          <StudyFilePreview block={block} />
        </div>
      </div>
    );
  }

  if (block.type === 'divider') {
    return <hr className="study-divider" style={{ borderColor: block.settings?.dividerColor ?? 'var(--border)' }} />;
  }

  if (block.type === 'custom') {
    const template = templates.find((item) => item.id === block.templateId);
    return (
      <div className="study-custom-read" style={{ borderColor: template?.accentColor }}>
        <strong>{template?.title ?? 'Custom block'}</strong>
        {template?.fields.map((field) => {
           const value = block.values[field.id];
           return (
            <div key={field.id} className="study-custom-read-field">
              <span>{field.label}</span>
              {field.type === 'latex' ? (
                <StudyLatexView code={String(value ?? '')} displayMode={false} />
              ) : (
                <b>{String(value ?? '')}</b>
              )}
            </div>
           );
        })}
      </div>
    );
  }

  return null;
}
