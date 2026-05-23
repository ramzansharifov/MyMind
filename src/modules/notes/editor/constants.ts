export const LIST_BLOCK_TYPE_NAMES = ['bulletListItem', 'numberedListItem', 'checkListItem'];
export const BLOCKS_WITH_LIBRARY_ENTER = new Set([...LIST_BLOCK_TYPE_NAMES, 'toggleListItem']);

export const EMPTY_DOCUMENT = [{ type: 'paragraph' }] as const;

export const COLOR_PRESETS = ['default', 'gray', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const;
export type BlockNoteColor = (typeof COLOR_PRESETS)[number];

export const DRAWING_COLOR_PRESETS = ['#e8edf5', '#f6c6c6', '#ffd8a8', '#f7e08c', '#a8e6cf', '#9ed9d5', '#b8c7ff', '#d6b4f4'] as const;
export const DRAWING_WIDTH_PRESETS = [2, 3, 5, 8, 12] as const;
export const DEFAULT_DRAWING_HEIGHT = 420;

export const SUPPORTED_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'quote',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
  'divider',
  'table',
  'image',
  'video',
  'audio',
  'file',
  'codeBlock',
  'drawing',
]);

export const LIST_BLOCK_TYPES = new Set(LIST_BLOCK_TYPE_NAMES);
export const TOGGLE_HEADING_LEVELS = [1, 2, 3] as const;
