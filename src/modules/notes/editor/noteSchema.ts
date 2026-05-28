import { BlockNoteSchema, createStyleSpec, defaultBlockSpecs, defaultStyleSpecs } from '@blocknote/core';
import { dividerBlockSpec } from '../blocks/divider';
import { drawingBlockSpec } from '../blocks/drawing';
import { BLOCKS_WITH_LIBRARY_ENTER } from './constants';

function textSizeToCss(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? `${numeric}px` : value;
}

const textSizeStyleSpec = createStyleSpec(
  {
    type: 'textSize',
    propSchema: 'string',
  },
  {
    render: (value) => {
      const span = document.createElement('span');
      if (value) {
        span.style.fontSize = textSizeToCss(value);
      }
      return { dom: span, contentDOM: span };
    },
    toExternalHTML: (value) => {
      const span = document.createElement('span');
      if (value) {
        span.style.fontSize = textSizeToCss(value);
      }
      return { dom: span, contentDOM: span };
    },
    parse: (element) => {
      const fontSize = element.style.fontSize;
      if (!fontSize) {
        return undefined;
      }
      const numeric = Number.parseFloat(fontSize);
      return Number.isFinite(numeric) ? String(Math.round(numeric)) : fontSize;
    },
  },
);

const noteBlockSpecs = Object.fromEntries(
  Object.entries(defaultBlockSpecs).map(([name, spec]) => {
    if ((spec as any).config?.content !== 'inline' || name === 'codeBlock' || BLOCKS_WITH_LIBRARY_ENTER.has(name)) {
      return [name, spec];
    }

    const nextSpec = {
      ...(spec as any),
      implementation: {
        ...(spec as any).implementation,
        meta: {
          ...((spec as any).implementation?.meta ?? {}),
          hardBreakShortcut: 'enter',
        },
      },
    };

    return [name, nextSpec];
  }),
) as typeof defaultBlockSpecs;

export const noteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...noteBlockSpecs,
    divider: dividerBlockSpec(),
    drawing: drawingBlockSpec(),
  },
  styleSpecs: {
    ...defaultStyleSpecs,
    textSize: textSizeStyleSpec,
  },
});
