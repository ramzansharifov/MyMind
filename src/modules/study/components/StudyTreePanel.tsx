import {
  Copy,
  FileText,
  Folder,
  FolderPlus,
  ListTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { Tooltip } from '../../../shared/components/Tooltip';
import { getNodeChildren, getStudyMaterialPreview } from '../studyUtils';
import type { StudyMaterial, StudyNode } from '../types';
import type { StudyTocItem } from '../utils/readToc';

interface StudyTreePanelProps {
  nodes: StudyNode[];
  materials: StudyMaterial[];
  selectedNodeId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelectNode: (nodeId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateMaterial: (parentId: string | null) => void;
  onRenameNode: (node: StudyNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateMaterial: (nodeId: string) => void;
  onMoveNode: (draggedNodeId: string, targetParentId: string | null) => void;
  tocItems?: StudyTocItem[];
  showToc?: boolean;
  collapsed?: boolean;
  onTocItemClick?: (blockId: string) => void;
}

export function StudyTreePanel({
  nodes,
  materials,
  selectedNodeId,
  query,
  onQueryChange,
  onSelectNode,
  onCreateFolder,
  onCreateMaterial,
  onRenameNode,
  onDeleteNode,
  onDuplicateMaterial,
  onMoveNode,
  tocItems = [],
  showToc = false,
  onTocItemClick,
  collapsed = false,
}: StudyTreePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(nodes.filter((node) => node.type === 'folder').map((node) => node.id)));
  const [menuNodeId, setMenuNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isRootDropActive, setIsRootDropActive] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleNodeIds = useMemo(() => {
    if (!normalizedQuery) {
      return new Set(nodes.map((node) => node.id));
    }

    const byParent = new Map<string | null, StudyNode[]>();
    nodes.forEach((node) => {
      const children = byParent.get(node.parentId) ?? [];
      children.push(node);
      byParent.set(node.parentId, children);
    });

    const visible = new Set<string>();
    const matches = (node: StudyNode) => {
      const material = materials.find((item) => item.nodeId === node.id);
      return `${node.title} ${material ? getStudyMaterialPreview(material) : ''}`.toLowerCase().indexOf(normalizedQuery) !== -1;
    };

    const walk = (node: StudyNode): boolean => {
      const children = byParent.get(node.id) ?? [];
      const childMatches = children.some(walk);
      const nodeMatches = matches(node);
      if (nodeMatches || childMatches) {
        visible.add(node.id);
        let parentId = node.parentId;
        while (parentId) {
          visible.add(parentId);
          parentId = nodes.find((item) => item.id === parentId)?.parentId ?? null;
        }
      }
      return nodeMatches || childMatches;
    };
    getNodeChildren(nodes, null).forEach(walk);
    return visible;
  }, [materials, nodes, normalizedQuery]);

  function toggleExpanded(nodeId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function handleRootDragOver(event: DragEvent) {
    event.preventDefault();
    if (draggedNodeId) {
      setIsRootDropActive(true);
      setDropTargetId(null);
    }
  }

  function handleRootDrop(event: DragEvent) {
    event.preventDefault();
    setIsRootDropActive(false);
    const nodeId = event.dataTransfer.getData('text/study-node');
    if (nodeId) {
      onMoveNode(nodeId, null);
    }
  }

  if (collapsed) return null;

  return (
    <aside className="study-tree-panel glass-panel">
      <div className="study-tree-head">
        <div>
          <strong>Library</strong>
          <span>{nodes.length} nodes</span>
        </div>
        <div className="study-inline-actions">
          <Tooltip content="Create root folder">
            <button className="icon-button" type="button" onClick={() => onCreateFolder(null)}>
              <FolderPlus size={17} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Create root material">
            <button className="icon-button" type="button" onClick={() => onCreateMaterial(null)}>
              <Plus size={17} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>

      <label className="study-tree-search">
        <Search size={16} aria-hidden />
        <input value={query} placeholder="Search study" onChange={(event) => onQueryChange(event.target.value)} />
      </label>

      <div
        className={`study-tree-root${isRootDropActive ? ' drop-active' : ''}`}
        onDragOver={handleRootDragOver}
        onDragLeave={() => setIsRootDropActive(false)}
        onDrop={handleRootDrop}
      >
        {getNodeChildren(nodes, null).map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            nodes={nodes}
            materials={materials}
            visibleNodeIds={visibleNodeIds}
            selectedNodeId={selectedNodeId}
            expanded={expanded}
            menuNodeId={menuNodeId}
            draggedNodeId={draggedNodeId}
            dropTargetId={dropTargetId}
            onToggleExpanded={toggleExpanded}
            onSelectNode={onSelectNode}
            onCreateFolder={onCreateFolder}
            onCreateMaterial={onCreateMaterial}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
            onDuplicateMaterial={onDuplicateMaterial}
            onMoveNode={onMoveNode}
            onSetMenuNodeId={setMenuNodeId}
            onDragStart={setDraggedNodeId}
            onDragEnd={() => {
              setDraggedNodeId(null);
              setDropTargetId(null);
            }}
            onDragOverNode={setDropTargetId}
          />
        ))}

        {nodes.length === 0 && (
          <div className="study-tree-empty">
             <p className="study-muted">Tree is empty.</p>
          </div>
        )}

        <div className={`study-tree-root-dropzone${isRootDropActive ? ' active' : ''}`}>
            Drag here to move to root
        </div>
      </div>

      {showToc && (
        <div className="study-read-toc study-tree-toc">
          <div className="study-read-toc-head">
            <ListTree size={17} aria-hidden />
            <strong>Contents</strong>
          </div>
          {tocItems.length > 0 ? (
            <nav>
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  style={{ paddingLeft: 10 + (item.level - 1) * 16 }}
                  onClick={() => onTocItemClick?.(item.id)}
                >
                  <span>H{item.level}</span>
                  {item.title}
                </button>
              ))}
            </nav>
          ) : (
            <p className="study-muted">No headings yet.</p>
          )}
        </div>
      )}
    </aside>
  );
}

