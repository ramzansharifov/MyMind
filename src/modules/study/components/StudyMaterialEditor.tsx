import {
  FileText,
  Link2,
  Pencil,
  Plus,
  Settings,
  Heading1,
  Type,
  Divide,
  Table2,
  Paintbrush,
  Code2,
  Braces,
  Quote,
} from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import {
  createCustomStudyBlock,
  createStudyBlock,
  nowIso,
  STUDY_BLOCK_TYPES,
  getStudyBlockLabel,
} from '../studyUtils';
import {
  findBlockById,
  updateBlockTree,
  deleteBlockFromTree,
  duplicateBlockInTree,
  moveBlockInTree,
  nestBlockIntoPreviousSibling,
  unnestBlockFromParent,
} from '../utils/blockTree';
import {
    setCurrentInternalNavigationNode,
    saveExplicitInternalLinkReturnTarget,
} from '../utils/internalNavigationHistory';
import type {
  StudyBlock,
  StudyBlockType,
  StudyCustomBlockTemplate,
  StudyMaterial,
  StudyNode,
} from '../types';
import { EditableBlockCard } from './editor/StudyBlockCard';
import { StudySettingsPanel } from './editor/StudySettingsPanel';
import { emptyRichTextMarks } from '../utils/richTextCore';
import type { RichTextActiveMarks, RichTextCommand, RichTextCommandType } from './editor/StudyRichTextEditor';
import { StudyReadView } from './editor/StudyReadView';
import { StudyLinksView } from './editor/StudyLinksView';
import { StudyInternalLinkBackButton } from './editor/StudyInternalLinkBackButton';

interface StudyMaterialEditorProps {
  material: StudyMaterial;
  nodes: StudyNode[];
  allMaterials: StudyMaterial[];
  templates: StudyCustomBlockTemplate[];
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  onChange: (material: StudyMaterial) => void;
  onOpenMaterial: (nodeId: string) => void;
  onOpenTemplateManager: () => void;
  focusBlockId?: string | null;
  onFocusBlockConsumed?: () => void;
}

export type StudyMode = 'edit' | 'read' | 'links';

