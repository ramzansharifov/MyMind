import {
  ArrowDown,
  ArrowUp,
  Braces,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileText,
  GripVertical,
  Heading1,
  Link2,
  ListPlus,
  Minus,
  Paintbrush,
  PanelRight,
  Pencil,
  Plus,
  Printer,
  Quote,
  Settings,
  SplitSquareHorizontal,
  Table2,
  Trash2,
  Type,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Tooltip } from '../../../shared/components/Tooltip';
import { BlockEditorContent, StudyFilePreview } from './editor/StudyBlockEditors';
import {
  cloneStudyBlock,
  createCustomStudyBlock,
  createStudyBlock,
  deleteBlockFromTree,
  duplicateBlockInTree,
  findBlockById,
  getStudyBlockLabel,
  getStudyBlockText,
  isContentBlock,
  isContentBlockType,
  moveBlockInTree,
  nestBlockIntoPreviousSibling,
  nowIso,
  STUDY_BLOCK_TYPES,
  unnestBlockFromParent,
  updateBlockTree,
} from '../studyUtils';
import type {
  StudyBlock,
  StudyBlockSettings,
  StudyBlockType,
  StudyContentBlock,
  StudyCustomFieldType,
  StudyCustomBlockTemplate,
  StudyMaterial,
} from '../types';
import { formatStudyFileSize } from '../utils/fileStore';

interface StudyMaterialEditorProps {
  material: StudyMaterial;
  allMaterials: StudyMaterial[];
  templates: StudyCustomBlockTemplate[];
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  onChange: (material: StudyMaterial) => void;
  onOpenMaterial: (nodeId: string) => void;
  onOpenTemplateManager: () => void;
}

export type StudyMode = 'edit' | 'read' | 'links';

const colors = ['#e5eef8', '#f8b4b4', '#ffd99a', '#f4e68e', '#a8e6c8', '#99d5cf', '#aebcff', '#d5a6ee'];

