import type { StudyBlock } from '../types';

export interface StudyTocItem {
  id: string;
  title: string;
  level: number;
}

export function collectStudyTocItems(blocks: StudyBlock[], collapsedBlockIds: Set<string> = new Set(), nestingLevel = 0): StudyTocItem[] {
  return blocks.flatMap((block) => {
    const ownItems = block.type === 'heading'
      ? [{
          id: block.id,
          title: block.content.replace(/\s+/g, ' ').trim() || 'Untitled heading',
          level: (function() {
              const style = block.settings?.headingStyle;
              if (style === 'h1') return 1;
              if (style === 'h2') return 2;
              if (style === 'h3') return 3;
              return Math.min(3, nestingLevel + 1);
          })(),
        }]
      : [];

    if (collapsedBlockIds.has(block.id)) {
      return ownItems;
    }

    return [...ownItems, ...collectStudyTocItems(block.children ?? [], collapsedBlockIds, nestingLevel + 1)];
  });
}

export function scrollToStudyReadBlock(blockId: string) {
  document.querySelector(`[data-study-read-block-id="${blockId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
