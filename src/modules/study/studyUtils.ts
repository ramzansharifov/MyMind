import type {
  StudyBlock,
  StudyBlockSettings,
  StudyBlockType,
  StudyBoardStroke,
  StudyContentBlock,
  StudyCustomBlockTemplate,
  StudyData,
  StudyFileBlock,
  StudyMaterial,
  StudyNode,
  StudyNodeType,
  StudyTableBlock,
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
    };
  }

  if (type === 'board') {
    return {
      ...base,
      type,
      strokes: [],
      settings: { boardHeight: 360 },
    };
  }

  if (type === 'file') {
    return {
      ...base,
      type,
      fileId: '',
      fileName: '',
      note: '',
    };
  }

  if (type === 'divider') {
    return {
      ...base,
      type,
      settings: { dividerColor: 'var(--border)' },
    };
  }

  return {
    ...base,
    type: 'custom',
    templateId: '',
    values: {},
  };
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
  if (!nodeId) {
    return [];
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path: StudyNode[] = [];
  let current = byId.get(nodeId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function findBlockById(blocks: StudyBlock[], blockId: string | null): StudyBlock | null {
  if (!blockId) {
    return null;
  }
  for (const block of blocks) {
    if (block.id === blockId) {
      return block;
    }
    const child = findBlockById(block.children ?? [], blockId);
    if (child) {
      return child;
    }
  }
  return null;
}

export function updateBlockTree(blocks: StudyBlock[], blockId: string, update: (block: StudyBlock) => StudyBlock): StudyBlock[] {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return { ...update(block), updatedAt: nowIso() };
    }
    return { ...block, children: updateBlockTree(block.children ?? [], blockId, update) };
  });
}

export function deleteBlockFromTree(blocks: StudyBlock[], blockId: string): StudyBlock[] {
  return blocks
    .filter((block) => block.id !== blockId)
    .map((block) => ({ ...block, children: deleteBlockFromTree(block.children ?? [], blockId) }));
}

export function duplicateBlockInTree(blocks: StudyBlock[], blockId: string): StudyBlock[] {
  const result: StudyBlock[] = [];
  for (const block of blocks) {
    result.push({ ...block, children: duplicateBlockInTree(block.children ?? [], blockId) });
    if (block.id === blockId) {
      result.push(cloneStudyBlock(block));
    }
  }
  return result;
}

export function moveBlockInTree(blocks: StudyBlock[], blockId: string, direction: -1 | 1): StudyBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index !== -1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) {
      return blocks;
    }
    const next = [...blocks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return next;
  }
  return blocks.map((block) => ({ ...block, children: moveBlockInTree(block.children ?? [], blockId, direction) }));
}

export function nestBlockIntoPreviousSibling(blocks: StudyBlock[], blockId: string): StudyBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index > 0) {
    const moving = blocks[index];
    const previous = blocks[index - 1];
    return blocks
      .filter((block) => block.id !== blockId)
      .map((block) => (block.id === previous.id ? { ...block, children: [...(block.children ?? []), moving] } : block));
  }
  return blocks.map((block) => ({ ...block, children: nestBlockIntoPreviousSibling(block.children ?? [], blockId) }));
}

export function unnestBlockFromParent(blocks: StudyBlock[], blockId: string): StudyBlock[] {
  const result: StudyBlock[] = [];
  for (const block of blocks) {
    const childIndex = (block.children ?? []).findIndex((child) => child.id === blockId);
    if (childIndex !== -1) {
      const children = [...(block.children ?? [])];
      const [moving] = children.splice(childIndex, 1);
      result.push({ ...block, children });
      result.push(moving);
    } else {
      result.push({ ...block, children: unnestBlockFromParent(block.children ?? [], blockId) });
    }
  }
  return result;
}

export function normalizeStudyData(value: unknown): StudyData {
  const source = (value ?? {}) as Partial<StudyData> & {
    folders?: Array<{ id?: string; title?: string; description?: string; createdAt?: string; updatedAt?: string }>;
    materials?: Array<Record<string, unknown>>;
  };

  if (Array.isArray(source.nodes)) {
    return normalizeCurrentStudyData(source);
  }

  return normalizeLegacyStudyData(source);
}

export function isContentBlock(block: StudyBlock): block is StudyContentBlock {
  return isContentBlockType(block.type);
}

export function isContentBlockType(type: StudyBlockType): type is StudyContentBlock['type'] {
  return ['heading', 'text', 'latex', 'markdown', 'code', 'definition', 'problem', 'solution'].includes(type);
}

