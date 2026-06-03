import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Search, Command } from 'lucide-react';
import type {
  StudyCustomBlockTemplate,
  StudyBlock,
  StudyMaterial,
  StudyNode,
} from "../../types";
import { getStudyBlockText, getStudyBlockLabel } from "../../studyUtils";

interface CommandPaletteProps {
  open: boolean;
  nodes: StudyNode[];
  materials: StudyMaterial[];
  templates: StudyCustomBlockTemplate[];
  onClose: () => void;
  onOpenNode: (nodeId: string) => void;
  onOpenBlock: (nodeId: string, blockId: string) => void;
  onCreateFolder: () => void;
  onCreateMaterial: () => void;
}

type CommandResultType = "command" | "folder" | "material" | "block";

interface CommandResult {
  id: string;
  title: string;
  subtitle: string;
  type: CommandResultType;
  group: string;
  keywords: string;
  action: () => void;
}

const RECENT_MATERIALS_KEY = "study-command-palette-recent-v1";
const MAX_RECENT_MATERIALS = 10;

function readRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_MATERIALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getTokens(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function truncate(value: string, maxLength: number): string {
  const cleanValue = value.replace(/\s+/g, " ").trim();
  if (cleanValue.length <= maxLength) return cleanValue;
  return `${cleanValue.slice(0, maxLength - 1)}…`;
}

function flattenBlocks(blocks: StudyBlock[], level = 0): Array<{ block: StudyBlock; index: number; level: number }> {
  return blocks.flatMap((block, index) => [
    { block, index, level },
    ...flattenBlocks(block.children ?? [], level + 1),
  ]);
}

function scoreResult(result: CommandResult, query: string): number {
  const tokens = getTokens(query);
  if (tokens.length === 0) return 1;

  const title = normalize(result.title);
  const subtitle = normalize(result.subtitle);
  const keywords = normalize(result.keywords);
  const haystack = `${title} ${subtitle} ${keywords}`;

  const matchesAllTokens = tokens.every((token) => haystack.indexOf(token) !== -1);
  if (!matchesAllTokens) return 0;

  let score = 10;
  tokens.forEach((token) => {
    if (title === token) score += 100;
    else if (title.indexOf(token) === 0) score += 70;
    else if (title.indexOf(token) !== -1) score += 45;
    else if (subtitle.indexOf(token) !== -1) score += 20;
    else if (keywords.indexOf(token) !== -1) score += 10;
  });

  if (result.type === "command") score += 6;
  if (result.type === "material") score += 4;
  if (result.type === "block") score += 2;

  return score;
}

export function StudyCommandPalette({
  open,
  nodes,
  materials,
  templates,
  onClose,
  onOpenNode,
  onOpenBlock,
  onCreateFolder,
  onCreateMaterial,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setRecentIds(readRecentIds());
      const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(timeout);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const results = useMemo<CommandResult[]>(() => {
    const getPath = (nodeId: string) => {
        const parts: string[] = [];
        let curr = nodes.find(n => n.id === nodeId);
        while (curr) {
            parts.unshift(curr.title);
            curr = nodes.find(n => n.id === curr?.parentId);
        }
        return parts.join(' / ');
    };

    const recentResults: CommandResult[] = recentIds
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is StudyNode => !!n && n.type === 'material')
      .map(n => ({
          id: `recent_${n.id}`,
          title: n.title,
          subtitle: `Recent Material · ${getPath(n.id)}`,
          type: "material" as const,
          group: "Recent",
          keywords: `recent ${n.title}`,
          action: () => onOpenNode(n.id),
      }));

    const commandResults: CommandResult[] = [
      {
        id: "cmd_folder",
        title: "Create Folder",
        subtitle: "New folder in current workspace",
        type: "command",
        group: "Commands",
        keywords: "folder create new",
        action: onCreateFolder,
      },
      {
        id: "cmd_material",
        title: "Create Material",
        subtitle: "New learning material",
        type: "command",
        group: "Commands",
        keywords: "material create new note",
        action: onCreateMaterial,
      },
    ];

    const nodeResults: CommandResult[] = nodes.map((node) => ({
      id: `node_${node.id}`,
      title: node.title,
      subtitle: `${node.type === "folder" ? "Folder" : "Material"} · ${getPath(node.id)}`,
      type: node.type as CommandResultType,
      group: node.type === "folder" ? "Folders" : "Materials",
      keywords: `${node.type} ${node.title} ${getPath(node.id)}`,
      action: () => onOpenNode(node.id),
    }));

    const blockResults: CommandResult[] = materials.flatMap((material) => {
      const materialPath = getPath(material.nodeId) || material.title;
      return flattenBlocks(material.blocks).map(({ block, index, level }) => {
        const blockText = truncate(getStudyBlockText(block), 120);
        const blockTitle = getStudyBlockLabel(block.type);
        return {
          id: `block_${material.id}_${block.id}`,
          title: blockText || `${blockTitle} #${index + 1}`,
          subtitle: `Block #${index + 1} · ${blockTitle} · ${materialPath}`,
          type: "block" as const,
          group: "Blocks",
          keywords: `${blockTitle} ${blockText} ${materialPath}`,
          action: () => onOpenBlock(material.nodeId, block.id),
        };
      });
    });

    const allResults = [...recentResults, ...commandResults, ...nodeResults, ...blockResults];
    const nQuery = normalize(query);

    if (!nQuery) {
      return [...recentResults, ...commandResults, ...nodeResults.filter(r => r.type === 'material').slice(0, 8)].slice(0, 30);
    }

    return allResults
      .map((result) => ({ result, score: scoreResult(result, nQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.result)
      .slice(0, 50);
  }, [query, nodes, materials, onCreateFolder, onCreateMaterial, onOpenNode, onOpenBlock]);

  if (!open) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex(prev => (prev + 1) % Math.max(1, results.length));
    }
    if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    }
    if (event.key === "Enter" && results[activeIndex]) {
        event.preventDefault();
        results[activeIndex].action();
        onClose();
    }
  };

  return (
    <div className="study-modal-backdrop command-palette-backdrop" onMouseDown={onClose}>
      <div className="study-command-palette glass-panel shadow-strong" onMouseDown={e => e.stopPropagation()}>
        <div className="study-command-head">
          <Command size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search materials, blocks or commands..."
          />
        </div>
        <div className="study-command-results">
          {results.map((result, index) => (
            <button
              key={result.id}
              className={`study-command-item${index === activeIndex ? ' active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => { result.action(); onClose(); }}
            >
              <div className="study-command-item-info">
                <strong>{result.title}</strong>
                <span>{result.subtitle}</span>
              </div>
              <div className="study-command-item-type">{result.type}</div>
            </button>
          ))}
          {results.length === 0 && <div className="study-command-empty">No results found</div>}
        </div>
      </div>
    </div>
  );
}
