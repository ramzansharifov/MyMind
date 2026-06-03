import type { StudyMaterial, StudyNode } from "../../types/study";
import { getChildren } from "../../utils/tree";
import { formatDate } from "../../utils/format";

interface FolderViewProps {
  node: StudyNode;
  nodes: StudyNode[];
  materials: StudyMaterial[];
  onOpenNode: (nodeId: string) => void;
  onCreateFolder: () => void;
  onCreateMaterial: () => void;
}

export function FolderView({
  node,
  nodes,
  materials,
  onOpenNode,
  onCreateFolder,
  onCreateMaterial,
}: FolderViewProps) {
  const children = getChildren(nodes, node.id);

  return (
    <div className="mx-auto max-w-5xl">
      <section className="border border-black bg-white p-5">
        <p className="text-sm text-neutral-600">Папка</p>
        <h2 className="mt-1 text-2xl font-bold">{node.title}</h2>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="border border-black bg-black px-4 py-2 text-sm text-white"
            onClick={onCreateFolder}
          >
            Новая папка
          </button>

          <button
            type="button"
            className="border border-black bg-white px-4 py-2 text-sm text-black"
            onClick={onCreateMaterial}
          >
            Новый материал
          </button>
        </div>
      </section>

      <section className="mt-6 border border-black">
        <div className="border-b border-black bg-neutral-100 px-4 py-3 font-bold">
          Содержимое
        </div>

        {children.length === 0 && (
          <div className="p-4 text-sm text-neutral-600">
            В этой папке пока ничего нет.
          </div>
        )}

        {children.map((child) => {
          const material = materials.find((item) => item.nodeId === child.id);

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onOpenNode(child.id)}
              className="flex w-full items-center justify-between border-b border-neutral-300 bg-white px-4 py-3 text-left hover:bg-neutral-100"
            >
              <span>
                <span className="mr-2">{child.type === "folder" ? "[D]" : "[M]"}</span>
                <span className="font-medium">{child.title}</span>
              </span>

              <span className="text-sm text-neutral-600">
                {child.type === "folder"
                  ? "Папка"
                  : `${material?.blocks.length ?? 0} блоков · ${formatDate(material?.updatedAt ?? "")}`}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
