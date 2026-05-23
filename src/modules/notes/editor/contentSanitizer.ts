import { createId } from '../../../shared/utils/idGenerator';
import { getCurrentDrawingData, setCurrentDrawingData } from '../blocks/drawing';
import { DEFAULT_DRAWING_HEIGHT, EMPTY_DOCUMENT, SUPPORTED_BLOCK_TYPES } from './constants';
import type { AnyBlock, AnyPartialBlock } from './types';

export function sanitizeInitialContent(content: unknown): AnyPartialBlock[] {
  if (!Array.isArray(content) || content.length === 0) {
    return [...EMPTY_DOCUMENT] as AnyPartialBlock[];
  }

  const safeBlocks = content.map((block) => sanitizeBlock(block)).filter(Boolean) as AnyPartialBlock[];
  return safeBlocks.length > 0 ? safeBlocks : ([...EMPTY_DOCUMENT] as AnyPartialBlock[]);
}

export function sanitizeBlock(block: unknown): AnyPartialBlock | null {
  if (!block || typeof block !== 'object') {
    return null;
  }

  const source = block as Record<string, unknown>;
  const type = typeof source.type === 'string' ? source.type : 'paragraph';

  if (!SUPPORTED_BLOCK_TYPES.has(type)) {
    return {
      type: 'paragraph',
      content: inlineContentToSafeString(source.content),
    } as any;
  }

  const sanitized: Record<string, unknown> = { type };

  if ('content' in source && source.content !== '') {
    sanitized.content = source.content;
  }

  if (source.props && typeof source.props === 'object') {
    sanitized.props = source.props;
  }

  if (Array.isArray(source.children)) {
    sanitized.children = source.children.map((child) => sanitizeBlock(child)).filter(Boolean);
  }

  return sanitized as AnyPartialBlock;
}

export function prepareInitialEditorContent(blocks: AnyPartialBlock[]): AnyPartialBlock[] {
  return blocks.map((block) => prepareInitialEditorBlock(block));
}

function prepareInitialEditorBlock(block: AnyPartialBlock): AnyPartialBlock {
  const source = block as Record<string, any>;
  const props = source.props && typeof source.props === 'object' ? { ...source.props } : undefined;
  const blockId = typeof source.id === 'string' ? source.id : source.type === 'drawing' ? createId('drawing-block') : undefined;

  if (source.type === 'drawing' && props) {
    const drawingData = String(props.drawingData ?? '');
    if (blockId && drawingData) {
      setCurrentDrawingData(blockId, drawingData);
    }
    delete props.drawingData;
  }

  return {
    ...source,
    ...(blockId ? { id: blockId } : {}),
    ...(props ? { props } : {}),
    ...(Array.isArray(source.children) ? { children: source.children.map((child) => prepareInitialEditorBlock(child as AnyPartialBlock)) } : {}),
  } as AnyPartialBlock;
}

export function mergeDrawingBlockData(blocks: AnyBlock[]): AnyBlock[] {
  return blocks.map((block) => {
    const nextBlock = {
      ...block,
      props:
        block.type === 'drawing'
          ? {
              ...(block.props as Record<string, unknown>),
              drawingData: getCurrentDrawingData(block.id, String((block.props as any).drawingData ?? '')),
            }
          : block.props,
    } as AnyBlock;

    if (Array.isArray(block.children) && block.children.length > 0) {
      nextBlock.children = mergeDrawingBlockData(block.children as AnyBlock[]) as any;
    }

    return nextBlock;
  });
}

export function inlineContentToSafeString(content: unknown): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(inlineContentToSafeString).join('');
  }

  if (typeof content === 'object') {
    const value = content as Record<string, unknown>;

    if (typeof value.text === 'string') {
      return value.text;
    }

    if (Array.isArray(value.content)) {
      return value.content.map(inlineContentToSafeString).join('');
    }
  }

  return '';
}

export function createEmptyBlock(type: string): AnyPartialBlock {
  if (type === 'list') {
    return { type: 'bulletListItem' } as any;
  }
  if (type === 'toggle') {
    return { type: 'toggleListItem' } as any;
  }
  if (type === 'table') {
    return {
      type: 'table',
      content: {
        type: 'tableContent',
        rows: [
          { cells: [[], []] },
          { cells: [[], []] },
        ],
      },
    } as any;
  }
  if (type === 'image') {
    return { type: 'image' } as any;
  }
  if (type === 'divider') {
    return { type: 'divider' } as any;
  }
  if (type === 'markdown') {
    return { type: 'codeBlock', props: { language: 'markdown' } } as any;
  }
  if (type === 'drawing') {
    return { type: 'drawing', props: { strokeColor: '#e8edf5', strokeWidth: 3, canvasHeight: DEFAULT_DRAWING_HEIGHT } } as any;
  }
  return { type } as any;
}
