import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { drawingBlockSpec } from '../blocks/drawing';
import { BLOCKS_WITH_LIBRARY_ENTER } from './constants';

const noteBlockSpecs = Object.fromEntries(
  Object.entries(defaultBlockSpecs).map(([name, spec]) => {
    if ((spec as any).config?.content !== 'inline' || name === 'codeBlock' || BLOCKS_WITH_LIBRARY_ENTER.has(name)) {
      return [name, spec];
    }

    return [
      name,
      {
        ...(spec as any),
        implementation: {
          ...(spec as any).implementation,
          meta: {
            ...((spec as any).implementation?.meta ?? {}),
            hardBreakShortcut: 'enter',
          },
        },
      },
    ];
  }),
) as typeof defaultBlockSpecs;

export const noteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...noteBlockSpecs,
    drawing: drawingBlockSpec(),
  },
});