export function StudyMaterialEditor({
  material,
  nodes,
  allMaterials,
  templates,
  mode,
  onModeChange,
  onChange,
  onOpenMaterial,
  onOpenTemplateManager,
  focusBlockId,
  onFocusBlockConsumed,
}: StudyMaterialEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(material.blocks[0]?.id ?? null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(() => new Set());

  const [richTextCommand, setRichTextCommand] = useState<RichTextCommand | null>(null);
  const [richTextMarks, setRichTextMarks] = useState<RichTextActiveMarks>(emptyRichTextMarks);
  const [activeRichTextEditorId, setActiveRichTextEditorId] = useState<string | null>(null);
  const richTextCommandIdRef = useRef(0);

  const selectedBlock = useMemo(() => findBlockById(material.blocks, selectedBlockId), [material.blocks, selectedBlockId]);

  useEffect(() => {
    if (!focusBlockId) return;
    const exists = findBlockById(material.blocks, focusBlockId);
    if (!exists) {
      onFocusBlockConsumed?.();
      return;
    }
    setSelectedBlockId(focusBlockId);
    window.setTimeout(() => {
      document.querySelector(`[data-study-block-id="${focusBlockId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onFocusBlockConsumed?.();
    }, 100);
  }, [focusBlockId, material.blocks, onFocusBlockConsumed]);

  useEffect(() => {
    setCurrentInternalNavigationNode(material.nodeId, material.title);
  }, [material.nodeId, material.title]);

  function updateMaterial(patch: Partial<StudyMaterial>) {
    onChange({ ...material, ...patch, updatedAt: nowIso() });
  }

  function updateBlocks(blocks: StudyBlock[]) {
    updateMaterial({ blocks });
  }

  function updateBlock(blockId: string, update: (block: StudyBlock) => StudyBlock) {
    updateBlocks(updateBlockTree(material.blocks, blockId, update));
  }

  function addBlock(type: StudyBlockType) {
    const block = createStudyBlock(type);
    if (selectedBlockId) {
        updateBlock(selectedBlockId, (item) => ({ ...item, children: [...(item.children ?? []), block], collapsed: false }));
    } else {
        updateBlocks([...material.blocks, block]);
    }
    setSelectedBlockId(block.id);
  }

  function addCustomBlock(template: StudyCustomBlockTemplate) {
    const block = createCustomStudyBlock(template);
    if (selectedBlockId) {
        updateBlock(selectedBlockId, (item) => ({ ...item, children: [...(item.children ?? []), block], collapsed: false }));
    } else {
        updateBlocks([...material.blocks, block]);
    }
    setSelectedBlockId(block.id);
  }

  const [pendingDeleteBlockId, setPendingDeleteBlockId] = useState<string | null>(null);

  function deleteBlock(blockId: string) {
    updateBlocks(deleteBlockFromTree(material.blocks, blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    setPendingDeleteBlockId(null);
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

  function sendRichTextCommand(command: RichTextCommandType, value?: string) {
    const targetEditorId = activeRichTextEditorId ?? (selectedBlock?.type === 'text' ? selectedBlock.id : null);
    if (!targetEditorId) {
        return;
    }
    setRichTextCommand({
      id: (richTextCommandIdRef.current += 1),
      type: command,
      value,
      targetEditorId,
    });
  }

  function openNodeFromInternalLink(targetNodeId: string) {
    saveExplicitInternalLinkReturnTarget(material.nodeId, material.title, targetNodeId);
    onOpenMaterial(targetNodeId);
  }

  const renderBlocks = (blocks: StudyBlock[], level = 0): React.ReactNode => {
      return blocks.map((block, index) => (
        <EditableBlockCard
            key={block.id}
            block={block}
            level={level}
            nodes={nodes}
            templates={templates}
            selectedBlockId={selectedBlockId}
            collapsedBlockIds={collapsedBlockIds}
            richTextCommand={selectedBlockId === block.id ? richTextCommand : null}
            index={index}
            onRichTextMarksChange={(marks) => {
                if (selectedBlockId === block.id) setRichTextMarks(marks);
            }}
            onActiveRichTextEditorChange={setActiveRichTextEditorId}
            onSelect={setSelectedBlockId}
            onUpdate={updateBlock}
            onDelete={deleteBlock}
            onDuplicate={(id) => updateBlocks(duplicateBlockInTree(material.blocks, id))}
            onMove={(id, dir) => updateBlocks(moveBlockInTree(material.blocks, id, dir))}
            onNest={(id) => updateBlocks(nestBlockIntoPreviousSibling(material.blocks, id).blocks)}
            onUnnest={(id) => updateBlocks(unnestBlockFromParent(material.blocks, id).blocks)}
            onToggleCollapsed={toggleCollapsed}
            onOpenNode={openNodeFromInternalLink}
            nestedContent={block.children && block.children.length > 0 && !collapsedBlockIds.has(block.id) ? renderBlocks(block.children, level + 1) : null}
        />
      ));
  };

  return (
    <div className="study-material-editor" onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-study-block-id]') && !target.closest('.study-side-panel') && !target.closest('.study-material-top')) {
            setSelectedBlockId(null);
        }
    }}>
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
            <AddBlockBar templates={templates} onAddBlock={addBlock} onAddCustomBlock={addCustomBlock} onOpenTemplateManager={onOpenTemplateManager} />
            <StudyInternalLinkBackButton currentNodeId={material.nodeId} onOpenNode={onOpenMaterial} />

            {material.blocks.length === 0 ? (
              <button className="study-empty-block glass-panel" type="button" onClick={() => addBlock('text')}>
                <Plus size={18} aria-hidden />
                Add the first block
              </button>
            ) : (
              <div className="study-block-list">
                {renderBlocks(material.blocks)}
              </div>
            )}
          </div>

          <StudySettingsPanel
            block={selectedBlock}
            nodes={nodes}
            richTextMarks={richTextMarks}
            onRichTextCommand={sendRichTextCommand}
            onChangeSettings={(settings) => selectedBlock && updateBlock(selectedBlock.id, (b) => ({ ...b, settings }))}
            onDuplicate={() => selectedBlock && updateBlocks(duplicateBlockInTree(material.blocks, selectedBlock.id))}
            onDelete={() => selectedBlock && setPendingDeleteBlockId(selectedBlock.id)}
          />
        </div>
      ) : mode === 'read' ? (
         <StudyReadView
            title={material.title}
            tags={material.tags}
            blocks={material.blocks}
            nodes={nodes}
            templates={templates}
            collapsedBlockIds={collapsedBlockIds}
            onToggleCollapsed={toggleCollapsed}
            onOpenNode={openNodeFromInternalLink}
         />
      ) : (
         <StudyLinksView
            material={material}
            nodes={nodes}
            allMaterials={allMaterials}
            onOpenMaterial={onOpenMaterial}
         />
      )}
    </div>
  );
}

function AddBlockBar({ templates, onAddBlock, onAddCustomBlock, onOpenTemplateManager }: {
    templates: StudyCustomBlockTemplate[];
    onAddBlock: (type: StudyBlockType) => void;
    onAddCustomBlock: (template: StudyCustomBlockTemplate) => void;
    onOpenTemplateManager: () => void;
}) {
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
          <Plus size={16} aria-hidden />
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

function BlockIcon({ type }: { type: StudyBlockType }) {
  if (type === 'heading') return <Heading1 size={16} aria-hidden />;
  if (type === 'code') return <Code2 size={16} aria-hidden />;
  if (type === 'markdown') return <Braces size={16} aria-hidden />;
  if (type === 'table') return <Table2 size={16} aria-hidden />;
  if (type === 'board') return <Paintbrush size={16} aria-hidden />;
  if (type === 'file') return <FileText size={16} aria-hidden />;
  if (type === 'divider') return <Divide size={16} aria-hidden />;
  if (type === 'definition' || type === 'problem' || type === 'solution') return <Quote size={16} aria-hidden />;
  return <Type size={16} aria-hidden />;
}
