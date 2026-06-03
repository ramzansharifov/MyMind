import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type {
  CustomBlockTemplate,
  StudyBlock,
  StudyMaterial,
  StudyNode,
} from "../../types/study";
import { getBlockText, getBlockTitle } from "../../utils/blocks";
import { getNodePath } from "../../utils/tree";

interface CommandPaletteProps {
  open: boolean;
  nodes: StudyNode[];
  materials: StudyMaterial[];
  templates: CustomBlockTemplate[];
  selectedNodeId?: string | null;
  sidebarHidden?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onClose: () => void;
  onOpenNode: (nodeId: string) => void;
  onOpenBlock: (nodeId: string, blockId: string) => void;
  onCreateFolder: () => void;
  onCreateMaterial: () => void;
  onToggleSidebar?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onExportJson?: () => void;
  onClearState?: () => void;
}

type CommandResultType =
  | "command"
  | "recent"
  | "folder"
  | "material"
  | "block";

interface CommandResult {
  id: string;
  title: string;
  subtitle: string;
  type: CommandResultType;
  group: string;
  keywords: string;
  disabled?: boolean;
  action: () => void;
}

const RECENT_MATERIALS_KEY = "mymind-command-palette-recent-materials-v1";
const MAX_RECENT_MATERIALS = 8;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getTokens(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripHtml(value: string): string {
  const element = document.createElement("div");
  element.innerHTML = value;

  return element.textContent || element.innerText || value;
}

function truncate(value: string, maxLength: number): string {
  const cleanValue = value.replace(/\s+/g, " ").trim();

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, maxLength - 1)}…`;
}

function flattenBlocks(
  blocks: StudyBlock[],
  level = 0
): Array<{
  block: StudyBlock;
  index: number;
  level: number;
}> {
  return blocks.flatMap((block, index) => [
    {
      block,
      index,
      level,
    },
    ...flattenBlocks(block.children ?? [], level + 1),
  ]);
}

function readRecentMaterialIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_MATERIALS_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRecentMaterialIds(ids: string[]) {
  localStorage.setItem(
    RECENT_MATERIALS_KEY,
    JSON.stringify(ids.slice(0, MAX_RECENT_MATERIALS))
  );
}

function updateRecentMaterialIds(nodeId: string) {
  const previous = readRecentMaterialIds();
  const next = [nodeId, ...previous.filter((id) => id !== nodeId)];

  writeRecentMaterialIds(next);
}

function scoreResult(result: CommandResult, query: string): number {
  const tokens = getTokens(query);

  if (tokens.length === 0) {
    return 1;
  }

  const title = normalize(result.title);
  const subtitle = normalize(result.subtitle);
  const keywords = normalize(result.keywords);
  const haystack = `${title} ${subtitle} ${keywords}`;

  const matchesAllTokens = tokens.every((token) => haystack.includes(token));

  if (!matchesAllTokens) {
    return 0;
  }

  let score = 10;

  tokens.forEach((token) => {
    if (title === token) {
      score += 100;
    } else if (title.startsWith(token)) {
      score += 70;
    } else if (title.includes(token)) {
      score += 45;
    } else if (subtitle.includes(token)) {
      score += 20;
    } else if (keywords.includes(token)) {
      score += 10;
    }
  });

  if (result.type === "command") score += 6;
  if (result.type === "recent") score += 5;
  if (result.type === "material") score += 4;
  if (result.type === "block") score += 2;

  return score;
}

function getGroupLabel(group: string): string {
  if (group === "recent") return "Последние материалы";
  if (group === "commands") return "Команды";
  if (group === "materials") return "Материалы";
  if (group === "folders") return "Папки";
  if (group === "blocks") return "Блоки";

  return group;
}

function getTypeLabel(type: CommandResultType): string {
  if (type === "command") return "CMD";
  if (type === "recent") return "RECENT";
  if (type === "material") return "MAT";
  if (type === "folder") return "FOLDER";
  if (type === "block") return "BLOCK";

  return type;
}

export function CommandPalette({
  open,
  nodes,
  materials,
  templates,
  selectedNodeId = null,
  sidebarHidden = false,
  canUndo = false,
  canRedo = false,
  onClose,
  onOpenNode,
  onOpenBlock,
  onCreateFolder,
  onCreateMaterial,
  onToggleSidebar,
  onUndo,
  onRedo,
  onExportJson,
  onClearState,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentMaterialIds, setRecentMaterialIds] = useState<string[]>(() =>
    readRecentMaterialIds()
  );

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }

    const selectedNode = nodes.find((node) => node.id === selectedNodeId);

    if (selectedNode?.type !== "material") {
      return;
    }

    updateRecentMaterialIds(selectedNode.id);
    setRecentMaterialIds(readRecentMaterialIds());
  }, [selectedNodeId, nodes]);

  useEffect(() => {
    if (!open) return;

    setRecentMaterialIds(readRecentMaterialIds());

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const results = useMemo<CommandResult[]>(() => {
    const commandResults: CommandResult[] = [
      {
        id: "command_create_folder",
        title: "Создать папку",
        subtitle: "Новая папка в текущем контексте",
        type: "command",
        group: "commands",
        keywords: "folder папка create new",
        action: onCreateFolder,
      },
      {
        id: "command_create_material",
        title: "Создать материал",
        subtitle: "Новый материал в текущем контексте",
        type: "command",
        group: "commands",
        keywords: "material материал create new note page",
        action: onCreateMaterial,
      },
      {
        id: "command_toggle_sidebar",
        title: sidebarHidden ? "Показать левый сайдбар" : "Скрыть левый сайдбар",
        subtitle: "Ctrl + Shift + S",
        type: "command",
        group: "commands",
        keywords: "sidebar side panel hide show левый сайдбар",
        disabled: !onToggleSidebar,
        action: () => onToggleSidebar?.(),
      },
      {
        id: "command_undo",
        title: "Undo",
        subtitle: "Отменить последнее действие · Ctrl + Z",
        type: "command",
        group: "commands",
        keywords: "undo отменить ctrl z",
        disabled: !canUndo || !onUndo,
        action: () => onUndo?.(),
      },
      {
        id: "command_redo",
        title: "Redo",
        subtitle: "Повторить действие · Ctrl + Y",
        type: "command",
        group: "commands",
        keywords: "redo повторить ctrl y",
        disabled: !canRedo || !onRedo,
        action: () => onRedo?.(),
      },
      {
        id: "command_export_json",
        title: "Export JSON",
        subtitle: "Скачать резервную копию данных",
        type: "command",
        group: "commands",
        keywords: "export json backup скачать экспорт",
        disabled: !onExportJson,
        action: () => onExportJson?.(),
      },
      {
        id: "command_clear_app",
        title: "Clear app",
        subtitle: "Открыть подтверждение очистки приложения",
        type: "command",
        group: "commands",
        keywords: "clear delete reset очистить удалить",
        disabled: !onClearState,
        action: () => onClearState?.(),
      },
    ];

    const recentResults: CommandResult[] = recentMaterialIds
      .map((nodeId) => nodes.find((node) => node.id === nodeId))
      .filter((node): node is StudyNode => Boolean(node && node.type === "material"))
      .map((node) => ({
        id: `recent_${node.id}`,
        title: node.title,
        subtitle: `Последний материал · ${getNodePath(nodes, node.id)}`,
        type: "recent" as const,
        group: "recent",
        keywords: `recent last opened материал ${node.title}`,
        action: () => onOpenNode(node.id),
      }));

    const nodeResults: CommandResult[] = nodes.map((node) => ({
      id: `node_${node.id}`,
      title: node.title,
      subtitle:
        node.type === "folder"
          ? `Папка · ${getNodePath(nodes, node.id)}`
          : `Материал · ${getNodePath(nodes, node.id)}`,
      type: node.type,
      group: node.type === "folder" ? "folders" : "materials",
      keywords: `${node.type} ${node.title} ${getNodePath(nodes, node.id)}`,
      action: () => onOpenNode(node.id),
    }));

    const blockResults: CommandResult[] = materials.flatMap((material) => {
      const materialNode = nodes.find((node) => node.id === material.nodeId);
      const materialPath = materialNode
        ? getNodePath(nodes, materialNode.id)
        : material.title;

      return flattenBlocks(material.blocks).map(({ block, index, level }) => {
        const rawBlockText = getBlockText(block, templates).trim();
        const blockText = truncate(stripHtml(rawBlockText), 120);
        const blockTitle = getBlockTitle(block, templates);
        const fallbackTitle = `${blockTitle} #${index + 1}`;

        return {
          id: `block_${material.id}_${block.id}`,
          title: blockText || fallbackTitle,
          subtitle: `Блок #${index + 1} · level ${level} · ${blockTitle} · ${materialPath}`,
          type: "block" as const,
          group: "blocks",
          keywords: `${blockTitle} ${blockText} ${materialPath}`,
          action: () => onOpenBlock(material.nodeId, block.id),
        };
      });
    });

    const allResults = [
      ...recentResults,
      ...commandResults,
      ...nodeResults,
      ...blockResults,
    ];

    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return [
        ...recentResults.slice(0, 8),
        ...commandResults,
        ...nodeResults.filter((result) => result.type === "material").slice(0, 12),
        ...nodeResults.filter((result) => result.type === "folder").slice(0, 8),
      ].slice(0, 50);
    }

    return allResults
      .map((result) => ({
        result,
        score: scoreResult(result, normalizedQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.result)
      .slice(0, 80);
  }, [
    query,
    nodes,
    materials,
    templates,
    recentMaterialIds,
    sidebarHidden,
    canUndo,
    canRedo,
    onCreateFolder,
    onCreateMaterial,
    onToggleSidebar,
    onUndo,
    onRedo,
    onExportJson,
    onClearState,
    onOpenNode,
    onOpenBlock,
  ]);

  const groupedResults = useMemo(() => {
    const groups: Array<{
      group: string;
      items: CommandResult[];
    }> = [];

    results.forEach((result) => {
      const existingGroup = groups.find((item) => item.group === result.group);

      if (existingGroup) {
        existingGroup.items.push(result);
        return;
      }

      groups.push({
        group: result.group,
        items: [result],
      });
    });

    return groups;
  }, [results]);

  const flatResults = groupedResults.flatMap((group) => group.items);
  const activeResult = flatResults[activeIndex] ?? flatResults[0] ?? null;

  if (!open) {
    return null;
  }

  function runResult(result: CommandResult) {
    if (result.disabled) {
      return;
    }

    result.action();
    onClose();
  }

  function moveActiveIndex(direction: -1 | 1) {
    if (flatResults.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((previous) => {
      const nextIndex = previous + direction;

      if (nextIndex < 0) {
        return flatResults.length - 1;
      }

      if (nextIndex >= flatResults.length) {
        return 0;
      }

      return nextIndex;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(-1);
      return;
    }

    if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      runResult(activeResult);
    }
  }

  let itemIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 bg-white/90 p-6"
      onMouseDown={onClose}
    >
      <div
        className="mx-auto max-w-4xl border border-black bg-white shadow-[6px_6px_0_#000]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-black p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Command Palette</h2>
              <p className="mt-1 text-xs text-neutral-600">
                Ctrl + Shift + K · быстрый поиск и команды
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="border border-black bg-black px-3 py-1 text-sm text-white"
            >
              Esc
            </button>
          </div>

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ищи материалы, блоки или команды..."
            className="w-full border border-black bg-white px-3 py-2 text-lg outline-none"
          />

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-600">
            <span className="border border-neutral-300 px-2 py-1">↑ ↓ — выбор</span>
            <span className="border border-neutral-300 px-2 py-1">Enter — открыть</span>
            <span className="border border-neutral-300 px-2 py-1">Esc — закрыть</span>
          </div>
        </div>

        <div className="max-h-[620px] overflow-auto">
          {flatResults.length === 0 && (
            <div className="p-6 text-center text-sm text-neutral-600">
              Ничего не найдено.
            </div>
          )}

          {groupedResults.map((group) => (
            <section key={group.group}>
              <div className="sticky top-0 z-10 border-b border-black bg-neutral-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">
                {getGroupLabel(group.group)}
              </div>

              {group.items.map((result) => {
                itemIndex += 1;

                const isActive = itemIndex === activeIndex;

                return (
                  <button
                    key={result.id}
                    type="button"
                    disabled={result.disabled}
                    onMouseEnter={() => setActiveIndex(itemIndex)}
                    onClick={() => runResult(result)}
                    className={[
                      "grid w-full grid-cols-[110px_1fr] border-b border-neutral-300 text-left",
                      isActive ? "bg-black text-white" : "bg-white hover:bg-black hover:text-white",
                      result.disabled ? "cursor-not-allowed opacity-40" : "",
                    ].join(" ")}
                  >
                    <div className="border-r border-neutral-300 px-3 py-3 text-xs uppercase">
                      {getTypeLabel(result.type)}
                    </div>

                    <div className="min-w-0 px-3 py-3">
                      <div className="truncate font-bold">
                        {result.title}
                      </div>

                      <div className="truncate text-sm opacity-70">
                        {result.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
