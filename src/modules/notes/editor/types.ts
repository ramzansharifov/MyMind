import type { Block, BlockNoteEditor, PartialBlock } from '@blocknote/core';

export type NoteMode = 'read' | 'edit';
export type AnyEditor = BlockNoteEditor<any, any, any>;
export type AnyBlock = Block<any, any, any>;
export type AnyPartialBlock = PartialBlock<any, any, any>;
