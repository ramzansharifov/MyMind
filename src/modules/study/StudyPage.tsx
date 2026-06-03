import { FolderPlus, Plus, Redo2, Undo2, Folder, FileText } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { Tooltip } from '../../shared/components/Tooltip';
import { StudyMaterialEditor, type StudyMode } from './components/StudyMaterialEditor';
import { StudyTemplateManager } from './components/StudyTemplateManager';
import { StudyTreePanel } from './components/StudyTreePanel';
import { StudyCommandPalette } from './components/editor/StudyCommandPalette';
import { StudyAppNoticeViewport } from './components/editor/StudyAppNoticeViewport';
import {
  collectStudyTocItems,
  scrollToStudyReadBlock,
} from './utils/readToc';
import {
  collectNodeDescendants,
  createStudyMaterial,
  createStudyNode,
  getNodeChildren,
  getNodePath,
  normalizeStudyData,
  nowIso,
} from './studyUtils';
import type { StudyCustomBlockTemplate, StudyData, StudyMaterial, StudyNode, StudyNodeType } from './types';
import { clearInternalLinkReturnTarget, getInternalLinkReturnTarget } from './utils/internalNavigationHistory';

interface StudyPageProps {
  data: StudyData;
  onChange: (data: StudyData) => void;
}

type NodeDialog =
  | { type: 'folder' | 'material'; parentId: string | null }
  | { type: 'rename'; node: StudyNode }
  | null;

