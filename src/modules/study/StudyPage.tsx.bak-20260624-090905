import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Edit3,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { BoardsData } from '../boards/types';
import {
  StudyBlockEditor,
  createStudyBlockDocument,
  normalizeStudyBlockDocument,
  type StudyBlockDocument,
} from '../../shared/blockEditor';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { cn } from '../../shared/utils/classNames';
import { studyStorageClient } from './storage/studyStorageClient';
import {
  collectDescendantIds,
  createStudyMaterial,
  createStudyNode,
  getVisibleStudyNodes,
  normalizeStudyData,
  nowIso,
} from './studyUtils';
import type { StudyData, StudyMaterial, StudyNode } from './types';

interface StudyPageProps {
  data: StudyData;
  boards: BoardsData;
  onChange: (data: StudyData) => void;
  onBoardsChange: (data: BoardsData) => void;
  onOpenBoards: (boardId: string) => void;
}

type StudyMode = 'edit' | 'read';
type SaveMaterialOptions = { source?: 'manual' | 'auto' | 'flush' };
type StudyTreeMenuState = { nodeId: string; x: number; y: number };
type StudyTreeDropTarget = { parentId: string | null };
type StudyTreeRenameState = { nodeId: string; title: string };
type StudyTreePointerDragState = { nodeId: string; startX: number; startY: number; isDragging: boolean };

