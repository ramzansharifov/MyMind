import { createId } from "../../shared/utils/idGenerator";
import {
  createStudyBlockDocument,
  isStudyBlockDocument,
  richTextHtmlToPlainText,
  studyBlocksToPlainText,
} from "../../shared/blockEditor";
import type { StudyData, StudyMaterial, StudyNode } from "./types";

export const emptyStudyData: StudyData = {
  selectedNodeId: null,
  nodes: [],
};

export function nowIso() {
  return new Date().toISOString();
}


const cp1252UnicodeToByte = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

const mojibakeRunPattern = /[\u0080-\u009f\u00a0-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]+/g;
const cyrillicPattern = /[\u0400-\u04ff]/;

function cp1252ByteForChar(char: string) {
  const code = char.charCodeAt(0);
  if (code <= 0xff) return code;
  return cp1252UnicodeToByte.get(code);
}

function decodeMojibakeOnce(text: string) {
  return text.replace(mojibakeRunPattern, (segment) => {
    const bytes: number[] = [];

    for (const char of segment) {
      const byte = cp1252ByteForChar(char);
      if (byte === undefined) return segment;
      bytes.push(byte);
    }

    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      return cyrillicPattern.test(decoded) ? decoded : segment;
    } catch {
      return segment;
    }
  });
}

export function repairMojibakeText(value: unknown) {
  let current = String(value ?? '');

  for (let index = 0; index < 4; index += 1) {
    const next = decodeMojibakeOnce(current);
    if (next === current) break;
    current = next;
  }

  return current;
}


export function normalizeStudyData(value: unknown): StudyData {
  const source = (value ?? {}) as Partial<StudyData>;
  const timestamp = nowIso();
  const seen = new Set<string>();

  const nodes = Array.isArray(source.nodes)
    ? source.nodes
        .filter((node): node is StudyNode => Boolean(node?.id))
        .map((node, index) => {
          const id = seen.has(node.id) ? createId("study-node") : node.id;
          seen.add(id);

          return {
            id,
            type:
              node.type === "material"
                ? ("material" as const)
                : ("folder" as const),
            parentId: typeof node.parentId === "string" ? node.parentId : null,
            title: repairMojibakeText(
              node.title ||
                (node.type === "material" ? "Новый материал" : "Новая папка"),
            ),
            materialId: node.type === "material" ? node.materialId || id : null,
            isExpanded: node.isExpanded ?? true,
            order: Number.isFinite(node.order) ? node.order : index,
            createdAt: node.createdAt ?? timestamp,
            updatedAt: node.updatedAt ?? node.createdAt ?? timestamp,
          };
        })
    : [];

  const ids = new Set(nodes.map((node) => node.id));

  const safeNodes = nodes.map((node) => ({
    ...node,
    parentId:
      node.parentId && ids.has(node.parentId) && node.parentId !== node.id
        ? node.parentId
        : null,
  }));

  const safeIds = new Set(safeNodes.map((node) => node.id));

  return {
    selectedNodeId:
      source.selectedNodeId && safeIds.has(source.selectedNodeId)
        ? source.selectedNodeId
        : (safeNodes[0]?.id ?? null),
    nodes: safeNodes.sort((a, b) => a.order - b.order),
  };
}

export function createStudyNode(
  type: "folder" | "material",
  parentId: string | null,
  title?: string,
): StudyNode {
  const timestamp = nowIso();
  const id = createId(type === "material" ? "study-material" : "study-folder");

  return {
    id,
    type,
    parentId,
    title: repairMojibakeText(title || (type === "material" ? "Новый материал" : "Новая папка")),
    materialId: type === "material" ? id : null,
    isExpanded: true,
    order: Date.now(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createStudyMaterial(id: string, title: string): StudyMaterial {
  const timestamp = nowIso();

  return {
    id,
    title: repairMojibakeText(title),
    editorContent: createStudyBlockDocument(""),
    plainText: "",
    boardLinks: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function collectDescendantIds(nodes: StudyNode[], nodeId: string) {
  const result = new Set<string>([nodeId]);
  let changed = true;

  while (changed) {
    changed = false;

    nodes.forEach((node) => {
      if (node.parentId && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id);
        changed = true;
      }
    });
  }

  return result;
}

export function getNodeTreeIds(nodes: StudyNode[], rootId: string) {
  return collectDescendantIds(nodes, rootId);
}

export function getNodeAncestorIds(nodes: StudyNode[], nodeId: string) {
  const result = new Set<string>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let current = byId.get(nodeId);

  while (current?.parentId) {
    result.add(current.parentId);
    current = byId.get(current.parentId);
  }

  return result;
}

export function getVisibleStudyNodes(nodes: StudyNode[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) return nodes;

  const visibleIds = new Set<string>();
  const matchedNodes = nodes.filter((node) =>
    node.title.toLowerCase().includes(query),
  );

  matchedNodes.forEach((node) => {
    visibleIds.add(node.id);

    getNodeAncestorIds(nodes, node.id).forEach((id) => visibleIds.add(id));

    if (node.type === "folder") {
      getNodeTreeIds(nodes, node.id).forEach((id) => visibleIds.add(id));
    }
  });

  return nodes.filter((node) => visibleIds.has(node.id));
}

export function editorContentToPlainText(content: unknown): string {
  if (isStudyBlockDocument(content)) {
    return content.plainText?.trim() || studyBlocksToPlainText(content.blocks);
  }

  const richText = richTextHtmlToPlainText(content);

  if (richText) return richText;

  if (!Array.isArray(content)) return "";

  const parts: string[] = [];

  const visit = (blocks: unknown[]) => {
    blocks.forEach((block) => {
      const item = block as { content?: unknown; children?: unknown };

      if (Array.isArray(item.content)) {
        item.content.forEach((leaf) => {
          const text = (leaf as { text?: unknown }).text;

          if (typeof text === "string") parts.push(text);
        });
      }

      if (Array.isArray(item.children)) visit(item.children);
    });
  };

  visit(content);

  return parts.join(" ").trim();
}
