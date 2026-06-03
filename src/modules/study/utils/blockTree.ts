import type { StudyBlock } from "../types";
import { cloneStudyBlock } from "../studyUtils";

export interface BlockTreeResult {
  blocks: StudyBlock[];
  changed: boolean;
}

export function findBlockById(blocks: StudyBlock[], blockId: string | null): StudyBlock | null {
  if (!blockId) return null;
  for (const block of blocks) {
    if (block.id === blockId) {
      return block;
    }

    const found = findBlockById(block.children ?? [], blockId);

    if (found) {
      return found;
    }
  }

  return null;
}

export function updateBlockTree(
  blocks: StudyBlock[],
  blockId: string,
  updater: (block: StudyBlock) => StudyBlock
): StudyBlock[] {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return updater(block);
    }

    return {
      ...block,
      children: updateBlockTree(block.children ?? [], blockId, updater),
    };
  });
}

export function deleteBlockFromTree(blocks: StudyBlock[], blockId: string): StudyBlock[] {
  return blocks
    .filter((block) => block.id !== blockId)
    .map((block) => ({
      ...block,
      children: deleteBlockFromTree(block.children ?? [], blockId),
    }));
}

export function duplicateBlockInTree(blocks: StudyBlock[], blockId: string): StudyBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);

  if (index >= 0) {
    return [
      ...blocks.slice(0, index + 1),
      cloneStudyBlock(blocks[index]),
      ...blocks.slice(index + 1),
    ];
  }

  return blocks.map((block) => ({
    ...block,
    children: duplicateBlockInTree(block.children ?? [], blockId),
  }));
}

export function moveBlockInTree(
  blocks: StudyBlock[],
  blockId: string,
  direction: -1 | 1
): StudyBlock[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  const targetIndex = index + direction;

  if (index >= 0) {
    if (targetIndex < 0 || targetIndex >= blocks.length) {
      return blocks;
    }

    const next = [...blocks];
    const current = next[index];

    next[index] = next[targetIndex];
    next[targetIndex] = current;

    return next;
  }

  return blocks.map((block) => ({
    ...block,
    children: moveBlockInTree(block.children ?? [], blockId, direction),
  }));
}

export function nestBlockIntoPreviousSibling(
  blocks: StudyBlock[],
  blockId: string
): BlockTreeResult {
  const index = blocks.findIndex((block) => block.id === blockId);

  if (index >= 0) {
    if (index === 0) {
      return {
        blocks,
        changed: false,
      };
    }

    const next = [...blocks];
    const currentBlock = next[index];
    const previousBlock = next[index - 1];

    next[index - 1] = {
      ...previousBlock,
      children: [...(previousBlock.children ?? []), currentBlock],
    };

    next.splice(index, 1);

    return {
      blocks: next,
      changed: true,
    };
  }

  let changed = false;

  const nextBlocks = blocks.map((block) => {
    const result = nestBlockIntoPreviousSibling(block.children ?? [], blockId);

    if (result.changed) {
      changed = true;

      return {
        ...block,
        children: result.blocks,
      };
    }

    return block;
  });

  return {
    blocks: changed ? nextBlocks : blocks,
    changed,
  };
}

export function findPreviousSiblingId(
  blocks: StudyBlock[],
  blockId: string
): string | null {
  const index = blocks.findIndex((block) => block.id === blockId);

  if (index > 0) {
    return blocks[index - 1].id;
  }

  for (const block of blocks) {
    const found = findPreviousSiblingId(block.children ?? [], blockId);

    if (found) {
      return found;
    }
  }

  return null;
}

export function unnestBlockFromParent(
  blocks: StudyBlock[],
  blockId: string
): BlockTreeResult {
  for (let parentIndex = 0; parentIndex < blocks.length; parentIndex += 1) {
    const parentBlock = blocks[parentIndex];
    const children = parentBlock.children ?? [];
    const childIndex = children.findIndex((child) => child.id === blockId);

    if (childIndex >= 0) {
      const childBlock = children[childIndex];
      const nextChildren = children.filter((child) => child.id !== blockId);
      const updatedParent: StudyBlock = {
        ...parentBlock,
        children: nextChildren,
      };

      return {
        blocks: [
          ...blocks.slice(0, parentIndex),
          updatedParent,
          childBlock,
          ...blocks.slice(parentIndex + 1),
        ],
        changed: true,
      };
    }
  }

  let changed = false;

  const nextBlocks = blocks.map((block) => {
    const result = unnestBlockFromParent(block.children ?? [], blockId);

    if (result.changed) {
      changed = true;

      return {
        ...block,
        children: result.blocks,
      };
    }

    return block;
  });

  return {
    blocks: changed ? nextBlocks : blocks,
    changed,
  };
}