function normalizeCurrentStudyData(source: Partial<StudyData>): StudyData {
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

  const nodeIds = new Set(nodes.map((node) => node.id));
  const materialNodes = new Set(nodes.filter((node) => node.type === 'material').map((node) => node.id));
  const materials = (Array.isArray(source.materials) ? source.materials : [])
    .map((material) => normalizeMaterial(material, timestamp))
    .filter((material) => materialNodes.has(material.nodeId));

  const missingMaterials = nodes
    .filter((node) => node.type === 'material' && !materials.some((material) => material.nodeId === node.id))
    .map((node) => createStudyMaterial(node.id, node.title));

  const selectedNodeId = source.selectedNodeId && nodeIds.has(source.selectedNodeId) ? source.selectedNodeId : nodes[0]?.id ?? null;

  return {
    selectedNodeId,
    nodes,
    materials: [...materials, ...missingMaterials],
    customBlockTemplates: normalizeTemplates(source.customBlockTemplates),
  };
}

function normalizeLegacyStudyData(source: {
  folders?: Array<{ id?: string; title?: string; description?: string; createdAt?: string; updatedAt?: string }>;
  materials?: Array<Record<string, unknown>>;
}): StudyData {
  const timestamp = nowIso();
  const folders = Array.isArray(source.folders) ? source.folders : [];
  const legacyMaterials = Array.isArray(source.materials) ? source.materials : [];

  const folderNodes: StudyNode[] = folders.map((folder, index) => ({
    id: folder.id || createId('study-folder'),
    type: 'folder',
    title: folder.title || 'New folder',
    parentId: null,
    order: index,
    createdAt: folder.createdAt ?? timestamp,
    updatedAt: folder.updatedAt ?? folder.createdAt ?? timestamp,
  }));

  const folderIds = new Set(folderNodes.map((node) => node.id));
  const materialNodes: StudyNode[] = legacyMaterials.map((material, index) => {
    const id = stringValue(material.id) || createId('study-material');
    const parentId = stringValue(material.folderId);
    return {
      id,
      type: 'material',
      title: stringValue(material.title) || 'New material',
      parentId: parentId && folderIds.has(parentId) ? parentId : null,
      order: index,
      createdAt: stringValue(material.createdAt) || timestamp,
      updatedAt: stringValue(material.updatedAt) || stringValue(material.createdAt) || timestamp,
    };
  });

  const materials: StudyMaterial[] = legacyMaterials.map((material, index) => {
    const node = materialNodes[index];
    return normalizeMaterial({ ...material, nodeId: node.id }, timestamp);
  });

  return {
    selectedNodeId: materialNodes[0]?.id ?? folderNodes[0]?.id ?? null,
    nodes: [...folderNodes, ...materialNodes],
    materials,
    customBlockTemplates: [],
  };
}

function normalizeMaterial(value: unknown, fallbackTimestamp: string): StudyMaterial {
  const material = (value ?? {}) as Record<string, unknown>;
  const nodeId = stringValue(material.nodeId) || stringValue(material.id) || createId('study-material');
  return {
    id: stringValue(material.id) || nodeId,
    nodeId,
    title: stringValue(material.title) || 'New material',
    description: stringValue(material.description),
    tags: Array.isArray(material.tags) ? material.tags.map(String).filter(Boolean) : [],
    blocks: normalizeBlocks(material.blocks),
    createdAt: stringValue(material.createdAt) || fallbackTimestamp,
    updatedAt: stringValue(material.updatedAt) || stringValue(material.createdAt) || fallbackTimestamp,
  };
}

function normalizeBlocks(value: unknown): StudyBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeBlock).filter(Boolean) as StudyBlock[];
}

function normalizeBlock(value: unknown): StudyBlock | null {
  const raw = (value ?? {}) as Record<string, unknown>;
  const type = STUDY_BLOCK_TYPES.includes(raw.type as StudyBlockType) || raw.type === 'custom' ? (raw.type as StudyBlockType) : 'text';
  const timestamp = nowIso();
  const base = {
    id: stringValue(raw.id) || createId('study-block'),
    type,
    createdAt: stringValue(raw.createdAt) || timestamp,
    updatedAt: stringValue(raw.updatedAt) || stringValue(raw.createdAt) || timestamp,
    settings: normalizeSettings(raw.settings),
    children: normalizeBlocks(raw.children),
    collapsed: Boolean(raw.collapsed),
  };

  if (isContentBlockType(type)) {
    return {
      ...base,
      type,
      content: stringValue(raw.content),
      language: stringValue(raw.language) || stringValue(base.settings.codeLanguage) || (type === 'code' ? 'text' : undefined),
      settings: { ...defaultSettingsForType(type), ...base.settings },
    };
  }

  if (type === 'table') {
    return {
      ...base,
      type,
      rows: normalizeRows(raw.rows),
      hasHeader: Boolean(raw.hasHeader),
      columnWidths: Array.isArray(raw.columnWidths) ? raw.columnWidths.map(Number).filter(Number.isFinite) : undefined,
      cellStyles: normalizeRecord(raw.cellStyles) as Record<string, StudyBlockSettings> | undefined,
      cellSpans: normalizeRecord(raw.cellSpans) as StudyTableBlock['cellSpans'],
      cellMergeBackups: normalizeRecord(raw.cellMergeBackups) as StudyTableBlock['cellMergeBackups'],
    };
  }

  if (type === 'board') {
    return {
      ...base,
      type,
      strokes: normalizeStrokes(raw.strokes),
      settings: { boardHeight: 360, ...base.settings },
    };
  }

  if (type === 'file') {
    return {
      ...base,
      type,
      fileId: stringValue(raw.fileId),
      fileName: stringValue(raw.fileName) || stringValue(raw.name),
      note: stringValue(raw.note),
      url: stringValue(raw.url) || undefined,
      mimeType: stringValue(raw.mimeType) || undefined,
      size: Number(raw.size) || undefined,
    } satisfies StudyFileBlock;
  }

  if (type === 'divider') {
    return {
      ...base,
      type,
      settings: { dividerColor: 'var(--border)', ...base.settings },
    };
  }

  return {
    ...base,
    type: 'custom',
    templateId: stringValue(raw.templateId),
    values: normalizeCustomValues(raw.values),
  };
}