interface TreeNodeProps {
  node: StudyNode;
  nodes: StudyNode[];
  materials: StudyMaterial[];
  visibleNodeIds: Set<string>;
  selectedNodeId: string | null;
  expanded: Set<string>;
  menuNodeId: string | null;
  draggedNodeId: string | null;
  dropTargetId: string | null;
  onToggleExpanded: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateMaterial: (parentId: string | null) => void;
  onRenameNode: (node: StudyNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateMaterial: (nodeId: string) => void;
  onMoveNode: (draggedNodeId: string, targetParentId: string | null) => void;
  onSetMenuNodeId: (nodeId: string | null) => void;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDragOverNode: (nodeId: string | null) => void;
}

function TreeNode({
  node,
  nodes,
  materials,
  visibleNodeIds,
  selectedNodeId,
  expanded,
  menuNodeId,
  draggedNodeId,
  dropTargetId,
  onToggleExpanded,
  onSelectNode,
  onCreateFolder,
  onCreateMaterial,
  onRenameNode,
  onDeleteNode,
  onDuplicateMaterial,
  onMoveNode,
  onSetMenuNodeId,
  onDragStart,
  onDragEnd,
  onDragOverNode,
}: TreeNodeProps) {
  if (!visibleNodeIds.has(node.id)) {
    return null;
  }

  const children = getNodeChildren(nodes, node.id).filter((child) => visibleNodeIds.has(child.id));
  const isExpanded = expanded.has(node.id);
  const material = materials.find((item) => item.nodeId === node.id);
  const isFolder = node.type === 'folder';
  const isDropTarget = dropTargetId === node.id;

  function handleDragOver(event: DragEvent) {
    if (isFolder && draggedNodeId && draggedNodeId !== node.id) {
      event.preventDefault();
      event.stopPropagation();
      onDragOverNode(node.id);
    }
  }

  function handleDrop(event: DragEvent) {
    if (isFolder) {
      event.preventDefault();
      event.stopPropagation();
      const id = event.dataTransfer.getData('text/study-node');
      if (id && id !== node.id) {
        onMoveNode(id, node.id);
      }
    }
    onDragEnd();
  }

  return (
    <div className="study-tree-node">
      <div
        className={`study-tree-row${selectedNodeId === node.id ? ' active' : ''}${isDropTarget ? ' drop-target' : ''}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/study-node', node.id);
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={() => isDropTarget && onDragOverNode(null)}
        onDrop={handleDrop}
      >
        <div
          className="study-tree-main-button"
          role="button"
          tabIndex={0}
          onClick={() => onSelectNode(node.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelectNode(node.id);
            }
          }}
        >
          <button
            className="study-tree-expander"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
                if (isFolder) onToggleExpanded(node.id);
            }}
          >
            {isFolder ? (
              isExpanded ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />
            ) : (
              <span className="study-tree-expander-spacer" aria-hidden />
            )}
          </button>
          <span className="study-tree-node-type">
            {isFolder ? <Folder size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
          </span>
          <span className="study-tree-node-title">
            <strong>{node.title}</strong>
            {material && material.blocks.length > 0 && <small>{material.blocks.length} blocks</small>}
          </span>
          {isDropTarget && <span className="study-drop-inside-label">DROP INSIDE</span>}
        </div>

        <div className="study-tree-actions" onClick={e => e.stopPropagation()}>
            {isFolder ? (
              <>
                <Tooltip content="New folder">
                  <button className="study-tree-action-btn" type="button" onClick={() => onCreateFolder(node.id)}>
                    <FolderPlus size={14} aria-hidden />
                  </button>
                </Tooltip>
                <Tooltip content="New material">
                  <button className="study-tree-action-btn" type="button" onClick={() => onCreateMaterial(node.id)}>
                    <Plus size={14} aria-hidden />
                  </button>
                </Tooltip>
              </>
            ) : (
              <Tooltip content="Duplicate">
                <button className="study-tree-action-btn" type="button" onClick={() => onDuplicateMaterial(node.id)}>
                  <Copy size={14} aria-hidden />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Rename">
              <button className="study-tree-action-btn" type="button" onClick={() => onRenameNode(node)}>
                <Pencil size={14} aria-hidden />
              </button>
            </Tooltip>
            <Tooltip content="Delete">
              <button className="study-tree-action-btn danger" type="button" onClick={() => onDeleteNode(node.id)}>
                <Trash2 size={14} aria-hidden />
              </button>
            </Tooltip>

            <button
                className={`icon-button subtle menu-trigger${menuNodeId === node.id ? ' active' : ''}`}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSetMenuNodeId(menuNodeId === node.id ? null : node.id);
                }}
            >
                <MoreHorizontal size={16} aria-hidden />
            </button>
        </div>

        {menuNodeId === node.id && (
          <div className="study-tree-menu glass-panel" onMouseDown={(e) => e.stopPropagation()}>
            {isFolder ? (
              <>
                <button type="button" onClick={() => { onCreateFolder(node.id); onSetMenuNodeId(null); }}>
                  <FolderPlus size={14} aria-hidden />
                  New folder
                </button>
                <button type="button" onClick={() => { onCreateMaterial(node.id); onSetMenuNodeId(null); }}>
                  <Plus size={14} aria-hidden />
                  New material
                </button>
              </>
            ) : (
              <button type="button" onClick={() => { onDuplicateMaterial(node.id); onSetMenuNodeId(null); }}>
                <Copy size={14} aria-hidden />
                Duplicate
              </button>
            )}
            <button type="button" onClick={() => { onRenameNode(node); onSetMenuNodeId(null); }}>
              <Pencil size={14} aria-hidden />
              Rename
            </button>
            <button className="danger" type="button" onClick={() => { onDeleteNode(node.id); onSetMenuNodeId(null); }}>
              <Trash2 size={14} aria-hidden />
              Delete
            </button>
          </div>
        )}
      </div>

      {isFolder && isExpanded && children.length > 0 && (
        <div className="study-tree-children">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              nodes={nodes}
              materials={materials}
              visibleNodeIds={visibleNodeIds}
              selectedNodeId={selectedNodeId}
              expanded={expanded}
              menuNodeId={menuNodeId}
              draggedNodeId={draggedNodeId}
              dropTargetId={dropTargetId}
              onToggleExpanded={onToggleExpanded}
              onSelectNode={onSelectNode}
              onCreateFolder={onCreateFolder}
              onCreateMaterial={onCreateMaterial}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
              onDuplicateMaterial={onDuplicateMaterial}
              onMoveNode={onMoveNode}
              onSetMenuNodeId={onSetMenuNodeId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverNode={onDragOverNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
