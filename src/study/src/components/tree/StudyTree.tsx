import { useState, type DragEvent } from "react";
import type { StudyNode } from "../../types/study";
import { getChildren } from "../../utils/tree";

interface StudyTreeProps {
  nodes: StudyNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onCreateMaterial: (parentId?: string | null) => void;
  onRename: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onDuplicateMaterial: (nodeId: string) => void;
  onMoveNode: (draggedNodeId: string, targetNodeId: string | null) => void;
}

export function StudyTree({
  nodes,
  selectedNodeId,
  onSelect,
  onCreateFolder,
  onCreateMaterial,
  onRename,
  onDelete,
  onDuplicateMaterial,
  onMoveNode,
}: StudyTreeProps) {
  const [query, setQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  function toggleCollapse(nodeId: string) {
    setCollapsedIds((previous) => {
      const next = new Set(previous);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  }

  function clearDragState() {
    setDraggedNodeId(null);
    setDropTargetId(null);
    setRootDropActive(false);
  }

  function handleNodeDragStart(
    event: DragEvent<HTMLDivElement>,
    nodeId: string
  ) {
    event.dataTransfer.setData("text/plain", nodeId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedNodeId(nodeId);
  }

  function handleFolderDragOver(
    event: DragEvent<HTMLDivElement>,
    folderId: string
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (draggedNodeId && draggedNodeId !== folderId) {
      event.dataTransfer.dropEffect = "move";
      setDropTargetId(folderId);
      setRootDropActive(false);
    }
  }

  function handleFolderDrop(
    event: DragEvent<HTMLDivElement>,
    folderId: string
  ) {
    event.preventDefault();
    event.stopPropagation();

    const droppedNodeId = event.dataTransfer.getData("text/plain");

    clearDragState();

    if (!droppedNodeId || droppedNodeId === folderId) {
      return;
    }

    onMoveNode(droppedNodeId, folderId);
  }

  function handleRootDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (draggedNodeId) {
      event.dataTransfer.dropEffect = "move";
      setRootDropActive(true);
      setDropTargetId(null);
    }
  }

  function handleRootDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const droppedNodeId = event.dataTransfer.getData("text/plain");

    clearDragState();

    if (!droppedNodeId) {
      return;
    }

    onMoveNode(droppedNodeId, null);
  }

  function nodeMatchesSearch(node: StudyNode): boolean {
    if (!normalizedQuery) {
      return true;
    }

    if (node.title.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    return getChildren(nodes, node.id).some((child) => nodeMatchesSearch(child));
  }

  function renderNode(node: StudyNode, level: number) {
    if (!nodeMatchesSearch(node)) {
      return null;
    }

    const children = getChildren(nodes, node.id);
    const isSelected = selectedNodeId === node.id;
    const isCollapsed = collapsedIds.has(node.id);
    const isFolder = node.type === "folder";
    const isDropTarget = dropTargetId === node.id;

    return (
      <div key={node.id}>
        <div
          draggable
          onDragStart={(event) => handleNodeDragStart(event, node.id)}
          onDragEnd={clearDragState}
          onDragOver={(event) => {
            if (isFolder) {
              handleFolderDragOver(event, node.id);
            }
          }}
          onDragLeave={(event) => {
            event.stopPropagation();

            if (dropTargetId === node.id) {
              setDropTargetId(null);
            }
          }}
          onDrop={(event) => {
            if (isFolder) {
              handleFolderDrop(event, node.id);
            }
          }}
          onClick={() => onSelect(node.id)}
          className={[
            "group flex cursor-pointer items-center border-b px-2 py-2 text-sm",
            isSelected ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100",
            isDropTarget ? "border-black outline outline-2 outline-black" : "border-neutral-300",
          ].join(" ")}
          style={{ paddingLeft: 8 + level * 18 }}
          title={isFolder ? "Можно перетащить элемент сюда, чтобы вложить в папку" : ""}
        >
          <button
            type="button"
            className="mr-2 w-5 border border-transparent text-xs"
            onClick={(event) => {
              event.stopPropagation();

              if (isFolder) {
                toggleCollapse(node.id);
              }
            }}
          >
            {isFolder ? (isCollapsed ? "+" : "-") : "·"}
          </button>

          <span className="mr-2">{isFolder ? "[D]" : "[M]"}</span>

          <span className="min-w-0 flex-1 truncate">
            {node.title}
          </span>

          {isDropTarget && (
            <span className="ml-2 shrink-0 border border-current px-1 text-xs">
              DROP INSIDE
            </span>
          )}

          <div
            className="hidden items-center gap-1 group-hover:flex"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {isFolder && (
              <>
                <button
                  type="button"
                  className="border border-current px-1"
                  onClick={() => onCreateFolder(node.id)}
                  title="Новая папка внутри"
                >
                  D+
                </button>

                <button
                  type="button"
                  className="border border-current px-1"
                  onClick={() => onCreateMaterial(node.id)}
                  title="Новый материал внутри"
                >
                  M+
                </button>
              </>
            )}

            {node.type === "material" && (
              <button
                type="button"
                className="border border-current px-1"
                onClick={() => onDuplicateMaterial(node.id)}
                title="Дублировать материал"
              >
                C
              </button>
            )}

            <button
              type="button"
              className="border border-current px-1"
              onClick={() => onRename(node.id)}
              title="Переименовать"
            >
              R
            </button>

            <button
              type="button"
              className="border border-current px-1"
              onClick={() => onDelete(node.id)}
              title="Удалить"
            >
              X
            </button>
          </div>
        </div>

        {isFolder && !isCollapsed && (
          <div>
            {children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-80 shrink-0 flex-col overflow-hidden border-r border-black bg-white">
      <div className="shrink-0 border-b border-black p-4">
        <h2 className="font-bold">Study Tree</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Папки и материалы
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="border border-black bg-black px-3 py-2 text-sm text-white"
            onClick={() => onCreateFolder()}
          >
            Папка
          </button>

          <button
            type="button"
            className="border border-black bg-white px-3 py-2 text-sm text-black"
            onClick={() => onCreateMaterial()}
          >
            Материал
          </button>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
          className="mt-3 w-full border border-black bg-white px-3 py-2 text-sm outline-none"
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto"
        onDragOver={handleRootDragOver}
        onDragLeave={() => setRootDropActive(false)}
        onDrop={handleRootDrop}
      >
        {getChildren(nodes, null).map((node) => renderNode(node, 0))}

        {nodes.length === 0 && (
          <div className="p-4 text-sm text-neutral-600">
            Дерево пустое.
          </div>
        )}

        <div
          className={[
            "m-3 border border-dashed p-3 text-center text-xs",
            rootDropActive
              ? "border-black bg-black text-white"
              : "border-black bg-white text-neutral-600",
          ].join(" ")}
        >
          Перетащи сюда, чтобы перенести в корень
        </div>
      </div>
    </aside>
  );
}
