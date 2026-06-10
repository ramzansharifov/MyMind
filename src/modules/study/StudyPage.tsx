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
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { BoardsData } from '../boards/types';
import {
  StudyBlockEditor,
  createStudyBlockDocument,
  normalizeStudyBlockDocument,
  type StudyBlockDocument,
} from '../../shared/blockEditor';
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
import '../../styles/modules/study.css';

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

  const activeMaterialRef = useRef<StudyMaterial | null>(null);
  const draftContentRef = useRef<StudyBlockDocument>(draftContent);
  const draftPlainTextRef = useRef(draftPlainText);
  const hasUnsavedChangesRef = useRef(false);
  const selectedMaterialIdRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const draftVersionRef = useRef(0);

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
        const normalizedMaterial = {
          ...safeMaterial,
          editorContent: blockContent,
          plainText,
        };

        if (!material) {
          await studyStorageClient.saveMaterial(normalizedMaterial);

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
    onChange(normalizeStudyData(next));
  }

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

  async function renameNode(targetNode: StudyNode | null) {
    if (!targetNode) return;

    const title = window.prompt('Название', targetNode.title)?.trim();

    if (!title) return;
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
  }

  async function deleteNode(targetNode: StudyNode | null) {
    if (!targetNode || !window.confirm(`Удалить "${targetNode.title}"?`)) return;

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
    setDraftContent(document);
    setDraftPlainText(plainText);
    hasUnsavedChangesRef.current = true;
    setHasUnsavedChanges(true);
  }

  const visibleNodes = getVisibleStudyNodes(safeData.nodes, search);
  const rootNodes = visibleNodes.filter((node) => !node.parentId).sort((a, b) => a.order - b.order);

  return (
    <section className="study-page">
      <aside className="study-sidebar">
        <div className="study-sidebar-head">
          <div>
            <span className="study-sidebar-eyebrow">Библиотека</span>
            <strong>Обучение</strong>
          </div>

          <div className="study-sidebar-actions">
            <button className="icon-button" type="button" onClick={() => void createNode('folder')} aria-label="Создать папку" title="Создать папку">
              <FolderPlus size={18} />
            </button>

            <button className="icon-button primary" type="button" onClick={() => void createNode('material')} aria-label="Создать материал" title="Создать материал">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="study-sidebar-stats" aria-label="Статистика обучения">
          <span className="study-stat-pill">
            <Folder size={14} />
            {folderCount}
          </span>
          <span className="study-stat-pill">
            <FileText size={14} />
            {materialCount}
          </span>
        </div>

        <label className="study-search">
          <Search size={16} />
          <input value={search} placeholder="Поиск по материалам" onChange={(event) => setSearch(event.target.value)} />
        </label>

        <div className="study-tree-meta">
          <span>{isSearchActive ? `Найдено: ${visibleNodes.length}` : 'Структура'}</span>
          {isSearchActive ? (
            <button type="button" onClick={() => setSearch('')}>
              Сбросить
            </button>
          ) : null}
        </div>

        <div className="study-tree">
          {rootNodes.length === 0 ? (
            <div className="study-empty-tree">{isSearchActive ? 'Ничего не найдено.' : 'Создай папку или материал.'}</div>
          ) : (
            rootNodes.map((node) => (
              <StudyTreeNode
                key={node.id}
                node={node}
                nodes={visibleNodes}
                selectedNodeId={selectedNode?.id ?? null}
                onSelect={selectNode}
                onToggle={toggleFolder}
                onContextMenu={openTreeMenu}
                forceExpanded={isSearchActive}
              />
            ))
          )}
        </div>

        {treeMenuNode ? (
          <div className="study-tree-menu" style={{ left: treeMenu?.x ?? 0, top: treeMenu?.y ?? 0 }} role="menu" onClick={(event) => event.stopPropagation()}>
            {treeMenuNode.type === 'folder' ? (
              <>
                <button type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => createNode('material', treeMenuNode.id))}>
                  <FilePlus2 size={15} />
                  Материал
                </button>
                <button type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => createNode('folder', treeMenuNode.id))}>
                  <FolderPlus size={15} />
                  Папка
                </button>
              </>
            ) : null}
            <button type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => renameNode(treeMenuNode))}>
              <Pencil size={15} />
              Переименовать
            </button>
            <button className="danger" type="button" role="menuitem" onClick={() => void handleTreeMenuAction(() => deleteNode(treeMenuNode))}>
              <Trash2 size={15} />
              Удалить
            </button>
          </div>
        ) : null}
      </aside>

      <main className="study-workspace">
        <div className="study-material-header">
          <div className="study-material-heading">
            <nav className="study-breadcrumbs" aria-label="Путь">
              <span>Обучение</span>
              {selectedPath.map((node) => (
                <button key={node.id} type="button" onClick={() => void selectNode(node)}>
                  {node.title}
                </button>
              ))}
            </nav>

            <span className="eyebrow">{selectedNode?.type === 'folder' ? 'Папка' : 'Материал'}</span>
            <h1>{selectedNode?.title ?? 'Обучение'}</h1>

            <div className={`study-save-status ${saveStatusTone}`}>
              <span aria-hidden="true" />
              {saveStatusLabel}
            </div>
          </div>

          <div className="study-header-actions">
            <div className="study-mode-toggle">
              <button className={mode === 'edit' ? 'active' : ''} type="button" onClick={() => setMode('edit')}>
                <Edit3 size={16} />
                Правка
              </button>

              <button className={mode === 'read' ? 'active' : ''} type="button" onClick={() => setMode('read')}>
                <BookOpen size={16} />
                Чтение
              </button>
            </div>

            <button className="button ghost" type="button" onClick={() => void renameNode(selectedNode)} disabled={!selectedNode}>
              <Pencil size={16} />
              Переименовать
            </button>

            <button className="icon-button danger" type="button" onClick={() => void deleteNode(selectedNode)} disabled={!selectedNode} aria-label="Удалить" title="Удалить">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {errorMessage ? <div className="study-error">{errorMessage}</div> : null}

        {selectedNode?.type === 'material' && activeMaterial ? (
          <div className="study-editor-layout">
            <section className="study-editor-panel">
              {isLoading ? (
                <div className="study-loading-state">Загрузка материала...</div>
              ) : mode === 'edit' ? (
                <>
                  <StudyBlockEditor value={draftContent} mode="edit" onChange={handleEditorChange} />

                  <div className="study-editor-footer">
                    <span>{draftPlainText.trim().length} символов</span>

                    <button className="button primary" type="button" onClick={() => void saveMaterial()} disabled={isSaving}>
                      <Save size={18} />
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </>
              ) : (
                <article className="study-read-panel">
                  <StudyBlockEditor value={draftContent} mode="read" onChange={handleEditorChange} />
                </article>
              )}
            </section>

          </div>
        ) : selectedNode?.type === 'folder' ? (
          <div className="study-folder-state study-folder-overview">
            <div className="study-folder-overview-head">
              <FolderOpen size={34} />
              <div>
                <strong>{selectedNode.title}</strong>
                <span>{selectedFolderChildren.length ? `${selectedFolderChildren.length} элементов внутри` : 'Папка пока пустая'}</span>
              </div>
              <div className="study-folder-actions">
                <button className="button ghost" type="button" onClick={() => void createNode('folder', selectedNode.id)}>
                  <FolderPlus size={17} />
                  Папка
                </button>
                <button className="button primary" type="button" onClick={() => void createNode('material', selectedNode.id)}>
                  <FilePlus2 size={17} />
                  Материал
                </button>
              </div>
            </div>

            {selectedFolderChildren.length ? (
              <div className="study-folder-grid">
                {selectedFolderChildren.map((child) => (
                  <button className="study-folder-card" type="button" key={child.id} onClick={() => void selectNode(child)}>
                    {child.type === 'folder' ? <Folder size={19} /> : <FileText size={19} />}
                    <span>{child.title}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="study-folder-empty">
                <span>Добавь материал или вложенную папку, чтобы собрать структуру обучения.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="study-folder-state">
            <FileText size={32} />
            <strong>Нет выбранного материала</strong>
            <span>Создай папку или материал в левом сайдбаре.</span>
          </div>
        )}
      </main>
    </section>
  );
}

function StudyTreeNode({
  node,
  nodes,
  selectedNodeId,
  onSelect,
  onToggle,
  onContextMenu,
  forceExpanded,
}: {
  node: StudyNode;
  nodes: StudyNode[];
  selectedNodeId: string | null;
  onSelect: (node: StudyNode) => void | Promise<void>;
  onToggle: (nodeId: string) => void;
  onContextMenu: (event: ReactMouseEvent, node: StudyNode) => void;
  forceExpanded: boolean;
}) {
  const children = nodes.filter((item) => item.parentId === node.id).sort((a, b) => a.order - b.order);
  const isFolder = node.type === 'folder';
  const isExpanded = forceExpanded || node.isExpanded !== false;
  const isActive = selectedNodeId === node.id;

  return (
    <div className="study-tree-node">
      <div className={`study-tree-item ${isActive ? 'active' : ''}`} onContextMenu={(event) => onContextMenu(event, node)}>
        {isFolder ? (
          <button
            className="study-tree-toggle"
            type="button"
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
          <span className="study-tree-spacer" />
        )}

        <button className="study-tree-main" type="button" onClick={() => void onSelect(node)}>
          {isFolder ? <Folder size={17} /> : <FileText size={17} />}
          <span>{node.title}</span>
        </button>
      </div>

      {children.length > 0 && isExpanded ? (
        <div className="study-tree-children">
          {children.map((child) => (
            <StudyTreeNode
              key={child.id}
              node={child}
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
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
