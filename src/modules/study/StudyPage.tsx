import { BookOpen, Edit3, FileText, Folder, FolderPlus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { BoardsData } from '../boards/types';
import type { StudyData, StudyMaterial, StudyNode } from './types';
import { collectDescendantIds, createStudyMaterial, createStudyNode, editorContentToPlainText, normalizeStudyData, nowIso } from './studyUtils';
import { studyStorageClient } from './storage/studyStorageClient';
import '../../styles/modules/study.css';

interface StudyPageProps {
  data: StudyData;
  boards: BoardsData;
  onChange: (data: StudyData) => void;
  onBoardsChange: (data: BoardsData) => void;
  onOpenBoards: (boardId: string) => void;
}

type StudyMode = 'edit' | 'read';

export function StudyPage({ data, boards, onChange, onOpenBoards }: StudyPageProps) {
  const safeData = useMemo(() => normalizeStudyData(data), [data]);
  const [mode, setMode] = useState<StudyMode>('edit');
  const [search, setSearch] = useState('');
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterial | null>(null);
  const [draftText, setDraftText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedNode = safeData.nodes.find((node) => node.id === safeData.selectedNodeId) ?? safeData.nodes[0] ?? null;
  const selectedMaterialId = selectedNode?.type === 'material' ? selectedNode.materialId : null;
  const linkedBoards = activeMaterial?.boardLinks
    .map((link) => boards.boards.find((board) => board.id === link.boardId) ?? { id: link.boardId, title: link.title })
    .filter(Boolean) ?? [];

  useEffect(() => {
    let cancelled = false;

    async function loadMaterial() {
      if (!selectedMaterialId) {
        setActiveMaterial(null);
        setDraftText('');
        return;
      }

      const material = await studyStorageClient.getMaterial(selectedMaterialId);
      if (cancelled) return;
      const safeMaterial = material ?? createStudyMaterial(selectedMaterialId, selectedNode?.title ?? 'Новый материал');
      setActiveMaterial(safeMaterial);
      setDraftText(editorContentToPlainText(safeMaterial.editorContent) || safeMaterial.plainText || '');
    }

    void loadMaterial();
    return () => {
      cancelled = true;
    };
  }, [selectedMaterialId, selectedNode?.title]);

  function updateStudy(next: StudyData) {
    onChange(normalizeStudyData(next));
  }

  async function createNode(type: 'folder' | 'material') {
    const parentId = selectedNode?.type === 'folder' ? selectedNode.id : selectedNode?.parentId ?? null;
    const node = createStudyNode(type, parentId);
    const nextData = normalizeStudyData({
      ...safeData,
      selectedNodeId: node.id,
      nodes: [...safeData.nodes, node],
    });
    updateStudy(nextData);

    if (type === 'material' && node.materialId) {
      await studyStorageClient.saveMaterial(createStudyMaterial(node.materialId, node.title));
    }
  }

  function selectNode(node: StudyNode) {
    updateStudy({ ...safeData, selectedNodeId: node.id });
  }

  async function renameSelected() {
    if (!selectedNode) return;
    const title = window.prompt('Название', selectedNode.title)?.trim();
    if (!title) return;
    const timestamp = nowIso();
    updateStudy({
      ...safeData,
      nodes: safeData.nodes.map((node) => (node.id === selectedNode.id ? { ...node, title, updatedAt: timestamp } : node)),
    });

    if (selectedNode.materialId && activeMaterial) {
      const nextMaterial = { ...activeMaterial, title, updatedAt: timestamp };
      setActiveMaterial(await studyStorageClient.saveMaterial(nextMaterial));
    }
  }

  async function deleteSelected() {
    if (!selectedNode || !window.confirm(`Удалить "${selectedNode.title}"?`)) return;
    const ids = collectDescendantIds(safeData.nodes, selectedNode.id);
    const materialIds = safeData.nodes
      .filter((node) => ids.has(node.id) && node.materialId)
      .map((node) => node.materialId as string);

    await Promise.all(materialIds.map((materialId) => studyStorageClient.deleteMaterial(materialId)));
    const nodes = safeData.nodes.filter((node) => !ids.has(node.id));
    updateStudy({
      selectedNodeId: nodes[0]?.id ?? null,
      nodes,
    });
  }

  async function saveMaterial() {
    if (!activeMaterial) return;
    setIsSaving(true);
    try {
      const timestamp = nowIso();
      const nextMaterial: StudyMaterial = {
        ...activeMaterial,
        editorContent: draftText,
        plainText: draftText.trim(),
        updatedAt: timestamp,
      };
      const saved = await studyStorageClient.saveMaterial(nextMaterial);
      setActiveMaterial(saved);
    } finally {
      setIsSaving(false);
    }
  }

  function openBoard(boardId: string) {
    onOpenBoards(boardId);
  }

  const visibleNodes = search.trim()
    ? safeData.nodes.filter((node) => node.title.toLowerCase().includes(search.trim().toLowerCase()))
    : safeData.nodes;
  const rootNodes = visibleNodes.filter((node) => !node.parentId).sort((a, b) => a.order - b.order);

  return (
    <section className="study-page">
      <aside className="study-sidebar">
        <div className="study-sidebar-head">
          <div>
            <strong>Обучение</strong>
            <span>{safeData.nodes.length}</span>
          </div>
          <div className="study-sidebar-actions">
            <button className="icon-button" type="button" onClick={() => void createNode('folder')} aria-label="Создать папку">
              <FolderPlus size={18} />
            </button>
            <button className="icon-button" type="button" onClick={() => void createNode('material')} aria-label="Создать материал">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <label className="study-search">
          <BookOpen size={16} />
          <input value={search} placeholder="Поиск" onChange={(event) => setSearch(event.target.value)} />
        </label>

        <div className="study-tree">
          {rootNodes.length === 0 ? (
            <div className="study-empty-tree">Создай папку или материал.</div>
          ) : rootNodes.map((node) => (
            <StudyTreeNode
              key={node.id}
              node={node}
              nodes={visibleNodes}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={selectNode}
            />
          ))}
        </div>
      </aside>

      <main className="study-workspace">
        <div className="study-material-header">
          <div>
            <span className="eyebrow">{selectedNode?.type === 'folder' ? 'Папка' : 'Материал'}</span>
            <h1>{selectedNode?.title ?? 'Обучение'}</h1>
          </div>
          <div className="study-header-actions">
            <div className="study-mode-toggle">
              <button className={mode === 'edit' ? 'active' : ''} type="button" onClick={() => setMode('edit')}>
                <Edit3 size={16} />
                Edit
              </button>
              <button className={mode === 'read' ? 'active' : ''} type="button" onClick={() => setMode('read')}>
                <BookOpen size={16} />
                Read
              </button>
            </div>
            <button className="button ghost" type="button" onClick={renameSelected} disabled={!selectedNode}>
              Переименовать
            </button>
            <button className="icon-button danger" type="button" onClick={() => void deleteSelected()} disabled={!selectedNode} aria-label="Удалить">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {selectedNode?.type === 'material' && activeMaterial ? (
          <div className="study-editor-layout">
            <section className="study-editor-panel">
              {mode === 'edit' ? (
                <>
                  <textarea
                    className="study-plain-editor"
                    value={draftText}
                    placeholder="Новый редактор обучения будет реализован с нуля. Сейчас можно сохранить plain-text черновик материала."
                    onChange={(event) => setDraftText(event.target.value)}
                  />
                  <div className="study-editor-footer">
                    <span>{draftText.trim().length} символов</span>
                    <button className="button primary" type="button" onClick={() => void saveMaterial()} disabled={isSaving}>
                      <Save size={18} />
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </>
              ) : (
                <article className="study-read-panel">
                  {draftText.trim() ? draftText.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`}>{paragraph}</p>
                  )) : <p className="muted-text">Материал пока пуст.</p>}
                </article>
              )}
            </section>

            <aside className="study-settings-panel">
              <h2>Настройки</h2>
              <div className="study-settings-card">
                <span className="eyebrow">Статус</span>
                <strong>{mode === 'edit' ? 'Редактирование' : 'Чтение'}</strong>
                <p>Старый notebook-редактор удалён. Следующая версия блока настроек будет строиться под новый редактор.</p>
              </div>
              <div className="study-settings-card">
                <span className="eyebrow">Связанные доски</span>
                {linkedBoards.length === 0 ? (
                  <p>Досок пока нет.</p>
                ) : linkedBoards.map((board) => (
                  <button className="study-board-link" type="button" key={board.id} onClick={() => openBoard(board.id)}>
                    {board.title}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        ) : selectedNode?.type === 'folder' ? (
          <div className="study-folder-state">
            <Folder size={32} />
            <strong>{selectedNode.title}</strong>
            <span>Выбери материал внутри папки или создай новый.</span>
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
}: {
  node: StudyNode;
  nodes: StudyNode[];
  selectedNodeId: string | null;
  onSelect: (node: StudyNode) => void;
}) {
  const children = nodes.filter((item) => item.parentId === node.id).sort((a, b) => a.order - b.order);
  return (
    <div className="study-tree-node">
      <button className={`study-tree-item ${selectedNodeId === node.id ? 'active' : ''}`} type="button" onClick={() => onSelect(node)}>
        {node.type === 'folder' ? <Folder size={17} /> : <FileText size={17} />}
        <span>{node.title}</span>
      </button>
      {children.length > 0 ? (
        <div className="study-tree-children">
          {children.map((child) => (
            <StudyTreeNode key={child.id} node={child} nodes={nodes} selectedNodeId={selectedNodeId} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
