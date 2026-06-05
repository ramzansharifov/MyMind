import { createId } from '../../shared/utils/idGenerator';
import type { StudyData, StudyMaterial, StudyNode } from './types';

export const emptyStudyData: StudyData = {
  selectedNodeId: null,
  nodes: [],
};

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeStudyData(value: unknown): StudyData {
  const source = (value ?? {}) as Partial<StudyData>;
  const timestamp = nowIso();
  const seen = new Set<string>();
  const nodes = Array.isArray(source.nodes)
    ? source.nodes
      .filter((node): node is StudyNode => Boolean(node?.id))
      .map((node, index) => {
        const id = seen.has(node.id) ? createId('study-node') : node.id;
        seen.add(id);
        return {
          id,
          type: node.type === 'material' ? 'material' as const : 'folder' as const,
          parentId: typeof node.parentId === 'string' ? node.parentId : null,
          title: node.title || (node.type === 'material' ? 'Новый материал' : 'Новая папка'),
          materialId: node.type === 'material' ? node.materialId || id : null,
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
    parentId: node.parentId && ids.has(node.parentId) && node.parentId !== node.id ? node.parentId : null,
  }));
  return {
    selectedNodeId: source.selectedNodeId && ids.has(source.selectedNodeId) ? source.selectedNodeId : safeNodes[0]?.id ?? null,
    nodes: safeNodes.sort((a, b) => a.order - b.order),
  };
}

export function createStudyNode(type: 'folder' | 'material', parentId: string | null, title?: string): StudyNode {
  const timestamp = nowIso();
  const id = createId(type === 'material' ? 'study-material' : 'study-folder');
  return {
    id,
    type,
    parentId,
    title: title || (type === 'material' ? 'Новый материал' : 'Новая папка'),
    materialId: type === 'material' ? id : null,
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
    title,
    editorContent: [
      {
        id: createId('block'),
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Начни писать материал здесь. Используй / для блоков редактора.', styles: {} }],
        children: [],
      },
    ],
    plainText: '',
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

export function editorContentToPlainText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  const visit = (blocks: unknown[]) => {
    blocks.forEach((block) => {
      const item = block as { content?: unknown; children?: unknown };
      if (Array.isArray(item.content)) {
        item.content.forEach((leaf) => {
          const text = (leaf as { text?: unknown }).text;
          if (typeof text === 'string') parts.push(text);
        });
      }
      if (Array.isArray(item.children)) visit(item.children);
    });
  };
  visit(content);
  return parts.join(' ').trim();
}
