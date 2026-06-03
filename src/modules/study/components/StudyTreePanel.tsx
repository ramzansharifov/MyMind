import { Copy, FileText, Folder, FolderPlus, ListTree, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  onMoveNode: (nodeId: string, parentId: string | null) => void;
  tocItems?: StudyTocItem[];
  showToc?: boolean;
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
}: StudyTreePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(nodes.filter((node) => node.type === 'folder').map((node) => node.id)));
  const [menuNodeId, setMenuNodeId] = useState<string | null>(null);
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
      return `${node.title} ${material ? getStudyMaterialPreview(material) : ''}`.toLowerCase().includes(normalizedQuery);
    };

    const walk = (node: StudyNode): boolean => {
      const childMatches = (byParent.get(node.id) ?? []).some(walk);
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
        className="study-tree-root"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          const nodeId = event.dataTransfer.getData('text/study-node');
          if (nodeId) {
            onMoveNode(nodeId, null);
          }
        }}
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
            onToggleExpanded={toggleExpanded}
            onSelectNode={onSelectNode}
            onCreateFolder={onCreateFolder}
            onCreateMaterial={onCreateMaterial}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
            onDuplicateMaterial={onDuplicateMaterial}
            onMoveNode={onMoveNode}
            onSetMenuNodeId={setMenuNodeId}
          />
        ))}
      </div>

      {showToc ? (
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
      ) : null}
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
  onToggleExpanded: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateMaterial: (parentId: string | null) => void;
  onRenameNode: (node: StudyNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateMaterial: (nodeId: string) => void;
  onMoveNode: (nodeId: string, parentId: string | null) => void;
  onSetMenuNodeId: (nodeId: string | null) => void;
}

function TreeNode({
  node,
  nodes,
  materials,
  visibleNodeIds,
  selectedNodeId,
  expanded,
  menuNodeId,
  onToggleExpanded,
  onSelectNode,
  onCreateFolder,
  onCreateMaterial,
  onRenameNode,
  onDeleteNode,
  onDuplicateMaterial,
  onMoveNode,
  onSetMenuNodeId,
}: TreeNodeProps) {
  if (!visibleNodeIds.has(node.id)) {
    return null;
  }

  const children = getNodeChildren(nodes, node.id).filter((child) => visibleNodeIds.has(child.id));
  const isExpanded = expanded.has(node.id);
  const material = materials.find((item) => item.nodeId === node.id);

  return (
    <div className="study-tree-node">
      <div
        className={`study-tree-row${selectedNodeId === node.id ? ' active' : ''}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/study-node', node.id);
        }}
        onDragOver={(event) => {
          if (node.type === 'folder') {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          if (node.type === 'folder') {
            const draggedNodeId = event.dataTransfer.getData('text/study-node');
            if (draggedNodeId) {
              event.stopPropagation();
              onMoveNode(draggedNodeId, node.id);
            }
          }
        }}
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
          {node.type === 'folder' ? (
            <button
              className="study-tree-expander"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded(node.id);
              }}
            >
              {isExpanded ? 'v' : '>'}
            </button>
          ) : (
            <span className="study-tree-expander spacer" />
          )}
          {node.type === 'folder' ? <Folder size={17} aria-hidden /> : <FileText size={17} aria-hidden />}
          <span>
            <strong>{node.title}</strong>
            {material ? <small>{material.blocks.length} blocks</small> : null}
          </span>
        </div>

        <button className="icon-button subtle" type="button" onClick={() => onSetMenuNodeId(menuNodeId === node.id ? null : node.id)}>
          <MoreHorizontal size={16} aria-hidden />
        </button>

        {menuNodeId === node.id ? (
          <div className="study-tree-menu glass-panel">
            {node.type === 'folder' ? (
              <>
                <button type="button" onClick={() => onCreateFolder(node.id)}>
                  <FolderPlus size={14} aria-hidden />
                  New folder
                </button>
                <button type="button" onClick={() => onCreateMaterial(node.id)}>
                  <Plus size={14} aria-hidden />
                  New material
                </button>
              </>
            ) : (
              <button type="button" onClick={() => onDuplicateMaterial(node.id)}>
                <Copy size={14} aria-hidden />
                Duplicate
              </button>
            )}
            <button type="button" onClick={() => onRenameNode(node)}>
              <Pencil size={14} aria-hidden />
              Rename
            </button>
            <button className="danger" type="button" onClick={() => onDeleteNode(node.id)}>
              <Trash2 size={14} aria-hidden />
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {node.type === 'folder' && isExpanded && children.length > 0 ? (
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
              onToggleExpanded={onToggleExpanded}
              onSelectNode={onSelectNode}
              onCreateFolder={onCreateFolder}
              onCreateMaterial={onCreateMaterial}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
              onDuplicateMaterial={onDuplicateMaterial}
              onMoveNode={onMoveNode}
              onSetMenuNodeId={onSetMenuNodeId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