export function StudyMaterialEditor({ material, allMaterials, templates, mode, onModeChange, onChange, onOpenMaterial, onOpenTemplateManager }: StudyMaterialEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(material.blocks[0]?.id ?? null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(() => new Set());
  const [readPageWidth, setReadPageWidth] = useState(1000);
  const selectedBlock = useMemo(() => findBlockById(material.blocks, selectedBlockId), [material.blocks, selectedBlockId]);
  const linkedTitles = useMemo(() => extractInternalLinks(material.blocks.map(getStudyBlockText).join('\n')), [material.blocks]);
  const materialByNormalizedTitle = useMemo(
    () => new Map(allMaterials.map((item) => [item.title.trim().toLowerCase(), item])),
    [allMaterials],
  );

  function updateMaterial(patch: Partial<StudyMaterial>) {
    onChange({ ...material, ...patch, updatedAt: nowIso() });
  }

  function updateBlocks(blocks: StudyBlock[]) {
    updateMaterial({ blocks });
  }

  function updateBlock(blockId: string, update: (block: StudyBlock) => StudyBlock) {
    updateBlocks(updateBlockTree(material.blocks, blockId, update));
  }

  function addBlock(type: StudyBlockType, parentId: string | null = null) {
    const block = createStudyBlock(type);
    if (parentId) {
      updateBlock(parentId, (item) => ({ ...item, children: [...(item.children ?? []), block], collapsed: false }));
    } else {
      updateBlocks([...material.blocks, block]);
    }
    setSelectedBlockId(block.id);
  }

  function addCustomBlock(template: StudyCustomBlockTemplate, parentId: string | null = null) {
    const block = createCustomStudyBlock(template);
    if (parentId) {
      updateBlock(parentId, (item) => ({ ...item, children: [...(item.children ?? []), block], collapsed: false }));
    } else {
      updateBlocks([...material.blocks, block]);
    }
    setSelectedBlockId(block.id);
  }

  function deleteBlock(blockId: string) {
    updateBlocks(deleteBlockFromTree(material.blocks, blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }

  function toggleCollapsed(blockId: string) {
    setCollapsedBlockIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }

  return (
    <div className="study-material-editor">
      <div className="study-material-top glass-panel">
        <div className="study-material-title-block">
          <input
            className="study-material-title-input"
            value={material.title}
            onChange={(event) => updateMaterial({ title: event.target.value })}
            aria-label="Material title"
          />
          <input
            className="study-material-tags-input"
            value={material.tags.join(', ')}
            placeholder="tags, separated by comma"
            onChange={(event) => updateMaterial({ tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
          />
        </div>

        <div className="study-mode-tabs tabs-pill">
          {(['edit', 'read', 'links'] as StudyMode[]).map((item) => (
            <button className={mode === item ? 'active' : ''} type="button" key={item} onClick={() => onModeChange(item)}>
              {item === 'edit' ? <Pencil size={16} aria-hidden /> : item === 'read' ? <FileText size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
              {item}
            </button>
          ))}
        </div>
      </div>

      {mode === 'edit' ? (
        <div className="study-editor-layout">
          <div className="study-editor-main">
            <AddBlockBar templates={templates} onAddBlock={(type) => addBlock(type)} onAddCustomBlock={addCustomBlock} onOpenTemplateManager={onOpenTemplateManager} />

            {material.blocks.length === 0 ? (
              <button className="study-empty-block glass-panel" type="button" onClick={() => addBlock('text')}>
                <Plus size={18} aria-hidden />
                Add the first block
              </button>
            ) : (
              <div className="study-block-list">
                {material.blocks.map((block) => (
                  <EditableBlockCard
                    key={block.id}
                    block={block}
                    level={0}
                    templates={templates}
                    selectedBlockId={selectedBlockId}
                    collapsedBlockIds={collapsedBlockIds}
                    onSelect={setSelectedBlockId}
                    onUpdate={updateBlock}
                    onDelete={deleteBlock}
                    onDuplicate={(blockId) => updateBlocks(duplicateBlockInTree(material.blocks, blockId))}
                    onMove={(blockId, direction) => updateBlocks(moveBlockInTree(material.blocks, blockId, direction))}
                    onNest={(blockId) => updateBlocks(nestBlockIntoPreviousSibling(material.blocks, blockId))}
                    onUnnest={(blockId) => updateBlocks(unnestBlockFromParent(material.blocks, blockId))}
                    onToggleCollapsed={toggleCollapsed}
                    onAddChild={(parentId, type) => addBlock(type, parentId)}
                    onAddCustomChild={(parentId, template) => addCustomBlock(template, parentId)}
                  />
                ))}
              </div>
            )}
          </div>

          <StudySettingsPanel
            block={selectedBlock}
            templates={templates}
            onUpdate={(update) => selectedBlock && updateBlock(selectedBlock.id, update)}
            onDelete={() => selectedBlock && deleteBlock(selectedBlock.id)}
            onDuplicate={() => selectedBlock && updateBlocks(duplicateBlockInTree(material.blocks, selectedBlock.id))}
          />
        </div>
      ) : mode === 'read' ? (
        <StudyReadView
          title={material.title}
          tags={material.tags}
          blocks={material.blocks}
          templates={templates}
          materialByNormalizedTitle={materialByNormalizedTitle}
          collapsedBlockIds={collapsedBlockIds}
          pageWidth={readPageWidth}
          onPageWidthChange={setReadPageWidth}
          onToggleCollapsed={toggleCollapsed}
          onOpenMaterial={onOpenMaterial}
        />
      ) : (
        <StudyLinksView
          linkedTitles={linkedTitles}
          allMaterials={allMaterials}
          currentMaterialId={material.id}
          materialByNormalizedTitle={materialByNormalizedTitle}
          onOpenMaterial={onOpenMaterial}
        />
      )}
    </div>
  );
}

interface AddBlockBarProps {
  templates: StudyCustomBlockTemplate[];
  onAddBlock: (type: StudyBlockType) => void;
  onAddCustomBlock: (template: StudyCustomBlockTemplate) => void;
  onOpenTemplateManager: () => void;
}

function AddBlockBar({ templates, onAddBlock, onAddCustomBlock, onOpenTemplateManager }: AddBlockBarProps) {
  return (
    <div className="study-block-toolbar glass-panel">
      {STUDY_BLOCK_TYPES.map((type) => (
        <button className="button ghost icon-text" type="button" key={type} onClick={() => onAddBlock(type)}>
          <BlockIcon type={type} />
          {getStudyBlockLabel(type)}
        </button>
      ))}
      {templates.map((template) => (
        <button className="button ghost icon-text" type="button" key={template.id} onClick={() => onAddCustomBlock(template)}>
          <PanelRight size={16} aria-hidden />
          {template.title}
        </button>
      ))}
      <button className="button ghost icon-text" type="button" onClick={onOpenTemplateManager}>
        <Settings size={16} aria-hidden />
        Templates
      </button>
    </div>
  );
}

interface EditableBlockCardProps {
  block: StudyBlock;
  level: number;
  templates: StudyCustomBlockTemplate[];
  selectedBlockId: string | null;
  collapsedBlockIds: Set<string>;
  onSelect: (blockId: string) => void;
  onUpdate: (blockId: string, update: (block: StudyBlock) => StudyBlock) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onMove: (blockId: string, direction: -1 | 1) => void;
  onNest: (blockId: string) => void;
  onUnnest: (blockId: string) => void;
  onToggleCollapsed: (blockId: string) => void;
  onAddChild: (parentId: string, type: StudyBlockType) => void;
  onAddCustomChild: (parentId: string, template: StudyCustomBlockTemplate) => void;
}

function EditableBlockCard({
  block,
  level,
  templates,
  selectedBlockId,
  collapsedBlockIds,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
  onNest,
  onUnnest,
  onToggleCollapsed,
  onAddChild,
  onAddCustomChild,
}: EditableBlockCardProps) {
  const isSelected = selectedBlockId === block.id;
  const isCollapsed = collapsedBlockIds.has(block.id) || Boolean(block.collapsed);
  const hasChildren = (block.children ?? []).length > 0;

  return (
    <article
      className={`study-block glass-panel${isSelected ? ' active' : ''}`}
      style={getBlockStyle(block)}
      onMouseDown={() => onSelect(block.id)}
    >
      <div className="study-block-grip">
        <GripVertical size={16} aria-hidden />
      </div>

      <div className="study-block-head">
        <button className="study-collapse-button" type="button" onClick={() => onToggleCollapsed(block.id)}>
          {hasChildren ? (isCollapsed ? <ChevronRight size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />) : <span />}
        </button>
        <span className="study-block-type-chip">
          <BlockIcon type={block.type} />
          {getStudyBlockLabel(block.type)}
        </span>
        <div className="study-block-actions">
          <Tooltip content="Move up">
            <button className="icon-button subtle" type="button" onClick={() => onMove(block.id, -1)}>
              <ArrowUp size={15} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Move down">
            <button className="icon-button subtle" type="button" onClick={() => onMove(block.id, 1)}>
              <ArrowDown size={15} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Nest into previous block">
            <button className="icon-button subtle" type="button" onClick={() => onNest(block.id)}>
              <ListPlus size={15} aria-hidden />
            </button>
          </Tooltip>
          {level > 0 ? (
            <Tooltip content="Move out">
              <button className="icon-button subtle" type="button" onClick={() => onUnnest(block.id)}>
                <SplitSquareHorizontal size={15} aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          <Tooltip content="Duplicate">
            <button className="icon-button subtle" type="button" onClick={() => onDuplicate(block.id)}>
              <Copy size={15} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button className="icon-button danger" type="button" onClick={() => onDelete(block.id)}>
              <Trash2 size={15} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>

      <BlockEditorContent block={block} templates={templates} onChange={(update) => onUpdate(block.id, update)} />

      {!isCollapsed ? (
        <>
          {hasChildren ? (
            <div className="study-nested-blocks">
              {(block.children ?? []).map((child) => (
                <EditableBlockCard
                  key={child.id}
                  block={child}
                  level={level + 1}
                  templates={templates}
                  selectedBlockId={selectedBlockId}
                  collapsedBlockIds={collapsedBlockIds}
                  onSelect={onSelect}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onMove={onMove}
                  onNest={onNest}
                  onUnnest={onUnnest}
                  onToggleCollapsed={onToggleCollapsed}
                  onAddChild={onAddChild}
                  onAddCustomChild={onAddCustomChild}
                />
              ))}
            </div>
          ) : null}
          <div className="study-add-child-row">
            <button className="button ghost icon-text" type="button" onClick={() => onAddChild(block.id, 'text')}>
              <Plus size={15} aria-hidden />
              Child text
            </button>
            {templates.slice(0, 2).map((template) => (
              <button className="button ghost icon-text" type="button" key={template.id} onClick={() => onAddCustomChild(block.id, template)}>
                <Plus size={15} aria-hidden />
                {template.title}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </article>
  );
}

function StudySettingsPanel({
  block,
  templates,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  block: StudyBlock | null;
  templates: StudyCustomBlockTemplate[];
  onUpdate: (update: (block: StudyBlock) => StudyBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  if (!block) {
    return (
      <aside className="study-side-panel glass-panel">
        <h3>Block settings</h3>
        <p className="study-muted">Select a block to edit its settings.</p>
      </aside>
    );
  }

  const settings = block.settings ?? {};
  const setSettings = (patch: StudyBlockSettings) => {
    onUpdate((item) => ({ ...item, settings: { ...(item.settings ?? {}), ...patch } }));
  };

  return (
    <aside className="study-side-panel glass-panel">
      <h3>Block settings</h3>
      <div className="study-setting-info">
        <span>Type</span>
        <strong>{getStudyBlockLabel(block.type)}</strong>
      </div>

      {isContentBlock(block) ? (
        <>
          {block.type === 'heading' ? (
            <div className="study-choice-row">
              {[1, 2, 3].map((level) => (
                <button
                  className={`button ghost${settings.headingStyle === level ? ' active' : ''}`}
                  type="button"
                  key={level}
                  onClick={() => setSettings({ headingStyle: level as 1 | 2 | 3 })}
                >
                  H{level}
                </button>
              ))}
            </div>
          ) : null}
          {block.type === 'code' ? (
            <>
              <label className="form-field">
                <span>Language</span>
                <input value={block.language ?? settings.codeLanguage ?? 'text'} onChange={(event) => onUpdate((item) => ({ ...(item as StudyContentBlock), language: event.target.value, settings: { ...(item.settings ?? {}), codeLanguage: event.target.value } }))} />
              </label>
              <label className="study-toggle-field">
                <input type="checkbox" checked={settings.codeWrap ?? true} onChange={(event) => setSettings({ codeWrap: event.target.checked })} />
                Wrap code
              </label>
            </>
          ) : null}
          <RangeField label="Font size" min={12} max={64} value={settings.fontSize ?? 16} onChange={(value) => setSettings({ fontSize: value })} />
          <ColorRow label="Text color" value={settings.textColor} onChange={(value) => setSettings({ textColor: value })} />
        </>
      ) : null}

      {block.type === 'board' ? (
        <>
          <ColorRow label="Stroke color" value={settings.textColor} onChange={(value) => setSettings({ textColor: value })} />
          <RangeField label="Board height" min={220} max={720} value={settings.boardHeight ?? 360} onChange={(value) => setSettings({ boardHeight: value })} />
        </>
      ) : null}

      {block.type === 'divider' ? <ColorRow label="Divider color" value={settings.dividerColor} onChange={(value) => setSettings({ dividerColor: value })} /> : null}

      {block.type === 'custom' ? (
        <div className="study-setting-info">
          <span>Template</span>
          <strong>{templates.find((template) => template.id === block.templateId)?.title ?? 'Missing template'}</strong>
        </div>
      ) : null}

      {block.type !== 'divider' ? <ColorRow label="Background" value={settings.backgroundColor} onChange={(value) => setSettings({ backgroundColor: value })} /> : null}
      <RangeField label="Padding" min={8} max={42} value={settings.padding ?? 18} onChange={(value) => setSettings({ padding: value })} />

      <div className="study-choice-row">
        {(['left', 'center', 'right'] as const).map((align) => (
          <button className={`button ghost${settings.align === align ? ' active' : ''}`} type="button" key={align} onClick={() => setSettings({ align })}>
            {align}
          </button>
        ))}
      </div>

      <div className="study-panel-actions">
        <button className="button ghost icon-text" type="button" onClick={onDuplicate}>
          <Copy size={16} aria-hidden />
          Duplicate
        </button>
        <button className="button danger icon-text" type="button" onClick={onDelete}>
          <Trash2 size={16} aria-hidden />
          Delete
        </button>
      </div>
    </aside>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <div className="study-color-row">
      <span>{label}</span>
      <div>
        {colors.map((color) => (
          <button
            className={`study-color-dot${value === color ? ' active' : ''}`}
            type="button"
            key={color}
            style={{ background: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  );
}

function RangeField({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="study-range-field">
      <span>{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function StudyReadView({
  title,
  tags,
  blocks,
  templates,
  materialByNormalizedTitle,
  collapsedBlockIds,
  pageWidth,
  onPageWidthChange,
  onToggleCollapsed,
  onOpenMaterial,
}: {
  title: string;
  tags: string[];
  blocks: StudyBlock[];
  templates: StudyCustomBlockTemplate[];
  materialByNormalizedTitle: Map<string, StudyMaterial>;
  collapsedBlockIds: Set<string>;
  pageWidth: number;
  onPageWidthChange: (width: number) => void;
  onToggleCollapsed: (blockId: string) => void;
  onOpenMaterial: (nodeId: string) => void;
}) {
  return (
    <div className="study-read-shell">
      <div className="study-read-toolbar glass-panel">
        <div className="study-inline-actions">
          <Tooltip content="Print or save as PDF">
            <button className="button ghost icon-text" type="button" onClick={() => window.print()}>
              <Printer size={16} aria-hidden />
              Print
            </button>
          </Tooltip>
          <label className="study-read-width">
            <span>Width</span>
            <select value={pageWidth} onChange={(event) => onPageWidthChange(Number(event.target.value))}>
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
                templates={templates}
                materialByNormalizedTitle={materialByNormalizedTitle}
                collapsedBlockIds={collapsedBlockIds}
                onToggleCollapsed={onToggleCollapsed}
                onOpenMaterial={onOpenMaterial}
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
  templates,
  materialByNormalizedTitle,
  collapsedBlockIds,
  onToggleCollapsed,
  onOpenMaterial,
}: {
  block: StudyBlock;
  templates: StudyCustomBlockTemplate[];
  materialByNormalizedTitle: Map<string, StudyMaterial>;
  collapsedBlockIds: Set<string>;
  onToggleCollapsed: (blockId: string) => void;
  onOpenMaterial: (nodeId: string) => void;
}) {
  const collapsed = collapsedBlockIds.has(block.id);
  return (
    <section className={`study-read-block type-${block.type}`} data-study-read-block-id={block.id} style={getBlockStyle(block)}>
      <ReadBlockContent
        block={block}
        templates={templates}
        materialByNormalizedTitle={materialByNormalizedTitle}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onOpenMaterial={onOpenMaterial}
      />
      {!collapsed && (block.children ?? []).length > 0 ? (
        <div className="study-read-children">
          {(block.children ?? []).map((child) => (
            <ReadBlock
              key={child.id}
              block={child}
              templates={templates}
              materialByNormalizedTitle={materialByNormalizedTitle}
              collapsedBlockIds={collapsedBlockIds}
              onToggleCollapsed={onToggleCollapsed}
              onOpenMaterial={onOpenMaterial}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReadBlockContent({
  block,
  templates,
  materialByNormalizedTitle,
  collapsed,
  onToggleCollapsed,
  onOpenMaterial,
}: {
  block: StudyBlock;
  templates: StudyCustomBlockTemplate[];
  materialByNormalizedTitle: Map<string, StudyMaterial>;
  collapsed: boolean;
  onToggleCollapsed: (blockId: string) => void;
  onOpenMaterial: (nodeId: string) => void;
}) {
  if (isContentBlock(block)) {
    if (block.type === 'heading') {
      const Tag = `h${block.settings?.headingStyle ?? 1}` as 'h1' | 'h2' | 'h3';
      return (
        <div className="study-read-heading-row">
          {(block.children ?? []).length > 0 ? (
            <button className="study-collapse-button accent" type="button" onClick={() => onToggleCollapsed(block.id)}>
              {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
            </button>
          ) : null}
          <Tag>{renderInlineLinks(block.content, materialByNormalizedTitle, onOpenMaterial)}</Tag>
        </div>
      );
    }
    if (block.type === 'markdown') {
      return <div className="study-markdown-preview">{renderMarkdown(block.content, materialByNormalizedTitle, onOpenMaterial)}</div>;
    }
    if (block.type === 'code') {
      return (
        <div className="study-code-preview">
          <div className="study-code-label">{block.language ?? block.settings?.codeLanguage ?? 'text'}</div>
          <pre><code>{block.content}</code></pre>
        </div>
      );
    }
    if (block.type === 'latex') {
      return <div className="study-latex-preview">{block.content || 'Formula'}</div>;
    }
    return <p>{renderInlineLinks(block.content, materialByNormalizedTitle, onOpenMaterial)}</p>;
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
                  return <Cell key={`${rowIndex}-${cellIndex}`}>{cell}</Cell>;
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
          <span>{block.mimeType || 'unknown'} - {formatStudyFileSize(block.size)}</span>
          {block.url ? <a href={block.url} target="_blank" rel="noreferrer">{block.url}</a> : null}
          {block.note ? <p>{block.note}</p> : null}
          <StudyFilePreview block={block} />
        </div>
      </div>
    );
  }

  if (block.type === 'divider') {
    return <hr className="study-divider" style={{ borderColor: block.settings?.dividerColor ?? 'var(--border)' }} />;
  }

  const template = templates.find((item) => item.id === block.templateId);
  return (
    <div className="study-custom-read" style={{ borderColor: template?.accentColor }}>
      <strong>{template?.title ?? 'Custom block'}</strong>
      {template?.fields.map((field) => (
        <p key={field.id}>
          <span>{field.label}</span>
          <b>{renderCustomValue(block.values[field.id], field.type)}</b>
        </p>
      ))}
    </div>
  );
}

function StudyLinksView({
  linkedTitles,
  allMaterials,
  currentMaterialId,
  materialByNormalizedTitle,
  onOpenMaterial,
}: {
  linkedTitles: string[];
  allMaterials: StudyMaterial[];
  currentMaterialId: string;
  materialByNormalizedTitle: Map<string, StudyMaterial>;
  onOpenMaterial: (nodeId: string) => void;
}) {
  const currentMaterial = allMaterials.find((material) => material.id === currentMaterialId);
  const currentTitle = currentMaterial?.title.trim().toLowerCase() ?? '';
  const backlinks = allMaterials.filter((material) => {
    if (material.id === currentMaterialId) {
      return false;
    }
    return extractInternalLinks(material.blocks.map(getStudyBlockText).join('\n')).some((title) => title.trim().toLowerCase() === currentTitle);
  });
  return (
    <div className="study-links-view glass-panel">
      <section>
        <h2>Outgoing links</h2>
        {linkedTitles.length === 0 ? <p className="study-muted">No internal links yet. Use [[Material title]].</p> : (
          <div className="study-link-list">
            {linkedTitles.map((title) => {
              const target = materialByNormalizedTitle.get(title.toLowerCase());
              return (
                <button
                  className={target ? 'valid' : 'broken'}
                  type="button"
                  key={title}
                  disabled={!target}
                  onClick={() => target && onOpenMaterial(target.nodeId)}
                >
                  {title}
                </button>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <h2>Backlinks</h2>
        {backlinks.length === 0 ? <p className="study-muted">No backlinks found.</p> : backlinks.map((material) => (
          <button className="study-link-card" type="button" key={material.id} onClick={() => onOpenMaterial(material.nodeId)}>
            <strong>{material.title}</strong>
            <span>{material.blocks.length} blocks</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function BlockIcon({ type }: { type: StudyBlockType }) {
  if (type === 'heading') return <Heading1 size={16} aria-hidden />;
  if (type === 'code') return <Code2 size={16} aria-hidden />;
  if (type === 'markdown') return <Braces size={16} aria-hidden />;
  if (type === 'table') return <Table2 size={16} aria-hidden />;
  if (type === 'board') return <Paintbrush size={16} aria-hidden />;
  if (type === 'file') return <FileText size={16} aria-hidden />;
  if (type === 'divider') return <Minus size={16} aria-hidden />;
  if (type === 'definition' || type === 'problem' || type === 'solution') return <Quote size={16} aria-hidden />;
  return <Type size={16} aria-hidden />;
}

function getBlockStyle(block: StudyBlock): CSSProperties {
  return {
    color: block.settings?.textColor,
    background: block.settings?.backgroundColor,
    padding: block.settings?.padding,
    textAlign: block.settings?.align,
    fontSize: block.settings?.fontSize,
  };
}

function extractInternalLinks(text: string) {
  return Array.from(text.matchAll(/\[\[([^\]]+)\]\]/g)).map((match) => match[1].trim()).filter(Boolean);
}

function renderCustomValue(value: string | number | boolean | undefined, type: StudyCustomFieldType) {
  if (type === 'checkbox') {
    return value ? 'Yes' : 'No';
  }
  return String(value ?? '');
}

function renderInlineLinks(text: string, materialByNormalizedTitle: Map<string, StudyMaterial>, onOpenMaterial: (nodeId: string) => void) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, index) => {
    const match = part.match(/\[\[([^\]]+)\]\]/);
    if (match) {
      const title = match[1].trim();
      const target = materialByNormalizedTitle.get(title.toLowerCase());
      return (
        <button
          className={`study-inline-link${target ? '' : ' broken'}`}
          type="button"
          key={`${part}-${index}`}
          onClick={() => target && onOpenMaterial(target.nodeId)}
          disabled={!target}
        >
          {title}
        </button>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderMarkdown(text: string, materialByNormalizedTitle: Map<string, StudyMaterial>, onOpenMaterial: (nodeId: string) => void) {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    if (line.startsWith('---')) return <hr className="study-divider" key={index} />;
    if (line.startsWith('### ')) return <h3 key={index}>{renderInlineLinks(line.slice(4), materialByNormalizedTitle, onOpenMaterial)}</h3>;
    if (line.startsWith('## ')) return <h2 key={index}>{renderInlineLinks(line.slice(3), materialByNormalizedTitle, onOpenMaterial)}</h2>;
    if (line.startsWith('# ')) return <h1 key={index}>{renderInlineLinks(line.slice(2), materialByNormalizedTitle, onOpenMaterial)}</h1>;
    if (line.startsWith('> ')) return <blockquote key={index}>{renderInlineLinks(line.slice(2), materialByNormalizedTitle, onOpenMaterial)}</blockquote>;
    if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const checked = /\[[xX]\]/.test(line);
      return (
        <label className="study-markdown-check" key={index}>
          <input type="checkbox" checked={checked} readOnly />
          <span>{renderInlineLinks(line.replace(/^\s*[-*]\s+\[[ xX]\]\s+/, ''), materialByNormalizedTitle, onOpenMaterial)}</span>
        </label>
      );
    }
    if (/^\s*[-*]\s+/.test(line)) return <p className="study-markdown-list" key={index}>- {renderInlineLinks(line.replace(/^\s*[-*]\s+/, ''), materialByNormalizedTitle, onOpenMaterial)}</p>;
    if (/^\s*\d+\.\s+/.test(line)) return <p className="study-markdown-list" key={index}>{renderInlineLinks(line.trim(), materialByNormalizedTitle, onOpenMaterial)}</p>;
    return <p key={index}>{renderInlineLinks(line, materialByNormalizedTitle, onOpenMaterial)}</p>;
  });
}