export function StudyPage({ data, onChange }: StudyPageProps) {
  const safeData = useMemo(() => normalizeStudyData(data), [data]);
  const [query, setQuery] = useState('');
  const [nodeDialog, setNodeDialog] = useState<NodeDialog>(null);
  const [dialogTitle, setDialogTitle] = useState('');
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<StudyMode>('edit');
  const [past, setPast] = useState<StudyData[]>([]);
  const [future, setFuture] = useState<StudyData[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedNode = safeData.nodes.find((node) => node.id === safeData.selectedNodeId) ?? null;
  const selectedMaterial = selectedNode?.type === 'material'
    ? safeData.materials.find((material) => material.nodeId === selectedNode.id) ?? null
    : null;
  const selectedFolder = selectedNode?.type === 'folder' ? selectedNode : null;
  const rootFolders = getNodeChildren(safeData.nodes, null).filter((node) => node.type === 'folder');
  const selectedPath = getNodePath(safeData.nodes, safeData.selectedNodeId);

  const readTocItems = useMemo(
    () => (selectedMaterial && editorMode === 'read' ? collectStudyTocItems(selectedMaterial.blocks) : []),
    [editorMode, selectedMaterial],
  );

  function commit(next: StudyData, options: { remember?: boolean } = {}) {
    const normalized = normalizeStudyData(next);
    if (options.remember !== false) {
      setPast((items) => [...items.slice(-40), safeData]);
      setFuture([]);
    }
    onChange(normalized);
  }

  function updateSelectedNode(nodeId: string | null) {
    commit({ ...safeData, selectedNodeId: nodeId }, { remember: false });
  }

  function createNode(type: StudyNodeType, parentId: string | null, title: string) {
    const order = getNodeChildren(safeData.nodes, parentId).length;
    const node = createStudyNode(type, title, parentId, order);
    const nextMaterials = type === 'material' ? [createStudyMaterial(node.id, title), ...safeData.materials] : safeData.materials;
    commit({
      ...safeData,
      selectedNodeId: node.id,
      nodes: [...safeData.nodes, node],
      materials: nextMaterials,
    });
  }

  function openCreateDialog(type: 'folder' | 'material', parentId: string | null = null) {
    setNodeDialog({ type, parentId });
    setDialogTitle(type === 'folder' ? 'New folder' : 'New material');
  }

  function openRenameDialog(node: StudyNode) {
    setNodeDialog({ type: 'rename', node });
    setDialogTitle(node.title);
  }

  function submitNodeDialog() {
    const title = dialogTitle.trim();
    if (!nodeDialog || !title) {
      return;
    }

    if (nodeDialog.type === 'rename') {
      const timestamp = nowIso();
      const node = nodeDialog.node;
      commit({
        ...safeData,
        nodes: safeData.nodes.map((item) => (item.id === node.id ? { ...item, title, updatedAt: timestamp } : item)),
        materials: safeData.materials.map((material) =>
          material.nodeId === node.id ? { ...material, title, updatedAt: timestamp } : material,
        ),
      });
    } else {
      createNode(nodeDialog.type, nodeDialog.parentId, title);
    }

    setNodeDialog(null);
    setDialogTitle('');
  }

  function deleteNode(nodeId: string) {
    const ids = new Set([nodeId, ...collectNodeDescendants(safeData.nodes, nodeId)]);
    const remainingNodes = safeData.nodes.filter((node) => !ids.has(node.id));
    const remainingMaterials = safeData.materials.filter((material) => !ids.has(material.nodeId));
    const selectedNodeId = ids.has(safeData.selectedNodeId ?? '') ? remainingNodes[0]?.id ?? null : safeData.selectedNodeId;
    commit({
      ...safeData,
      selectedNodeId,
      nodes: remainingNodes,
      materials: remainingMaterials,
    });
  }

  function duplicateMaterial(nodeId: string) {
    const node = safeData.nodes.find((item) => item.id === nodeId);
    const material = safeData.materials.find((item) => item.nodeId === nodeId);
    if (!node || node.type !== 'material' || !material) {
      return;
    }

    const timestamp = nowIso();
    const newNode = createStudyNode('material', `${node.title} copy`, node.parentId, getNodeChildren(safeData.nodes, node.parentId).length);
    const nextMaterial: StudyMaterial = {
      ...structuredClone(material),
      id: newNode.id,
      nodeId: newNode.id,
      title: newNode.title,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    commit({
      ...safeData,
      selectedNodeId: newNode.id,
      nodes: [...safeData.nodes, newNode],
      materials: [nextMaterial, ...safeData.materials],
    });
  }

  function moveNode(nodeId: string, parentId: string | null) {
    if (nodeId === parentId) {
      return;
    }
    const descendants = new Set(collectNodeDescendants(safeData.nodes, nodeId));
    if (parentId && descendants.has(parentId)) {
      return;
    }
    const order = getNodeChildren(safeData.nodes, parentId).length;
    commit({
      ...safeData,
      nodes: safeData.nodes.map((node) => (node.id === nodeId ? { ...node, parentId, order, updatedAt: nowIso() } : node)),
    });
  }

  function updateMaterial(material: StudyMaterial) {
    const timestamp = nowIso();
    commit({
      ...safeData,
      materials: safeData.materials.map((item) => (item.id === material.id ? { ...material, updatedAt: timestamp } : item)),
      nodes: safeData.nodes.map((node) => (node.id === material.nodeId ? { ...node, title: material.title, updatedAt: timestamp } : node)),
    });
  }

  function updateTemplates(customBlockTemplates: StudyCustomBlockTemplate[]) {
    commit({ ...safeData, customBlockTemplates });
  }

  function handleOpenBlock(nodeId: string, blockId: string) {
    updateSelectedNode(nodeId);
    setFocusBlockId(blockId);
    setEditorMode('edit');
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) {
      return;
    }
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [safeData, ...items]);
    onChange(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) {
      return;
    }
    setFuture((items) => items.slice(1));
    setPast((items) => [...items, safeData]);
    onChange(next);
  }

  return (
    <section className="study-page">
      <div className="study-workspace">
        <StudyTreePanel
          nodes={safeData.nodes}
          materials={safeData.materials}
          selectedNodeId={safeData.selectedNodeId}
          query={query}
          onQueryChange={setQuery}
          onSelectNode={updateSelectedNode}
          onCreateFolder={(parentId) => openCreateDialog('folder', parentId)}
          onCreateMaterial={(parentId) => openCreateDialog('material', parentId)}
          onRenameNode={openRenameDialog}
          onDeleteNode={deleteNode}
          onDuplicateMaterial={duplicateMaterial}
          onMoveNode={moveNode}
          tocItems={readTocItems}
          showToc={editorMode === 'read' && !!selectedMaterial}
          onTocItemClick={scrollToStudyReadBlock}
          collapsed={sidebarCollapsed}
        />

        <main className="study-main">
          <PageHeader
            title="Study"
            subtitle="A tree of folders, learning materials, rich blocks, custom templates and read mode."
            actions={(
              <div className="study-header-actions">
                <Tooltip content="Undo">
                  <button className="icon-button" type="button" onClick={undo} disabled={past.length === 0}>
                    <Undo2 size={18} aria-hidden />
                  </button>
                </Tooltip>
                <Tooltip content="Redo">
                  <button className="icon-button" type="button" onClick={redo} disabled={future.length === 0}>
                    <Redo2 size={18} aria-hidden />
                  </button>
                </Tooltip>
                <Tooltip content="Create folder">
                  <button className="button ghost icon-text" type="button" onClick={() => openCreateDialog('folder')}>
                    <FolderPlus size={18} aria-hidden />
                    Folder
                  </button>
                </Tooltip>
                <AddButton label="Add material" onClick={() => openCreateDialog('material', selectedFolder?.id ?? null)} />
              </div>
            )}
          />

          {selectedPath.length > 0 ? (
            <div className="study-breadcrumbs">
              {selectedPath.map((node) => (
                <button key={node.id} type="button" onClick={() => updateSelectedNode(node.id)}>
                  {node.title}
                </button>
              ))}
            </div>
          ) : null}

          {selectedMaterial ? (
            <StudyMaterialEditor
              material={selectedMaterial}
              nodes={safeData.nodes}
              allMaterials={safeData.materials}
              templates={safeData.customBlockTemplates}
              mode={editorMode}
              onModeChange={setEditorMode}
              onChange={updateMaterial}
              onOpenMaterial={updateSelectedNode}
              onOpenTemplateManager={() => setTemplateManagerOpen(true)}
              focusBlockId={focusBlockId}
              onFocusBlockConsumed={() => setFocusBlockId(null)}
            />
          ) : selectedFolder ? (
            <FolderOverview
              folder={selectedFolder}
              nodes={safeData.nodes}
              materials={safeData.materials}
              onSelect={updateSelectedNode}
              onCreateFolder={() => openCreateDialog('folder', selectedFolder.id)}
              onCreateMaterial={() => openCreateDialog('material', selectedFolder.id)}
            />
          ) : rootFolders.length > 0 || safeData.nodes.length > 0 ? (
            <FolderOverview
              folder={null}
              nodes={safeData.nodes}
              materials={safeData.materials}
              onSelect={updateSelectedNode}
              onCreateFolder={() => openCreateDialog('folder', null)}
              onCreateMaterial={() => openCreateDialog('material', null)}
            />
          ) : (
            <div className="glass-panel study-empty-shell">
              <EmptyState title="No study materials yet" message="Create a folder or a material to start building your learning workspace." />
              <div className="study-empty-actions">
                <button className="button ghost icon-text" type="button" onClick={() => openCreateDialog('folder')}>
                  <FolderPlus size={18} aria-hidden />
                  New folder
                </button>
                <AddButton label="New material" onClick={() => openCreateDialog('material', null)} />
              </div>
            </div>
          )}
        </main>
      </div>

      {nodeDialog ? (
        <div className="study-modal-backdrop" role="presentation" onMouseDown={() => setNodeDialog(null)}>
          <form
            className="study-modal-panel glass-panel"
            onSubmit={(event) => {
              event.preventDefault();
              submitNodeDialog();
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>{nodeDialog.type === 'rename' ? 'Rename' : nodeDialog.type === 'folder' ? 'Create folder' : 'Create material'}</h2>
            <label className="form-field">
              <span>Title</span>
              <input value={dialogTitle} autoFocus onChange={(event) => setDialogTitle(event.target.value)} />
            </label>
            <div className="study-modal-actions">
              <button className="button ghost" type="button" onClick={() => setNodeDialog(null)}>
                Cancel
              </button>
              <button className="button primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {templateManagerOpen ? (
        <StudyTemplateManager
          templates={safeData.customBlockTemplates}
          onChange={updateTemplates}
          onClose={() => setTemplateManagerOpen(false)}
        />
      ) : null}

      <StudyCommandPalette
        open={commandPaletteOpen}
        nodes={safeData.nodes}
        materials={safeData.materials}
        templates={safeData.customBlockTemplates}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenNode={updateSelectedNode}
        onOpenBlock={handleOpenBlock}
        onCreateFolder={() => openCreateDialog('folder', selectedFolder?.id ?? null)}
        onCreateMaterial={() => openCreateDialog('material', selectedFolder?.id ?? null)}
      />

      <StudyAppNoticeViewport />
    </section>
  );
}

interface FolderOverviewProps {
  folder: StudyNode | null;
  nodes: StudyNode[];
  materials: StudyMaterial[];
  onSelect: (nodeId: string) => void;
  onCreateFolder: () => void;
  onCreateMaterial: () => void;
}

function FolderOverview({ folder, nodes, materials, onSelect, onCreateFolder, onCreateMaterial }: FolderOverviewProps) {
  const children = getNodeChildren(nodes, folder?.id ?? null);

  return (
    <div className="study-folder-container">
      <section className="study-folder-header glass-panel">
        <div className="study-folder-title-block">
          <span className="study-muted">Folder</span>
          <h2>{folder?.title ?? 'Root Library'}</h2>
        </div>

        <div className="study-inline-actions">
          <button className="button primary icon-text" type="button" onClick={onCreateMaterial}>
            <Plus size={18} />
            New Material
          </button>
          <button className="button ghost icon-text" type="button" onClick={onCreateFolder}>
            <FolderPlus size={18} />
            New Folder
          </button>
        </div>
      </section>

      <section className="study-folder-content glass-panel">
        <div className="study-section-heading">
          <h3>Contents</h3>
          <span className="study-muted">{children.length} items</span>
        </div>

        {children.length === 0 ? (
          <div className="study-folder-empty">
             <p className="study-muted">This folder is empty.</p>
          </div>
        ) : (
          <div className="study-folder-list">
            {children.map((node) => {
              const material = materials.find((item) => item.nodeId === node.id);
              return (
                <button
                    key={node.id}
                    className="study-folder-item"
                    onClick={() => onSelect(node.id)}
                >
                  <div className="study-folder-item-main">
                    {node.type === 'folder' ? <Folder size={18} className="icon-folder" /> : <FileText size={18} className="icon-material" />}
                    <strong>{node.title}</strong>
                  </div>
                  <div className="study-folder-item-meta">
                    {node.type === 'material' ? (
                        <span>{material?.blocks.length ?? 0} blocks</span>
                    ) : (
                        <span>Folder</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
