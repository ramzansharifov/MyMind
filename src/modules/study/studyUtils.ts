import type {
  StudyBlock,
  StudyBlockSettings,
  StudyBlockType,
  StudyBoardStroke,
  StudyCustomBlockTemplate,
  StudyData,
  StudyFileBlock,
  StudyMaterial,
  StudyNode,
  StudyNodeType,
  StudyTableBlock,
  StudyContentBlock,
  StudyBoardBlock,
  StudyHeadingStyle,
} from './types';

export const emptyStudyData: StudyData = {
  selectedNodeId: null,
  nodes: [],
  materials: [],
  customBlockTemplates: [],
};

export const STUDY_BLOCK_LABELS: Record<StudyBlockType, string> = {
  heading: 'Heading',
  text: 'Text',
  latex: 'Formula',
  markdown: 'Markdown',
  code: 'Code',
  table: 'Table',
  definition: 'Definition',
  problem: 'Problem',
  solution: 'Solution',
  board: 'Board',
  file: 'File',
  divider: 'Divider',
  custom: 'Custom',
};

export const STUDY_BLOCK_TYPES: StudyBlockType[] = [
  'heading',
  'text',
  'latex',
  'markdown',
  'code',
  'table',
  'definition',
  'problem',
  'solution',
  'board',
  'file',
  'divider',
];

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createStudyNode(type: StudyNodeType, title: string, parentId: string | null, order: number): StudyNode {
  const timestamp = nowIso();
  return {
    id: createId(`study-${type}`),
    type,
    title,
    parentId,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createStudyMaterial(nodeId: string, title = 'New material'): StudyMaterial {
  const timestamp = nowIso();
  return {
    id: nodeId,
    nodeId,
    title,
    description: '',
    tags: [],
    blocks: [createStudyBlock('heading', 'Main idea')],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createStudyBlock(type: StudyBlockType, content = ''): StudyBlock {
  const timestamp = nowIso();
  const base = {
    id: createId('study-block'),
    type,
    createdAt: timestamp,
    updatedAt: timestamp,
    settings: {},
    children: [],
  };

  if (isContentBlockType(type)) {
    const block: StudyContentBlock = {
      ...base,
      type,
      content: content || defaultContentForType(type),
      language: type === 'code' ? 'text' : undefined,
    };
    block.settings = defaultSettingsForType(type);
    return block;
  }

  if (type === 'table') {
    return {
      ...base,
      type,
      rows: [
        ['', ''],
        ['', ''],
      ],
      hasHeader: false,
      columnWidths: [180, 180],
    } as StudyTableBlock;
  }

  if (type === 'board') {
    return {
      ...base,
      type,
      strokes: [],
      settings: { boardHeight: 360 },
    } as any;
  }

  if (type === 'file') {
    return {
      ...base,
      type,
      fileId: '',
      fileName: '',
      note: '',
    } as StudyFileBlock;
  }

  if (type === 'divider') {
    return {
      ...base,
      type,
      settings: { dividerColor: '#000000' },
    } as any;
  }

  return {
    ...base,
    type: 'custom',
    templateId: '',
    values: {},
  } as any;
}

export function createCustomStudyBlock(template: StudyCustomBlockTemplate): StudyBlock {
  const block = createStudyBlock('custom');
  if (block.type !== 'custom') {
    return block;
  }

  return {
    ...block,
    templateId: template.id,
    values: Object.fromEntries(template.fields.map((field) => [field.id, field.defaultValue ?? ''])),
  };
}

export function createStudyTemplate(title = 'Custom block'): StudyCustomBlockTemplate {
  const timestamp = nowIso();
  return {
    id: createId('study-template'),
    title,
    description: '',
    accentColor: 'var(--accent)',
    fields: [
      {
        id: createId('study-field'),
        label: 'Text',
        type: 'text',
        placeholder: 'Value',
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function cloneStudyBlock(block: StudyBlock): StudyBlock {
  const timestamp = nowIso();
  const cloned = structuredClone(block) as StudyBlock;
  const remap = (item: StudyBlock): StudyBlock => ({
    ...item,
    id: createId('study-block'),
    createdAt: timestamp,
    updatedAt: timestamp,
    children: (item.children ?? []).map(remap),
  });
  return remap(cloned);
}

export function getStudyBlockLabel(type: StudyBlockType) {
  return STUDY_BLOCK_LABELS[type];
}

export function getStudyBlockText(block: StudyBlock): string {
  const childText = (block.children ?? []).map(getStudyBlockText).join(' ');
  if (isContentBlock(block)) {
    return `${block.content} ${childText}`.trim();
  }
  if (block.type === 'file') {
    return `${block.fileName} ${block.note} ${childText}`.trim();
  }
  if (block.type === 'table') {
    return `${block.rows.flat().join(' ')} ${childText}`.trim();
  }
  if (block.type === 'custom') {
    return `${Object.values(block.values).join(' ')} ${childText}`.trim();
  }
  return childText.trim();
}

export function getStudyMaterialPreview(material: StudyMaterial) {
    return material.blocks
      .map(getStudyBlockText)
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
}

export function isContentBlock(block: StudyBlock): block is StudyContentBlock {
  return isContentBlockType(block.type);
}

export function isContentBlockType(type: StudyBlockType): type is StudyContentBlock['type'] {
  return ['heading', 'text', 'latex', 'markdown', 'code', 'definition', 'problem', 'solution'].includes(type);
}

export function normalizeStudyData(value: unknown): StudyData {
  const source = (value ?? {}) as Partial<StudyData>;
  const timestamp = nowIso();

  const nodes = (Array.isArray(source.nodes) ? source.nodes : []).map((node, index) => ({
    id: node.id || createId(`study-${node.type || 'node'}`),
    type: node.type === 'material' ? 'material' : 'folder',
    title: node.title || (node.type === 'material' ? 'New material' : 'New folder'),
    parentId: node.parentId ?? null,
    order: Number.isFinite(node.order) ? node.order : index,
    collapsed: Boolean(node.collapsed),
    createdAt: node.createdAt ?? timestamp,
    updatedAt: node.updatedAt ?? node.createdAt ?? timestamp,
  })) satisfies StudyNode[];

  const materialNodes = new Set(nodes.filter((node) => node.type === 'material').map((node) => node.id));
  const materials = (Array.isArray(source.materials) ? source.materials : [])
    .map((material) => normalizeMaterial(material, timestamp))
    .filter((material) => materialNodes.has(material.nodeId));

  const missingMaterials = nodes
    .filter((node) => node.type === 'material' && !materials.some((material) => material.nodeId === node.id))
    .map((node) => createStudyMaterial(node.id, node.title));

  const selectedNodeId = source.selectedNodeId && nodes.some(n => n.id === source.selectedNodeId) ? source.selectedNodeId : nodes[0]?.id ?? null;

  return {
    selectedNodeId,
    nodes,
    materials: [...materials, ...missingMaterials],
    customBlockTemplates: normalizeTemplates(source.customBlockTemplates),
  };
}

function normalizeMaterial(value: unknown, fallbackTimestamp: string): StudyMaterial {
  const material = (value ?? {}) as Record<string, unknown>;
  const nodeId = String(material.nodeId || material.id || '');
  return {
    id: String(material.id || nodeId),
    nodeId,
    title: String(material.title || 'New material'),
    description: String(material.description || ''),
    tags: Array.isArray(material.tags) ? material.tags.map(String).filter(Boolean) : [],
    blocks: normalizeBlocks(material.blocks),
    createdAt: String(material.createdAt || fallbackTimestamp),
    updatedAt: String(material.updatedAt || material.createdAt || fallbackTimestamp),
  };
}

function normalizeBlocks(value: unknown): StudyBlock[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeBlock).filter(Boolean) as StudyBlock[];
}

function normalizeBlock(value: unknown): StudyBlock | null {
    const raw = (value ?? {}) as Record<string, any>;
    const type = STUDY_BLOCK_TYPES.includes(raw.type) || raw.type === 'custom' ? raw.type : 'text';
    const timestamp = nowIso();
    const base = {
      id: String(raw.id || createId('study-block')),
      type,
      createdAt: String(raw.createdAt || timestamp),
      updatedAt: String(raw.updatedAt || raw.createdAt || timestamp),
      settings: normalizeSettings(raw.settings),
      children: normalizeBlocks(raw.children),
      collapsed: Boolean(raw.collapsed),
    };

    if (isContentBlockType(type)) {
      return {
        ...base,
        type,
        content: String(raw.content || ''),
        language: String(raw.language || base.settings.codeLanguage || (type === 'code' ? 'text' : '')),
      } as StudyContentBlock;
    }

    if (type === 'table') {
      return {
        ...base,
        type,
        rows: Array.isArray(raw.rows) ? raw.rows.map((row: any) => Array.isArray(row) ? row.map(String) : []) : [['', '']],
        hasHeader: Boolean(raw.hasHeader),
        columnWidths: Array.isArray(raw.columnWidths) ? raw.columnWidths.map(Number) : undefined,
        cellStyles: raw.cellStyles,
        cellSpans: raw.cellSpans,
        cellMergeBackups: raw.cellMergeBackups,
      } as StudyTableBlock;
    }

    if (type === 'board') {
      return {
        ...base,
        type,
        strokes: Array.isArray(raw.strokes) ? raw.strokes : [],
      } as StudyBoardBlock;
    }

    return base as StudyBlock;
}

function normalizeSettings(value: unknown): StudyBlockSettings {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    headingStyle: ['h1', 'h2', 'h3'].includes(String(source.headingStyle)) ? (source.headingStyle as StudyHeadingStyle) : undefined,
    fontSize: Number(source.fontSize) || undefined,
    textColor: typeof source.textColor === 'string' ? source.textColor : undefined,
    backgroundColor: typeof source.backgroundColor === 'string' ? source.backgroundColor : undefined,
    padding: Number(source.padding) || undefined,
    textAlign: ['left', 'center', 'right'].includes(String(source.textAlign)) ? (source.textAlign as StudyBlockSettings['textAlign']) : undefined,
    codeLanguage: typeof source.codeLanguage === 'string' ? source.codeLanguage : undefined,
    codeWrap: typeof source.codeWrap === 'boolean' ? source.codeWrap : undefined,
    dividerColor: typeof source.dividerColor === 'string' ? source.dividerColor : undefined,
    boardHeight: Number(source.boardHeight) || undefined,
  };
}

function normalizeTemplates(value: any): StudyCustomBlockTemplate[] {
    if (!Array.isArray(value)) return [];
    return value;
}

function defaultContentForType(type: StudyContentBlock['type']) {
    if (type === 'heading') return 'New heading';
    if (type === 'definition') return 'Term: definition';
    if (type === 'problem') return 'Problem statement';
    if (type === 'solution') return 'Solution notes';
    return '';
}

function defaultSettingsForType(type: StudyContentBlock['type']): StudyBlockSettings {
    if (type === 'heading') return { headingStyle: 'h1' };
    if (type === 'code') return { codeLanguage: 'text', codeWrap: true };
    return {};
}

export function getNodeChildren(nodes: StudyNode[], parentId: string | null) {
    return nodes
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function collectNodeDescendants(nodes: StudyNode[], nodeId: string): string[] {
    const result: string[] = [];
    const walk = (parentId: string) => {
      nodes
        .filter((node) => node.parentId === parentId)
        .forEach((node) => {
          result.push(node.id);
          walk(node.id);
        });
    };
    walk(nodeId);
    return result;
}

export function getNodePath(nodes: StudyNode[], nodeId: string | null): StudyNode[] {
    if (!nodeId) return [];
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const path: StudyNode[] = [];
    let current = byId.get(nodeId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return path;
}
