import { LIST_BLOCK_TYPES } from './constants';
import type { AnyBlock, AnyEditor, AnyPartialBlock } from './types';

export function insertBlock(editor: AnyEditor, block: AnyPartialBlock) {
  const reference = getCurrentBlock(editor) ?? editor.document[editor.document.length - 1];
  if (reference) {
    editor.insertBlocks([block], reference, 'after');
    return;
  }
  editor.replaceBlocks(editor.document as AnyBlock[], [block]);
}

export function insertHardBreak(editor: AnyEditor) {
  const currentBlock = getCurrentBlock(editor);
  if (!currentBlock || currentBlock.content === undefined) {
    return false;
  }

  try {
    editor.focus();
    editor.transact((tr) => {
      const marks =
        tr.storedMarks ??
        tr.selection.$head
          .marks()
          .filter((mark: any) => (editor as any).extensionManager?.splittableMarks?.includes(mark.type.name));

      tr.replaceSelectionWith(tr.doc.type.schema.nodes.hardBreak.create()).ensureMarks(marks);
    });
    return true;
  } catch {
    return false;
  }
}

export function getCurrentBlock(editor: AnyEditor): AnyBlock | null {
  try {
    return editor.getTextCursorPosition().block as AnyBlock;
  } catch {
    return (editor.document[0] as AnyBlock | undefined) ?? null;
  }
}

export function findBlockById(blocks: AnyBlock[], id: string): AnyBlock | null {
  for (const block of blocks) {
    if (block.id === id) {
      return block;
    }
    const child = findBlockById((block.children ?? []) as AnyBlock[], id);
    if (child) {
      return child;
    }
  }
  return null;
}

export function getContiguousListGroup(blocks: AnyBlock[], id: string) {
  const match = findBlockSiblings(blocks, id);
  if (!match || !LIST_BLOCK_TYPES.has(match.siblings[match.index]?.type)) {
    return [];
  }

  let start = match.index;
  while (start > 0 && LIST_BLOCK_TYPES.has(match.siblings[start - 1].type)) {
    start -= 1;
  }

  let end = match.index;
  while (end + 1 < match.siblings.length && LIST_BLOCK_TYPES.has(match.siblings[end + 1].type)) {
    end += 1;
  }

  return match.siblings.slice(start, end + 1);
}

function findBlockSiblings(blocks: AnyBlock[], id: string): { siblings: AnyBlock[]; index: number } | null {
  const index = blocks.findIndex((block) => block.id === id);
  if (index >= 0) {
    return { siblings: blocks, index };
  }

  for (const block of blocks) {
    const match = findBlockSiblings((block.children ?? []) as AnyBlock[], id);
    if (match) {
      return match;
    }
  }

  return null;
}

export function stripBlockIds(block: AnyPartialBlock): AnyPartialBlock {
  if (!block || typeof block !== 'object') {
    return block;
  }
  const cloned = { ...block } as Record<string, unknown>;
  delete cloned.id;
  if (Array.isArray(cloned.children)) {
    cloned.children = cloned.children.map((child) => stripBlockIds(child as AnyPartialBlock));
  }
  return cloned as AnyPartialBlock;
}

export function flattenBlocks(blocks: AnyBlock[]): AnyBlock[] {
  const output: AnyBlock[] = [];

  for (const block of blocks) {
    output.push(block);
    if (Array.isArray(block.children) && block.children.length > 0) {
      output.push(...flattenBlocks(block.children as AnyBlock[]));
    }
  }

  return output;
}

export function countVisualBlocks(blocks: AnyBlock[]) {
  let count = 0;
  let previousType = '';

  for (const block of blocks) {
    const isContinuation = LIST_BLOCK_TYPES.has(block.type) && block.type === previousType;
    if (!isContinuation) {
      count += 1;
    }
    previousType = block.type;
  }

  return count;
}

export function getSidebarBlockTypeValue(block: AnyBlock) {
  if (block.type === 'codeBlock' && ['markdown', 'md'].includes(String((block.props as any).language ?? '').toLowerCase())) {
    return 'markdown';
  }

  if (LIST_BLOCK_TYPES.has(block.type)) {
    return 'list';
  }

  if (block.type === 'toggleListItem' || (block.type === 'heading' && (block.props as any).isToggleable)) {
    return 'toggle';
  }

  if (block.type === 'heading') {
    return `heading-${String((block.props as any).level ?? 1)}`;
  }

  return block.type;
}

export function getCommonBlockProps(block: AnyBlock) {
  const props = block.props as Record<string, unknown>;
  return {
    textColor: props.textColor ?? 'default',
    backgroundColor: props.backgroundColor ?? 'default',
    textAlignment: props.textAlignment ?? 'left',
  };
}

export function supportsTextColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout'].includes(type);
}

export function supportsBackgroundColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout', 'image'].includes(type);
}