export function StudyPage({ data, onChange }: StudyPageProps) {
  const safeData = useMemo(() => normalizeStudyData(data), [data]);

  const [mode, setMode] = useState<StudyMode>('edit');
  const [search, setSearch] = useState('');
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterial | null>(null);
  const [draftContent, setDraftContent] = useState<StudyBlockDocument>(() => createStudyBlockDocument(''));
  const [draftPlainText, setDraftPlainText] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [treeMenu, setTreeMenu] = useState<StudyTreeMenuState | null>(null);
  const [nodePendingDelete, setNodePendingDelete] = useState<StudyNode | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [treeDropTarget, setTreeDropTarget] = useState<StudyTreeDropTarget | null>(null);
  const [renamingNode, setRenamingNode] = useState<StudyTreeRenameState | null>(null);

  const activeMaterialRef = useRef<StudyMaterial | null>(null);
  const draftContentRef = useRef<StudyBlockDocument>(draftContent);
  const draftPlainTextRef = useRef(draftPlainText);
  const hasUnsavedChangesRef = useRef(false);
  const selectedMaterialIdRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const draftVersionRef = useRef(0);
  const pointerDragRef = useRef<StudyTreePointerDragState | null>(null);
  const suppressTreeClickRef = useRef(false);
  const previousUserSelectRef = useRef<string | null>(null);
  const hasReconciledMaterialIndexRef = useRef(false);

  const selectedNode = safeData.nodes.find((node) => node.id === safeData.selectedNodeId) ?? safeData.nodes[0] ?? null;
  const selectedMaterialId = selectedNode?.type === 'material' ? selectedNode.materialId : null;
  const selectedPath = useMemo(() => getStudyNodePath(safeData.nodes, selectedNode), [safeData.nodes, selectedNode]);
  const selectedFolderChildren = useMemo(
    () =>
      selectedNode?.type === 'folder'
        ? safeData.nodes.filter((node) => node.parentId === selectedNode.id).sort((a, b) => a.order - b.order)
        : [],
    [safeData.nodes, selectedNode],
  );
  const folderCount = safeData.nodes.filter((node) => node.type === 'folder').length;
  const materialCount = safeData.nodes.filter((node) => node.type === 'material').length;
  const isSearchActive = search.trim().length > 0;
  const treeMenuNode = treeMenu ? safeData.nodes.find((node) => node.id === treeMenu.nodeId) ?? null : null;
  const saveStatusLabel = isSaving ? 'Сохранение...' : hasUnsavedChanges ? 'Есть изменения' : activeMaterial ? 'Сохранено' : 'Готово';
  const saveStatusTone = isSaving ? 'saving' : hasUnsavedChanges ? 'dirty' : 'saved';

  useEffect(() => {
    activeMaterialRef.current = activeMaterial;
  }, [activeMaterial]);

  useEffect(() => {
    draftContentRef.current = draftContent;
  }, [draftContent]);

  useEffect(() => {
    draftPlainTextRef.current = draftPlainText;
  }, [draftPlainText]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    selectedMaterialIdRef.current = selectedMaterialId;
  }, [selectedMaterialId]);

  useEffect(() => {
    if (!treeMenu) return;

    function closeTreeMenu() {
      setTreeMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeTreeMenu();
    }

    window.addEventListener('click', closeTreeMenu);
    window.addEventListener('resize', closeTreeMenu);
    window.addEventListener('scroll', closeTreeMenu, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', closeTreeMenu);
      window.removeEventListener('resize', closeTreeMenu);
      window.removeEventListener('scroll', closeTreeMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [treeMenu]);

  function clearAutoSaveTimer() {
    if (autoSaveTimerRef.current === null) return;
    window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
  }

  useEffect(() => {
    return () => clearAutoSaveTimer();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMaterial() {
      setErrorMessage(null);
      clearAutoSaveTimer();

      if (!selectedMaterialId) {
        activeMaterialRef.current = null;
        setActiveMaterial(null);
        const emptyDocument = createStudyBlockDocument('');
        draftContentRef.current = emptyDocument;
        draftPlainTextRef.current = '';
        setDraftContent(emptyDocument);
        setDraftPlainText('');
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
        return;
      }

      setIsLoading(true);

      try {
        const material = await studyStorageClient.getMaterial(selectedMaterialId);

        if (cancelled) return;

        const safeMaterial = material ?? createStudyMaterial(selectedMaterialId, selectedNode?.title ?? 'Новый материал');
        const blockContent = normalizeStudyBlockDocument(safeMaterial.editorContent, safeMaterial.plainText);
        const plainText = blockContent.plainText;
        let normalizedMaterial: StudyMaterial = {
          ...safeMaterial,
          editorContent: blockContent,
          plainText,
        };

        if (!material) {
          normalizedMaterial = await studyStorageClient.saveMaterial(normalizedMaterial);

          if (cancelled) return;
        }

        activeMaterialRef.current = normalizedMaterial;
        setActiveMaterial(normalizedMaterial);

        draftContentRef.current = blockContent;
        draftPlainTextRef.current = plainText;
        setDraftContent(blockContent);
        setDraftPlainText(plainText);
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить материал.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadMaterial();

    return () => {
      cancelled = true;
    };
  }, [selectedMaterialId, selectedNode?.title]);

  useEffect(() => {
    if (!hasUnsavedChanges || !activeMaterial || isLoading || isSaving) return;

    clearAutoSaveTimer();
    autoSaveTimerRef.current = window.setTimeout(() => {
      void saveMaterial({ source: 'auto' });
    }, 900);

    return () => clearAutoSaveTimer();
  }, [activeMaterial?.id, draftContent, draftPlainText, hasUnsavedChanges, isLoading, isSaving]);

  function updateStudy(next: StudyData) {
    const normalized = normalizeStudyData(next);
    onChange(normalized);
    void studyStorageClient.saveTree(normalized).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось сохранить структуру обучения.');
    });
  }

  useEffect(() => {
    if (hasReconciledMaterialIndexRef.current) return;
    hasReconciledMaterialIndexRef.current = true;

    let cancelled = false;

    async function reconcileMaterialIndex() {
      try {
        const index = await studyStorageClient.listIndex();

        if (cancelled || index.length === 0) return;

        const existingMaterialIds = new Set(
          safeData.nodes
            .filter((node) => node.type === 'material' && node.materialId)
            .map((node) => node.materialId as string),
        );
        const existingNodeIds = new Set(safeData.nodes.map((node) => node.id));
        const missingMaterials = index.filter((item) => !existingMaterialIds.has(item.id));

        if (missingMaterials.length === 0) return;

        const restoredNodes: StudyNode[] = missingMaterials.map((item, indexOffset) => {
          const nodeId = existingNodeIds.has(item.id) ? `study-node-${item.id}` : item.id;
          existingNodeIds.add(nodeId);

          return {
            id: nodeId,
            type: 'material',
            parentId: null,
            title: item.title || 'Новый материал',
            materialId: item.id,
            isExpanded: true,
            order: Date.parse(item.updatedAt) || Date.now() + indexOffset,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        });

        updateStudy({
          ...safeData,
          selectedNodeId: safeData.selectedNodeId ?? restoredNodes[0]?.id ?? null,
          nodes: [...safeData.nodes, ...restoredNodes],
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Не удалось восстановить материалы обучения.');
        }
      }
    }

    void reconcileMaterialIndex();

    return () => {
      cancelled = true;
    };
  }, [safeData]);

  async function flushPendingMaterialSave() {
    if (!hasUnsavedChangesRef.current || !activeMaterialRef.current) return true;

    const saved = await saveMaterial({ source: 'flush' });
    return Boolean(saved);
  }

  async function createNode(type: 'folder' | 'material', parentIdOverride?: string | null) {
    if (!(await flushPendingMaterialSave())) return;

    const parentId =
      parentIdOverride !== undefined
        ? parentIdOverride
        : selectedNode?.type === 'folder'
          ? selectedNode.id
          : selectedNode?.parentId ?? null;
    const node = createStudyNode(type, parentId);
    const nodes = [
      ...safeData.nodes.map((item) =>
        item.id === parentId
          ? {
              ...item,
              isExpanded: true,
            }
          : item,
      ),
      node,
    ];

    const nextData = normalizeStudyData({
      ...safeData,
      selectedNodeId: node.id,
      nodes,
    });

    updateStudy(nextData);

    if (type === 'material' && node.materialId) {
      try {
        const saved = await studyStorageClient.saveMaterial(createStudyMaterial(node.materialId, node.title));
        const blockContent = normalizeStudyBlockDocument(saved.editorContent, saved.plainText);

        activeMaterialRef.current = {
          ...saved,
          editorContent: blockContent,
          plainText: blockContent.plainText,
        };
        setActiveMaterial(activeMaterialRef.current);
        draftContentRef.current = blockContent;
        draftPlainTextRef.current = blockContent.plainText;
        setDraftContent(blockContent);
        setDraftPlainText(blockContent.plainText);
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Не удалось создать материал.');
      }
    } else {
      activeMaterialRef.current = null;
      setActiveMaterial(null);
      const emptyDocument = createStudyBlockDocument('');
      draftContentRef.current = emptyDocument;
      draftPlainTextRef.current = '';
      setDraftContent(emptyDocument);
      setDraftPlainText('');
      hasUnsavedChangesRef.current = false;
      setHasUnsavedChanges(false);
    }
  }

  async function selectNode(node: StudyNode) {
    if (node.id === selectedNode?.id) return;
    if (!(await flushPendingMaterialSave())) return;

    updateStudy({
      ...safeData,
      selectedNodeId: node.id,
    });
  }

  function handleTreeNodeSelect(node: StudyNode) {
    if (suppressTreeClickRef.current) return;
    void selectNode(node);
  }

  function startRenameNode(targetNode: StudyNode | null) {
    if (!targetNode) return;

    const ancestorIds = getStudyNodePath(safeData.nodes, targetNode)
      .slice(0, -1)
      .map((node) => node.id);

    if (ancestorIds.length > 0) {
      updateStudy({
        ...safeData,
        nodes: safeData.nodes.map((node) =>
          ancestorIds.includes(node.id)
            ? {
                ...node,
                isExpanded: true,
              }
            : node,
        ),
      });
    }

    setTreeMenu(null);
    setSearch('');
    setRenamingNode({ nodeId: targetNode.id, title: targetNode.title });
  }

  function cancelRenameNode() {
    setRenamingNode(null);
  }

  function updateRenameDraft(nodeId: string, title: string) {
    setRenamingNode((current) => (current?.nodeId === nodeId ? { ...current, title } : current));
  }

  async function commitRenameNode() {
    const pendingRename = renamingNode;
    if (!pendingRename) return;

    const targetNode = safeData.nodes.find((node) => node.id === pendingRename.nodeId) ?? null;
    if (!targetNode) {
      setRenamingNode(null);
      return;
    }

    const title = pendingRename.title.trim();

    if (!title || title === targetNode.title) {
      setRenamingNode(null);
      return;
    }

    if (!(await flushPendingMaterialSave())) return;

    const timestamp = nowIso();

    if (targetNode.materialId) {
      try {
        const currentMaterial =
          activeMaterialRef.current?.id === targetNode.materialId
            ? activeMaterialRef.current
            : await studyStorageClient.getMaterial(targetNode.materialId);
        const material = currentMaterial ?? createStudyMaterial(targetNode.materialId, targetNode.title);
        const nextMaterial = {
          ...material,
          title,
          updatedAt: timestamp,
        };
        const saved = await studyStorageClient.saveMaterial(nextMaterial);

        if (selectedMaterialIdRef.current === saved.id) {
          activeMaterialRef.current = saved;
          setActiveMaterial(saved);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Не удалось переименовать материал.');
        return;
      }
    }

    updateStudy({
      ...safeData,
      nodes: safeData.nodes.map((node) => (node.id === targetNode.id ? { ...node, title, updatedAt: timestamp } : node)),
    });
    setRenamingNode(null);
  }

  async function deleteNode(targetNode: StudyNode | null) {
    if (!targetNode) return;

    setErrorMessage(null);
    clearAutoSaveTimer();

    const ids = collectDescendantIds(safeData.nodes, targetNode.id);
    const removedCurrentSelection = safeData.selectedNodeId ? ids.has(safeData.selectedNodeId) : false;

    const materialIds = safeData.nodes
      .filter((node) => ids.has(node.id) && node.materialId)
      .map((node) => node.materialId as string);
    const removedActiveMaterial = selectedMaterialIdRef.current ? materialIds.includes(selectedMaterialIdRef.current) : false;

    try {
      await Promise.all(materialIds.map((materialId) => studyStorageClient.deleteMaterial(materialId)));

      const nodes = safeData.nodes.filter((node) => !ids.has(node.id));
      const nextSelectedNodeId = removedCurrentSelection
        ? nodes.find((node) => node.parentId === targetNode.parentId)?.id ?? targetNode.parentId ?? nodes[0]?.id ?? null
        : safeData.selectedNodeId;

      updateStudy({
        selectedNodeId: nextSelectedNodeId,
        nodes,
      });

      if (removedCurrentSelection || removedActiveMaterial) {
        activeMaterialRef.current = null;
        setActiveMaterial(null);
        const emptyDocument = createStudyBlockDocument('');
        draftContentRef.current = emptyDocument;
        draftPlainTextRef.current = '';
        setDraftContent(emptyDocument);
        setDraftPlainText('');
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить элемент.');
    }
  }

  function requestDeleteNode(targetNode: StudyNode | null) {
    if (!targetNode) return;

    setTreeMenu(null);
    setNodePendingDelete(targetNode);
  }

  function toggleFolder(nodeId: string) {
    updateStudy({
      ...safeData,
      nodes: safeData.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              isExpanded: !node.isExpanded,
            }
          : node,
      ),
    });
  }

  function canMoveNodeToParent(nodeId: string, parentId: string | null) {
    const node = safeData.nodes.find((item) => item.id === nodeId);
    if (!node) return false;
    if (node.parentId === parentId) return false;
    if (parentId === null) return true;
    if (node.id === parentId) return false;

    const parent = safeData.nodes.find((item) => item.id === parentId);
    if (!parent || parent.type !== 'folder') return false;

    if (node.type === 'folder' && collectDescendantIds(safeData.nodes, node.id).has(parentId)) {
      return false;
    }

    return true;
  }

  async function moveNodeToParent(nodeId: string, parentId: string | null) {
    if (!canMoveNodeToParent(nodeId, parentId)) return;
    if (!(await flushPendingMaterialSave())) return;

    const timestamp = nowIso();
    const order = Date.now();

    updateStudy({
      ...safeData,
      nodes: safeData.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            parentId,
            order,
            updatedAt: timestamp,
          };
        }

        if (parentId && node.id === parentId) {
          return {
            ...node,
            isExpanded: true,
            updatedAt: timestamp,
          };
        }

        return node;
      }),
    });
  }

  function getPointerDropParentId(clientX: number, clientY: number, nodeId: string) {
    const target = document.elementFromPoint(clientX, clientY);
    const targetElement = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-study-drop-target]') : null;
    const rawParentId = targetElement?.dataset.studyDropTarget;

    if (!rawParentId) return undefined;

    const parentId = rawParentId === 'root' ? null : rawParentId;
    return canMoveNodeToParent(nodeId, parentId) ? parentId : undefined;
  }

  function setTreeUserSelectDisabled(disabled: boolean) {
    if (disabled) {
      if (previousUserSelectRef.current === null) {
        previousUserSelectRef.current = document.body.style.userSelect;
      }
      document.body.style.userSelect = 'none';
      return;
    }

    if (previousUserSelectRef.current !== null) {
      document.body.style.userSelect = previousUserSelectRef.current;
      previousUserSelectRef.current = null;
    }
  }

  function handleTreeNodePointerDown(event: ReactPointerEvent, node: StudyNode) {
    if (event.button !== 0 || renamingNode?.nodeId === node.id) return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('[data-study-tree-no-drag="true"]')) return;

    setTreeMenu(null);
    pointerDragRef.current = {
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      isDragging: false,
    };
  }

  useEffect(() => {
    function finishPointerDrag(event: PointerEvent, shouldDrop: boolean) {
      const drag = pointerDragRef.current;
      if (!drag) return;

      const wasDragging = drag.isDragging;
      const parentId = wasDragging && shouldDrop ? getPointerDropParentId(event.clientX, event.clientY, drag.nodeId) : undefined;

      pointerDragRef.current = null;
      setDraggedNodeId(null);
      setTreeDropTarget(null);
      setTreeUserSelectDisabled(false);

      if (!wasDragging) {
        suppressTreeClickRef.current = false;
        return;
      }

      suppressTreeClickRef.current = true;
      window.setTimeout(() => {
        suppressTreeClickRef.current = false;
      }, 0);

      if (parentId !== undefined) {
        void moveNodeToParent(drag.nodeId, parentId);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      const drag = pointerDragRef.current;
      if (!drag) return;

      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!drag.isDragging && distance < 6) return;

      if (!drag.isDragging) {
        drag.isDragging = true;
        suppressTreeClickRef.current = true;
        setDraggedNodeId(drag.nodeId);
        setTreeUserSelectDisabled(true);
      }

      event.preventDefault();
      window.getSelection()?.removeAllRanges();

      const parentId = getPointerDropParentId(event.clientX, event.clientY, drag.nodeId);
      setTreeDropTarget(parentId === undefined ? null : { parentId });
    }

    function handlePointerUp(event: PointerEvent) {
      finishPointerDrag(event, true);
    }

    function handlePointerCancel(event: PointerEvent) {
      finishPointerDrag(event, false);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      setTreeUserSelectDisabled(false);
    };
  }, [safeData]);

  function openTreeMenu(event: ReactMouseEvent, node: StudyNode) {
    event.preventDefault();
    event.stopPropagation();
    setTreeMenu({
      nodeId: node.id,
      x: Math.min(event.clientX, window.innerWidth - 220),
      y: Math.min(event.clientY, window.innerHeight - 180),
    });
  }

  async function handleTreeMenuAction(action: () => void | Promise<void>) {
    setTreeMenu(null);
    await action();
  }

  async function saveMaterial(_options: SaveMaterialOptions = { source: 'manual' }) {
    const material = activeMaterialRef.current;
    if (!material) return null;

    clearAutoSaveTimer();
    setIsSaving(true);
    setErrorMessage(null);

    const savedDraftVersion = draftVersionRef.current;
    const blockDocument = createStudyBlockDocument(draftContentRef.current, draftPlainTextRef.current);
    const plainText = blockDocument.plainText || draftPlainTextRef.current.trim();

    try {
      const timestamp = nowIso();
      const nextMaterial: StudyMaterial = {
        ...material,
        editorContent: blockDocument,
        plainText,
        updatedAt: timestamp,
      };

      const saved = await studyStorageClient.saveMaterial(nextMaterial);

      if (selectedMaterialIdRef.current === saved.id) {
        activeMaterialRef.current = saved;
        setActiveMaterial(saved);

        if (draftVersionRef.current === savedDraftVersion) {
          draftContentRef.current = blockDocument;
          draftPlainTextRef.current = plainText;
          setDraftContent(blockDocument);
          setDraftPlainText(plainText);
          hasUnsavedChangesRef.current = false;
          setHasUnsavedChanges(false);
        }
      }

      return saved;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось сохранить материал.');
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditorChange(document: StudyBlockDocument, plainText: string) {
    draftVersionRef.current += 1;
    draftContentRef.current = document;
    draftPlainTextRef.current = plainText;
    hasUnsavedChangesRef.current = true;
    setDraftContent(document);
    setDraftPlainText(plainText);
    setHasUnsavedChanges(true);
  }

  const visibleNodes = getVisibleStudyNodes(safeData.nodes, search);
  const rootNodes = visibleNodes.filter((node) => !node.parentId).sort((a, b) => a.order - b.order);

  return (
    <section className="grid h-full min-h-0 grid-cols-[300px_minmax(0,1fr)] gap-0 overflow-hidden bg-app-bg text-app-text max-[980px]:h-auto max-[980px]:min-h-screen max-[980px]:grid-cols-1 max-[980px]:overflow-visible">
      <aside className="sticky top-0 flex h-full min-h-0 flex-col overflow-hidden border-r border-app-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_94%,var(--accent)_6%),var(--surface))] p-4 max-[980px]:static max-[980px]:h-auto">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-muted">Библиотека</span>
            <strong className="block text-base font-extrabold text-app-text">Обучение</strong>
          </div>

          <div className="flex items-center gap-2">
            <button className={iconButtonClass} type="button" onClick={() => void createNode('folder')} aria-label="Создать папку" title="Создать папку">
              <FolderPlus size={18} />
            </button>

            <button className={primaryIconButtonClass} type="button" onClick={() => void createNode('material')} aria-label="Создать материал" title="Создать материал">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2" aria-label="Статистика обучения">
          <span className={statPillClass}>
            <Folder size={14} />
            {folderCount}
          </span>
          <span className={statPillClass}>
            <FileText size={14} />
            {materialCount}
          </span>
        </div>

        <label className="mb-3 flex min-h-control items-center gap-2 rounded-control border border-app-border bg-app-surface-soft px-3 text-app-muted focus-within:border-[color-mix(in_srgb,var(--accent)_56%,var(--border))]">
          <Search size={16} />
          <input className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none outline-none focus:border-0 focus:shadow-none" value={search} placeholder="Поиск по материалам" onChange={(event) => setSearch(event.target.value)} />
        </label>

        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-app-muted">
          <span>{isSearchActive ? `Найдено: ${visibleNodes.length}` : 'Структура'}</span>
          {isSearchActive ? (
            <button className="text-app-accent-strong hover:text-app-text" type="button" onClick={() => setSearch('')}>
              Сбросить
            </button>
          ) : null}
        </div>

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto rounded-panel pr-1 transition-colors',
              draggedNodeId && treeDropTarget?.parentId === null && 'bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]',
            )}
            data-study-drop-target="root"
          >
          {draggedNodeId ? (
            <div
              className={cn(rootDropClass, treeDropTarget?.parentId === null && rootDropActiveClass)}
              data-study-drop-target="root"
            >
              Перенести в корень
            </div>
          ) : null}

          {rootNodes.length === 0 ? (
            <div className="grid min-h-[120px] place-items-center rounded-panel border border-dashed border-app-border p-4 text-center text-sm text-app-muted">{isSearchActive ? 'Ничего не найдено.' : 'Создай папку или материал.'}</div>
          ) : (
            rootNodes.map((node) => (
              <StudyTreeNode
                key={node.id}
                node={node}
                nodes={visibleNodes}
                selectedNodeId={selectedNode?.id ?? null}
                onSelect={handleTreeNodeSelect}
                onToggle={toggleFolder}
                onContextMenu={openTreeMenu}
                onPointerDown={handleTreeNodePointerDown}
                draggedNodeId={draggedNodeId}
                dropTargetParentId={treeDropTarget?.parentId ?? undefined}
                renamingNodeId={renamingNode?.nodeId ?? null}
                renameDraft={renamingNode?.title ?? ''}
                onRenameDraftChange={updateRenameDraft}
                onRenameCommit={commitRenameNode}
                onRenameCancel={cancelRenameNode}
                forceExpanded={isSearchActive}
              />
            ))
          )}
        </div>

        {treeMenuNode ? (
          <div className="fixed z-50 grid min-w-[190px] gap-1 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-1.5 text-sm text-app-text [backdrop-filter:var(--glass-blur)] shadow-modal" style={{ left: treeMenu?.x ?? 0, top: treeMenu?.y ?? 0 }} role="menu" onClick={(event) => event.stopPropagation()}>
            {treeMenuNode.type === 'folder' ? (
              <>
                <button className={treeMenuButtonClass} type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => createNode('material', treeMenuNode.id))}>
                  <FilePlus2 size={15} />
                  Материал
                </button>
                <button className={treeMenuButtonClass} type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => createNode('folder', treeMenuNode.id))}>
                  <FolderPlus size={15} />
                  Папка
                </button>
              </>
            ) : null}
            <button className={treeMenuButtonClass} type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => startRenameNode(treeMenuNode))}>
              <Pencil size={15} />
              Переименовать
            </button>
            <button className={cn(treeMenuButtonClass, 'text-app-danger hover:border-[color-mix(in_srgb,var(--danger)_42%,var(--border))] hover:bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface-strong))]')} type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => requestDeleteNode(treeMenuNode))}>
              <Trash2 size={15} />
              Удалить
            </button>
          </div>
        ) : null}
      </aside>

      <main className="h-full min-h-0 min-w-0 overflow-y-auto p-6">
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 px-1 text-xs text-app-muted" aria-label="Путь">
          <span>Обучение</span>
          {selectedPath.map((node) => (
            <button className="after:ml-1.5 after:text-app-muted after:content-['/'] last:after:hidden hover:text-app-accent-strong" key={node.id} type="button" onClick={() => void selectNode(node)}>
              {node.title}
            </button>
          ))}
        </nav>

        <div className="mb-4 flex items-start justify-between gap-4 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-5 [backdrop-filter:var(--glass-blur)] shadow-panel max-[900px]:flex-col">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-app-accent-strong">{selectedNode?.type === 'folder' ? 'Папка' : 'Материал'}</span>
              <div className={cn(saveStatusClass, saveStatusTone === 'dirty' && 'text-app-warning', saveStatusTone === 'saving' && 'text-app-accent-strong')}>
                <span className={cn("h-2 w-2 rounded-full bg-app-positive", saveStatusTone === 'dirty' && 'bg-app-warning', saveStatusTone === 'saving' && 'bg-app-accent-strong')} aria-hidden="true" />
                {saveStatusLabel}
              </div>
            </div>

            <h1 className="truncate text-[34px] font-extrabold leading-tight text-app-text">{selectedNode?.title ?? 'Обучение'}</h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex rounded-control border border-app-border bg-app-surface-soft p-1">
              <button className={cn(modeToggleButtonClass, mode === 'edit' && modeToggleActiveClass)} type="button" onClick={() => setMode('edit')}>
                <Edit3 size={16} />
                Правка
              </button>

              <button className={cn(modeToggleButtonClass, mode === 'read' && modeToggleActiveClass)} type="button" onClick={() => setMode('read')}>
                <BookOpen size={16} />
                Чтение
              </button>
            </div>

            <button className={ghostButtonClass} type="button" onClick={() => startRenameNode(selectedNode)} disabled={!selectedNode}>
              <Pencil size={16} />
              Переименовать
            </button>

            <button className={dangerButtonClass} type="button" onClick={() => requestDeleteNode(selectedNode)} disabled={!selectedNode}>
              <Trash2 size={18} />
              Удалить
            </button>
          </div>
        </div>

        {errorMessage ? <div className="mb-4 rounded-panel border border-[color-mix(in_srgb,var(--danger)_42%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] p-3 text-sm text-app-danger">{errorMessage}</div> : null}

        {selectedNode?.type === 'material' && activeMaterial ? (
          <div>
            <section className="min-w-0">
              {isLoading ? (
                <div className="grid min-h-[260px] place-items-center rounded-panel border border-app-border bg-app-surface-soft p-6 text-app-muted">Загрузка материала...</div>
              ) : mode === 'edit' ? (
                <>
                  <StudyBlockEditor
                    value={draftContent}
                    mode="edit"
                    onChange={handleEditorChange}
                    sidebarFooter={
                      <div className="flex items-center justify-between gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-3 text-app-muted [backdrop-filter:var(--glass-blur)] shadow-panel">
                        <span>{draftPlainText.trim().length} символов</span>

                        <button className={primaryButtonClass} type="button" onClick={() => void saveMaterial()} disabled={isSaving}>
                          <Save size={18} />
                          {isSaving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                      </div>
                    }
                  />
                </>
              ) : (
                <article className="rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
                  <StudyBlockEditor
                    value={draftContent}
                    mode="read"
                    onChange={handleEditorChange}
                  />
                </article>
              )}
            </section>

          </div>
        ) : selectedNode?.type === 'folder' ? (
          <div className="rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-5 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
            <div className="mb-4 flex items-center gap-3 max-[720px]:flex-col max-[720px]:items-start">
              <FolderOpen className="text-app-accent-strong" size={34} />
              <div>
                <strong className="block text-xl font-extrabold">{selectedNode.title}</strong>
                <span className="text-sm text-app-muted">{selectedFolderChildren.length ? `${selectedFolderChildren.length} элементов внутри` : 'Папка пока пустая'}</span>
              </div>
              <div className="ml-auto flex flex-wrap gap-2 max-[720px]:ml-0">
                <button className={ghostButtonClass} type="button" onClick={() => void createNode('folder', selectedNode.id)}>
                  <FolderPlus size={17} />
                  Папка
                </button>
                <button className={primaryButtonClass} type="button" onClick={() => void createNode('material', selectedNode.id)}>
                  <FilePlus2 size={17} />
                  Материал
                </button>
              </div>
            </div>

            {selectedFolderChildren.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {selectedFolderChildren.map((child) => (
                  <button className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-panel border border-app-border bg-app-surface-soft p-3 text-left text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong" type="button" key={child.id} onClick={() => void selectNode(child)}>
                    {child.type === 'folder' ? <Folder size={19} /> : <FileText size={19} />}
                    <span className="truncate text-sm font-bold">{child.title}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid min-h-[180px] place-items-center rounded-panel border border-dashed border-app-border p-6 text-center text-app-muted">
                <span>Добавь материал или вложенную папку, чтобы собрать структуру обучения.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid min-h-[320px] place-items-center gap-2 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-6 text-center text-app-muted [backdrop-filter:var(--glass-blur)] shadow-panel">
            <FileText className="text-app-accent-strong" size={32} />
            <strong className="text-app-text">Нет выбранного материала</strong>
            <span>Создай папку или материал в левом сайдбаре.</span>
          </div>
        )}
      </main>

      {nodePendingDelete ? (
        <ConfirmDialog
          title={`Удалить «${nodePendingDelete.title}»?`}
          message={getDeleteNodeConfirmMessage(nodePendingDelete, safeData.nodes)}
          confirmLabel="Удалить"
          confirmVariant="danger"
          action="delete"
          onCancel={() => setNodePendingDelete(null)}
          onConfirm={() => {
            const targetNode = nodePendingDelete;
            setNodePendingDelete(null);
            void deleteNode(targetNode);
          }}
        />
      ) : null}
    </section>
  );
}

function getDeleteNodeConfirmMessage(node: StudyNode, nodes: StudyNode[]) {
  if (node.type === 'material') {
    return 'Материал будет удалён вместе с сохранённым содержимым. Это действие нельзя отменить.';
  }

  const descendantCount = Math.max(collectDescendantIds(nodes, node.id).size - 1, 0);

  if (descendantCount === 0) {
    return 'Папка будет удалена. Это действие нельзя отменить.';
  }

  return `Папка и все вложенные элементы будут удалены. Внутри: ${descendantCount}. Это действие нельзя отменить.`;
}

function StudyTreeNode({
  node,
  nodes,
  selectedNodeId,
  onSelect,
  onToggle,
  onContextMenu,
  onPointerDown,
  draggedNodeId,
  dropTargetParentId,
  renamingNodeId,
  renameDraft,
  onRenameDraftChange,
  onRenameCommit,
  onRenameCancel,
  forceExpanded,
}: {
  node: StudyNode;
  nodes: StudyNode[];
  selectedNodeId: string | null;
  onSelect: (node: StudyNode) => void | Promise<void>;
  onToggle: (nodeId: string) => void;
  onContextMenu: (event: ReactMouseEvent, node: StudyNode) => void;
  onPointerDown: (event: ReactPointerEvent, node: StudyNode) => void;
  draggedNodeId: string | null;
  dropTargetParentId: string | null | undefined;
  renamingNodeId: string | null;
  renameDraft: string;
  onRenameDraftChange: (nodeId: string, title: string) => void;
  onRenameCommit: () => void | Promise<void>;
  onRenameCancel: () => void;
  forceExpanded: boolean;
}) {
  const children = nodes.filter((item) => item.parentId === node.id).sort((a, b) => a.order - b.order);
  const isFolder = node.type === 'folder';
  const isExpanded = forceExpanded || node.isExpanded !== false;
  const isActive = selectedNodeId === node.id;
  const isDragging = draggedNodeId === node.id;
  const isDropTarget = isFolder && dropTargetParentId === node.id;
  const isRenaming = renamingNodeId === node.id;

  return (
    <div className="grid gap-1">
      <div
        className={cn(treeItemClass, !isRenaming && 'cursor-grab active:cursor-grabbing', isActive && treeItemActiveClass, isDragging && 'opacity-45', isDropTarget && 'border-[color-mix(in_srgb,var(--accent)_64%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-strong))]')}
        data-study-drop-target={isFolder ? node.id : undefined}
        onContextMenu={(event) => onContextMenu(event, node)}
        onPointerDown={(event) => onPointerDown(event, node)}
      >
        {isFolder ? (
          <button
            className="grid h-7 w-7 shrink-0 place-items-center rounded-control text-app-muted transition-colors hover:bg-app-surface-strong hover:text-app-accent-strong disabled:opacity-30"
            type="button"
            data-study-tree-no-drag="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
            disabled={children.length === 0}
            aria-label={isExpanded ? 'Свернуть папку' : 'Раскрыть папку'}
          >
            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        ) : (
          <span className="h-7 w-7 shrink-0" />
        )}

        {isRenaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-control px-1 py-1 text-left text-app-text">
            {isFolder ? <Folder size={17} /> : <FileText size={17} />}
            <StudyTreeRenameInput
              value={renameDraft}
              onChange={(title) => onRenameDraftChange(node.id, title)}
              onCommit={onRenameCommit}
              onCancel={onRenameCancel}
            />
          </div>
        ) : (
          <button className="flex min-w-0 flex-1 items-center gap-2 rounded-control px-1 py-1 text-left text-app-text" type="button" onClick={() => void onSelect(node)}>
            {isFolder ? <Folder size={17} /> : <FileText size={17} />}
            <span className="truncate text-sm font-bold">{node.title}</span>
          </button>
        )}
      </div>

      {children.length > 0 && isExpanded ? (
        <div className="ml-4 grid gap-1 border-l border-app-border pl-2">
          {children.map((child) => (
            <StudyTreeNode
              key={child.id}
              node={child}
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              onPointerDown={onPointerDown}
              draggedNodeId={draggedNodeId}
              dropTargetParentId={dropTargetParentId}
              renamingNodeId={renamingNodeId}
              renameDraft={renameDraft}
              onRenameDraftChange={onRenameDraftChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StudyTreeRenameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className="min-h-8 min-w-0 flex-1 rounded-control border border-[color-mix(in_srgb,var(--accent)_54%,var(--border))] bg-app-surface-strong px-2 text-sm font-bold text-app-text outline-none transition-colors focus:border-[color-mix(in_srgb,var(--accent)_76%,var(--border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDragStart={(event) => event.stopPropagation()}
      onBlur={() => {
        if (cancelledRef.current) return;
        void onCommit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          cancelledRef.current = false;
          void onCommit();
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          cancelledRef.current = true;
          onCancel();
        }
      }}
    />
  );
}

function getStudyNodePath(nodes: StudyNode[], selectedNode: StudyNode | null) {
  if (!selectedNode) return [];

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path: StudyNode[] = [];
  const visited = new Set<string>();
  let current: StudyNode | undefined = selectedNode;

  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path;
}

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-control border border-app-border bg-app-surface-strong text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-accent-strong disabled:cursor-not-allowed disabled:opacity-45';
const primaryIconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--accent)_58%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_22%,var(--surface-strong))]';
const dangerButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--danger)_46%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-app-danger transition-colors hover:border-app-danger hover:bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface-strong))] disabled:cursor-not-allowed disabled:opacity-45';
const statPillClass =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-app-border bg-app-surface-soft px-3 text-sm font-bold text-app-muted';
const rootDropClass =
  'mb-2 rounded-panel border border-dashed border-app-border bg-app-surface-soft p-3 text-center text-sm font-bold text-app-muted transition-colors';
const rootDropActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_62%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-strong))] text-app-accent-strong';
const treeMenuButtonClass =
  'flex w-full items-center gap-2 rounded-control border border-transparent px-3 py-2 text-left transition-colors hover:border-app-border hover:bg-app-surface-strong';
const saveStatusClass =
  'inline-flex w-fit items-center gap-2 rounded-full border border-app-border bg-app-surface-soft px-3 py-1.5 text-xs font-bold text-app-muted';
const modeToggleButtonClass =
  'inline-flex min-h-9 items-center gap-2 rounded-control px-3 py-2 text-sm font-bold text-app-muted transition-colors hover:text-app-text';
const modeToggleActiveClass =
  'bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-strong))] text-app-accent-strong shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_38%,transparent)]';
const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_72%,var(--border))] hover:bg-[var(--control-bg-hover)] disabled:cursor-not-allowed disabled:opacity-45';
const primaryButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3.5 py-2.5 text-sm font-bold text-app-accent-strong transition-colors hover:bg-[var(--button-bg-primary-hover)] disabled:cursor-not-allowed disabled:opacity-55';
const treeItemClass =
  'flex min-w-0 items-center gap-1 rounded-panel border border-transparent px-1.5 py-1.5 transition-colors hover:border-app-border hover:bg-app-surface-soft';
const treeItemActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_46%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';
