import { useEffect, useMemo, useState } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import type { PartialBlock } from '@blocknote/core';
import { BookOpen, ChevronDown, ChevronRight, Edit3, ExternalLink, FileText, Folder, FolderPlus, Plus, Save, Trash2 } from 'lucide-react';
import { Tldraw, loadSnapshot, type Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { createBoard, upsertBoard } from '../boards/boardsUtils';
import type { BoardItem, BoardsData } from '../boards/types';
import type { StudyData, StudyMaterial, StudyNode } from './types';
import { collectDescendantIds, createStudyMaterial, createStudyNode, editorContentToPlainText, normalizeStudyData, nowIso } from './studyUtils';
import { studyStorageClient } from './storage/studyStorageClient';

interface StudyPageProps {
  data: StudyData;
  boards: BoardsData;
  onChange: (data: StudyData) => void;
  onBoardsChange: (data: BoardsData) => void;
  onOpenBoards: (boardId: string) => void;
}

type StudyMode = 'edit' | 'read';

export function StudyPage({ data, boards, onChange, onBoardsChange, onOpenBoards }: StudyPageProps) {
  const safeData = useMemo(() => normalizeStudyData(data), [data]);
  const [mode, setMode] = useState<StudyMode>('edit');
  const [search, setSearch] = useState('');
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterial | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const selectedNode = safeData.nodes.find((node) => node.id === safeData.selectedNodeId) ?? null;
  const activeBoardMap = useMemo(() => new Map(boards.boards.map((board) => [board.id, board])), [boards.boards]);

  const editor = useCreateBlockNote({
    initialContent: (activeMaterial?.editorContent as PartialBlock[] | undefined) ?? undefined,
  }, [activeMaterial?.id]);

  useEffect(() => {
    if (selectedNode?.type !== 'material' || !selectedNode.materialId) {
      setActiveMaterial(null);
      return;
    }
    let isAlive = true;
    studyStorageClient.getMaterial(selectedNode.materialId)
      .then((material) => {
        if (!isAlive) return;
        setActiveMaterial(material ?? createStudyMaterial(selectedNode.materialId!, selectedNode.title));
      })
      .catch(() => {
        if (isAlive) setActiveMaterial(createStudyMaterial(selectedNode.materialId!, selectedNode.title));
      });
    return () => {
      isAlive = false;
    };
  }, [selectedNode?.id, selectedNode?.materialId, selectedNode?.title, selectedNode?.type]);

  function updateStudy(next: StudyData) {
    onChange(normalizeStudyData(next));
  }

  async function saveMaterial(nextMaterial = activeMaterial) {
    if (!nextMaterial || !selectedNode || selectedNode.type !== 'material') return;
    const content = editor.document;
    const saved = await studyStorageClient.saveMaterial({
      ...nextMaterial,
      title: selectedNode.title,
      editorContent: content,
      plainText: editorContentToPlainText(content),
      updatedAt: nowIso(),
    });
    setActiveMaterial(saved);
  }

  function createNode(type: 'folder' | 'material') {
    const parentId = selectedNode?.type === 'folder' ? selectedNode.id : selectedNode?.parentId ?? null;
    const node = createStudyNode(type, parentId);
    updateStudy({ selectedNodeId: node.id, nodes: [...safeData.nodes, node] });
    if (type === 'material' && node.materialId) {
      void studyStorageClient.saveMaterial(createStudyMaterial(node.materialId, node.title));
    }
  }

  function renameNode(node: StudyNode) {
    const title = window.prompt('Название', node.title)?.trim();
    if (!title) return;
    updateStudy({
      ...safeData,
      nodes: safeData.nodes.map((item) => (item.id === node.id ? { ...item, title, updatedAt: nowIso() } : item)),
    });
    if (node.type === 'material' && activeMaterial?.id === node.materialId) {
      void saveMaterial({ ...activeMaterial, title });
    }
  }

  function deleteNode(node: StudyNode) {
    if (!window.confirm(`Удалить "${node.title}"?`)) return;
    const ids = collectDescendantIds(safeData.nodes, node.id);
    const materialIds = safeData.nodes.filter((item) => ids.has(item.id) && item.materialId).map((item) => item.materialId!);
    materialIds.forEach((id) => void studyStorageClient.deleteMaterial(id));
    const nodes = safeData.nodes.filter((item) => !ids.has(item.id));
    updateStudy({ selectedNodeId: nodes[0]?.id ?? null, nodes });
  }

  function toggleNode(node: StudyNode) {
    updateStudy({
      ...safeData,
      nodes: safeData.nodes.map((item) => (item.id === node.id ? { ...item, isExpanded: !item.isExpanded } : item)),
    });
  }

  function moveNode(nodeId: string, parentId: string | null) {
    if (nodeId === parentId) return;
    const descendants = collectDescendantIds(safeData.nodes, nodeId);
    if (parentId && descendants.has(parentId)) return;
    updateStudy({
      ...safeData,
      nodes: safeData.nodes.map((node) => (node.id === nodeId ? { ...node, parentId, updatedAt: nowIso() } : node)),
    });
  }

  async function addBoard() {
    if (!activeMaterial) return;
    await saveMaterial();
    const title = `${activeMaterial.title || 'Материал'} - доска ${activeMaterial.boardLinks.length + 1}`;
    const board = createBoard(title);
    const nextBoards = upsertBoard(boards, board);
    onBoardsChange(nextBoards);
    const nextMaterial = {
      ...activeMaterial,
      boardLinks: [{ id: `${board.id}-link`, boardId: board.id, title: board.title, createdAt: nowIso() }, ...activeMaterial.boardLinks],
    };
    setActiveMaterial(await studyStorageClient.saveMaterial(nextMaterial));
    onOpenBoards(board.id);
  }

  const visibleNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? safeData.nodes.filter((node) => node.title.toLowerCase().includes(query)) : safeData.nodes;
  }, [safeData.nodes, search]);

  return (
    <section className="study-page page">
      <div className="study-workspace">
        <aside className="study-tree-panel">
          <div className="study-tree-head">
            <div>
              <strong>Обучение</strong>
              <span>{safeData.nodes.length}</span>
            </div>
            <div className="study-header-actions">
              <button className="icon-button" type="button" title="Новая папка" onClick={() => createNode('folder')}><FolderPlus size={17} /></button>
              <button className="icon-button" type="button" title="Новый материал" onClick={() => createNode('material')}><Plus size={17} /></button>
            </div>
          </div>
          <label className="study-tree-search">
            <BookOpen size={16} />
            <input value={search} placeholder="Поиск" onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div
            className="study-tree-root"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragNodeId) moveNode(dragNodeId, null);
              setDragNodeId(null);
            }}
          >
            {renderTree(null, visibleNodes, safeData.selectedNodeId, {
              onSelect: (id) => updateStudy({ ...safeData, selectedNodeId: id }),
              onToggle: toggleNode,
              onRename: renameNode,
              onDelete: deleteNode,
              onDragStart: setDragNodeId,
              onDrop: moveNode,
            })}
          </div>
        </aside>

        <main className="study-main">
          {!selectedNode ? (
            <div className="study-empty-shell">
              <h2>Создай первую папку или материал</h2>
              <div className="study-empty-actions">
                <button className="button primary" type="button" onClick={() => createNode('material')}>Новый материал</button>
                <button className="button ghost" type="button" onClick={() => createNode('folder')}>Новая папка</button>
              </div>
            </div>
          ) : selectedNode.type === 'folder' ? (
            <FolderView node={selectedNode} nodes={safeData.nodes} onSelect={(id) => updateStudy({ ...safeData, selectedNodeId: id })} />
          ) : (
            <div className="study-material-shell">
              <div className="study-material-top">
                <div className="study-material-title-block">
                  <span className="eyebrow">Материал</span>
                  <input
                    className="study-material-title-input"
                    value={selectedNode.title}
                    onChange={(event) => updateStudy({
                      ...safeData,
                      nodes: safeData.nodes.map((node) => (node.id === selectedNode.id ? { ...node, title: event.target.value, updatedAt: nowIso() } : node)),
                    })}
                  />
                </div>
                <div className="study-inline-actions">
                  <div className="study-mode-tabs">
                    <button className={mode === 'edit' ? 'active' : ''} type="button" onClick={() => setMode('edit')}><Edit3 size={15} />Edit</button>
                    <button className={mode === 'read' ? 'active' : ''} type="button" onClick={() => { void saveMaterial(); setMode('read'); }}><BookOpen size={15} />Read</button>
                  </div>
                  <button className="button ghost icon-text" type="button" onClick={() => void saveMaterial()}><Save size={16} />Сохранить</button>
                </div>
              </div>

              {mode === 'edit' ? (
                <div className="study-editor-grid">
                  <div className="study-editor-column">
                    <div className="study-block-toolbar">
                      <button className="button ghost icon-text" type="button" onClick={() => void addBoard()} disabled={!activeMaterial}>
                        <ExternalLink size={16} />Добавить доску
                      </button>
                    </div>
                    <div className="study-blocknote-shell">
                      <BlockNoteView editor={editor} onChange={() => void saveMaterial()} />
                    </div>
                  </div>
                  <aside className="study-side-panel">
                    <h3>Связанные доски</h3>
                    <BoardLinks material={activeMaterial} boards={activeBoardMap} onOpenBoards={onOpenBoards} />
                  </aside>
                </div>
              ) : (
                <ReadMaterial material={activeMaterial} boards={activeBoardMap} onOpenBoards={onOpenBoards} />
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

function renderTree(
  parentId: string | null,
  nodes: StudyNode[],
  selectedNodeId: string | null,
  actions: {
    onSelect: (id: string) => void;
    onToggle: (node: StudyNode) => void;
    onRename: (node: StudyNode) => void;
    onDelete: (node: StudyNode) => void;
    onDragStart: (id: string) => void;
    onDrop: (nodeId: string, parentId: string | null) => void;
  },
) {
  return nodes.filter((node) => node.parentId === parentId).map((node) => {
    const children = nodes.filter((item) => item.parentId === node.id);
    const isFolder = node.type === 'folder';
    return (
      <div className="study-tree-item" key={node.id}>
        <div
          className={`study-tree-row ${selectedNodeId === node.id ? 'active' : ''}`}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData('text/plain', node.id);
            actions.onDragStart(node.id);
          }}
          onDragOver={(event) => {
            if (isFolder) event.preventDefault();
          }}
          onDrop={(event) => {
            event.stopPropagation();
            actions.onDrop((event.dataTransfer.getData('text/plain') || node.id), isFolder ? node.id : node.parentId);
          }}
        >
          <button className="study-tree-main-button" type="button" onClick={() => actions.onSelect(node.id)}>
            <span className="study-tree-caret" onClick={(event) => { event.stopPropagation(); if (isFolder) actions.onToggle(node); }}>
              {isFolder ? (node.isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : null}
            </span>
            {isFolder ? <Folder size={17} /> : <FileText size={17} />}
            <span><strong>{node.title}</strong><small>{isFolder ? `${children.length} элементов` : 'Материал'}</small></span>
          </button>
          <div className="study-tree-actions">
            <button className="study-tree-action-btn" type="button" title="Переименовать" onClick={() => actions.onRename(node)}><Edit3 size={14} /></button>
            <button className="study-tree-action-btn danger" type="button" title="Удалить" onClick={() => actions.onDelete(node)}><Trash2 size={14} /></button>
          </div>
        </div>
        {isFolder && node.isExpanded ? <div className="study-tree-children">{renderTree(node.id, nodes, selectedNodeId, actions)}</div> : null}
      </div>
    );
  });
}

function FolderView({ node, nodes, onSelect }: { node: StudyNode; nodes: StudyNode[]; onSelect: (id: string) => void }) {
  const children = nodes.filter((item) => item.parentId === node.id);
  return (
    <div className="study-folder-view">
      <div className="study-folder-hero">
        <div><span className="eyebrow">Папка</span><h2>{node.title}</h2></div>
        <span className="study-muted">{children.length} элементов</span>
      </div>
      <div className="study-folder-grid">
        {children.map((child) => (
          <button className="study-folder-card" type="button" key={child.id} onClick={() => onSelect(child.id)}>
            {child.type === 'folder' ? <Folder size={20} /> : <FileText size={20} />}
            <strong>{child.title}</strong>
            <small>{child.type === 'folder' ? 'Папка' : 'Материал'}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function BoardLinks({ material, boards, onOpenBoards }: { material: StudyMaterial | null; boards: Map<string, BoardItem>; onOpenBoards: (boardId: string) => void }) {
  if (!material?.boardLinks.length) return <p className="study-muted">Досок пока нет.</p>;
  return (
    <div className="study-block-list">
      {material.boardLinks.map((link) => {
        const board = boards.get(link.boardId);
        return (
          <button className="study-folder-card" type="button" key={link.id} onClick={() => board ? onOpenBoards(board.id) : undefined}>
            <strong>{board?.title ?? link.title}</strong>
            <small>{board ? 'Открыть в модуле досок' : 'Доска не найдена'}</small>
          </button>
        );
      })}
    </div>
  );
}

function ReadMaterial({ material, boards, onOpenBoards }: { material: StudyMaterial | null; boards: Map<string, BoardItem>; onOpenBoards: (boardId: string) => void }) {
  if (!material) return <div className="study-read-page">Загрузка...</div>;
  return (
    <div className="study-read-shell">
      <article className="study-read-page">
        <div className="study-read-page-header"><h1>{material.title}</h1></div>
        <ReadOnlyDocument content={material.editorContent} />
        {material.boardLinks.length ? (
          <div className="study-links-view">
            <h2>Доски</h2>
            {material.boardLinks.map((link) => {
              const board = boards.get(link.boardId);
              return <BoardPreview key={link.id} board={board} title={link.title} onOpenBoards={onOpenBoards} />;
            })}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function ReadOnlyDocument({ content }: { content: unknown }) {
  const editor = useCreateBlockNote({ initialContent: content as PartialBlock[] });
  return <BlockNoteView editor={editor} editable={false} />;
}

function BoardPreview({ board, title, onOpenBoards }: { board: BoardItem | undefined; title: string; onOpenBoards: (boardId: string) => void }) {
  if (!board) {
    return <div className="study-board"><strong>{title}</strong><p className="study-muted">Доска не найдена. Можно создать новую связь в режиме редактирования.</p></div>;
  }
  return (
    <div className="study-board">
      <div className="study-board-toolbar">
        <strong>{board.title}</strong>
        <button className="button ghost icon-text" type="button" onClick={() => onOpenBoards(board.id)}><ExternalLink size={16} />Открыть</button>
      </div>
      <div className="study-board-preview">
        {board.snapshot ? (
          <Tldraw
            hideUi
            onMount={(editor: Editor) => {
              try {
                loadSnapshot(editor.store, board.snapshot as any);
              } catch {
                // Old or malformed snapshots should not break reading.
              }
            }}
          />
        ) : <p className="study-muted">Доска пока пустая.</p>}
      </div>
    </div>
  );
}
