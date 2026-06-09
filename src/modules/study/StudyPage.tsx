import { BookOpen, Edit3, FileText, Folder, FolderPlus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { BoardsData } from '../boards/types';
import { StudyBlockEditor } from './blocks/StudyBlockEditor';
import { createStudyBlockDocument, normalizeStudyBlockDocument, type StudyBlockDocument } from './blocks/blockCore';
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

export function StudyPage({ data, onChange }: StudyPageProps) {
  const safeData = useMemo(() => normalizeStudyData(data), [data]);

  const [mode, setMode] = useState<StudyMode>('edit');
  const [search, setSearch] = useState('');
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterial | null>(null);
  const [draftContent, setDraftContent] = useState<StudyBlockDocument>(() => createStudyBlockDocument(''));
  const [draftPlainText, setDraftPlainText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedNode = safeData.nodes.find((node) => node.id === safeData.selectedNodeId) ?? safeData.nodes[0] ?? null;
  const selectedMaterialId = selectedNode?.type === 'material' ? selectedNode.materialId : null;

  useEffect(() => {
    let cancelled = false;

    async function loadMaterial() {
      setErrorMessage(null);

      if (!selectedMaterialId) {
        setActiveMaterial(null);
        setDraftContent(createStudyBlockDocument(''));
        setDraftPlainText('');
        return;
      }

      setIsLoading(true);

      try {
        const material = await studyStorageClient.getMaterial(selectedMaterialId);

        if (cancelled) return;

        const safeMaterial = material ?? createStudyMaterial(selectedMaterialId, selectedNode?.title ?? 'Новый материал');
        const blockContent = normalizeStudyBlockDocument(safeMaterial.editorContent, safeMaterial.plainText);
        const plainText = blockContent.plainText;

        setActiveMaterial({
          ...safeMaterial,
          editorContent: blockContent,
          plainText,
        });

        setDraftContent(blockContent);
        setDraftPlainText(plainText);
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
      try {
        await studyStorageClient.saveMaterial(createStudyMaterial(node.materialId, node.title));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Не удалось создать материал.');
      }
    }
  }

  function selectNode(node: StudyNode) {
    updateStudy({
      ...safeData,
      selectedNodeId: node.id,
    });
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
      try {
        const nextMaterial = {
          ...activeMaterial,
          title,
          updatedAt: timestamp,
        };

        setActiveMaterial(await studyStorageClient.saveMaterial(nextMaterial));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Не удалось переименовать материал.');
      }
    }
  }

  async function deleteSelected() {
    if (!selectedNode || !window.confirm(`Удалить "${selectedNode.title}"?`)) return;

    setErrorMessage(null);

    const ids = collectDescendantIds(safeData.nodes, selectedNode.id);

    const materialIds = safeData.nodes
      .filter((node) => ids.has(node.id) && node.materialId)
      .map((node) => node.materialId as string);

    try {
      await Promise.all(materialIds.map((materialId) => studyStorageClient.deleteMaterial(materialId)));

      const nodes = safeData.nodes.filter((node) => !ids.has(node.id));

      updateStudy({
        selectedNodeId: nodes[0]?.id ?? null,
        nodes,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось удалить элемент.');
    }
  }

  async function saveMaterial() {
    if (!activeMaterial) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const timestamp = nowIso();
      const blockDocument = createStudyBlockDocument(draftContent, draftPlainText);
      const plainText = blockDocument.plainText || draftPlainText.trim();

      const nextMaterial: StudyMaterial = {
        ...activeMaterial,
        editorContent: blockDocument,
        plainText,
        updatedAt: timestamp,
      };

      const saved = await studyStorageClient.saveMaterial(nextMaterial);

      setActiveMaterial(saved);
      setDraftContent(blockDocument);
      setDraftPlainText(plainText);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось сохранить материал.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditorChange(document: StudyBlockDocument, plainText: string) {
    setDraftContent(document);
    setDraftPlainText(plainText);
  }

  const visibleNodes = getVisibleStudyNodes(safeData.nodes, search);
  const rootNodes = visibleNodes.filter((node) => !node.parentId).sort((a, b) => a.order - b.order);

  return (
    <section className="study-page">
      <aside className="study-sidebar">
        <div className="study-sidebar-head">
          <div>
            <strong>Обучение</strong>
            <span>{safeData.nodes.length} элементов</span>
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
          <input value={search} placeholder="Поиск по материалам" onChange={(event) => setSearch(event.target.value)} />
        </label>

        <div className="study-tree">
          {rootNodes.length === 0 ? (
            <div className="study-empty-tree">Создай папку или материал.</div>
          ) : (
            rootNodes.map((node) => (
              <StudyTreeNode
                key={node.id}
                node={node}
                nodes={visibleNodes}
                selectedNodeId={selectedNode?.id ?? null}
                onSelect={selectNode}
              />
            ))
          )}
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