function normalizeRows(value: unknown): string[][] {
  if (!Array.isArray(value)) {
    return [
      ['', ''],
      ['', ''],
    ];
  }
  return value.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : ['']));
}

function normalizeStrokes(value: unknown): StudyBoardStroke[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((stroke) => {
    const raw = (stroke ?? {}) as Record<string, unknown>;
    return {
      id: stringValue(raw.id) || createId('study-stroke'),
      color: stringValue(raw.color) || '#e5eef8',
      width: Number(raw.width) || 3,
      points: Array.isArray(raw.points)
        ? raw.points.map((point) => {
            const rawPoint = (point ?? {}) as Record<string, unknown>;
            return { x: Number(rawPoint.x) || 0, y: Number(rawPoint.y) || 0 };
          })
        : [],
    };
  });
}

function normalizeSettings(value: unknown): StudyBlockSettings {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    headingStyle: [1, 2, 3].includes(Number(source.headingStyle)) ? (Number(source.headingStyle) as 1 | 2 | 3) : undefined,
    fontSize: Number(source.fontSize) || undefined,
    textColor: stringValue(source.textColor) || undefined,
    backgroundColor: stringValue(source.backgroundColor) || undefined,
    padding: Number(source.padding) || undefined,
    align: ['left', 'center', 'right'].includes(String(source.align)) ? (String(source.align) as StudyBlockSettings['align']) : undefined,
    codeLanguage: stringValue(source.codeLanguage) || undefined,
    codeWrap: typeof source.codeWrap === 'boolean' ? source.codeWrap : undefined,
    dividerColor: stringValue(source.dividerColor) || undefined,
    boardHeight: Number(source.boardHeight) || undefined,
  };
}

function normalizeTemplates(value: unknown): StudyCustomBlockTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((template) => {
    const raw = (template ?? {}) as Record<string, unknown>;
    const timestamp = nowIso();
    return {
      id: stringValue(raw.id) || createId('study-template'),
      title: stringValue(raw.title) || 'Custom block',
      description: stringValue(raw.description),
      accentColor: stringValue(raw.accentColor) || 'var(--accent)',
      fields: Array.isArray(raw.fields)
        ? raw.fields.map((field) => {
            const rawField = (field ?? {}) as Record<string, unknown>;
            return {
              id: stringValue(rawField.id) || createId('study-field'),
              label: stringValue(rawField.label) || 'Field',
              type: ['text', 'long_text', 'latex', 'number', 'checkbox', 'select', 'date', 'link'].includes(String(rawField.type))
                ? (String(rawField.type) as StudyCustomBlockTemplate['fields'][number]['type'])
                : 'text',
              placeholder: stringValue(rawField.placeholder),
              options: Array.isArray(rawField.options) ? rawField.options.map(String) : undefined,
              defaultValue:
                typeof rawField.defaultValue === 'string' ||
                typeof rawField.defaultValue === 'number' ||
                typeof rawField.defaultValue === 'boolean'
                  ? rawField.defaultValue
                  : undefined,
            };
          })
        : [],
      createdAt: stringValue(raw.createdAt) || timestamp,
      updatedAt: stringValue(raw.updatedAt) || stringValue(raw.createdAt) || timestamp,
    };
  });
}

function normalizeCustomValues(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      typeof entry === 'boolean' || typeof entry === 'number' ? entry : String(entry ?? ''),
    ]),
  );
}

function normalizeRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function defaultContentForType(type: StudyContentBlock['type']) {
  if (type === 'heading') {
    return 'New heading';
  }
  if (type === 'definition') {
    return 'Term: definition';
  }
  if (type === 'problem') {
    return 'Problem statement';
  }
  if (type === 'solution') {
    return 'Solution notes';
  }
  return '';
}

function defaultSettingsForType(type: StudyContentBlock['type']): StudyBlockSettings {
  if (type === 'heading') {
    return { headingStyle: 1 };
  }
  if (type === 'code') {
    return { codeLanguage: 'text', codeWrap: true };
  }
  return {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}
