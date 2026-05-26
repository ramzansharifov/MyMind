import { LIST_BLOCK_TYPES } from '../editor/constants';
import { flattenBlocks } from '../editor/blockActions';
import type { AnyBlock, AnyEditor } from '../editor/types';
import { clampNumber } from './noteEditorFormatting';

export const IMAGE_MIN_WIDTH = 96;
export const IMAGE_FALLBACK_MAX_WIDTH = 1200;

const LIGHTWEIGHT_EDITOR_MEDIA_BLOCK_TYPES = new Set(['image', 'video', 'audio', 'file']);

export function syncVisualListGroups(editor: AnyEditor) {
  const root = document.querySelector('.mymind-blocknote-editor');
  if (!root) {
    return;
  }

  const blockOuters = Array.from(root.querySelectorAll<HTMLElement>('.bn-block-outer[data-id]'));
  const blockById = new Map((editor.document as AnyBlock[]).map((block, index) => [block.id, { block, index }]));

  for (const outer of blockOuters) {
    outer.classList.remove('note-list-group-item', 'note-list-group-continuation', 'note-list-group-has-next');

    const id = outer.dataset.id;
    const entry = id ? blockById.get(id) : undefined;
    if (!entry || !LIST_BLOCK_TYPES.has(entry.block.type)) {
      continue;
    }

    const blocks = editor.document as AnyBlock[];
    const previous = blocks[entry.index - 1];
    const next = blocks[entry.index + 1];
    const continuesPrevious = Boolean(previous && previous.type === entry.block.type);
    const hasNext = Boolean(next && next.type === entry.block.type);

    outer.classList.add('note-list-group-item');
    if (continuesPrevious) {
      outer.classList.add('note-list-group-continuation');
    }
    if (hasNext) {
      outer.classList.add('note-list-group-has-next');
    }
  }
}

export function syncActiveEditorBlock(blockId: string | null) {
  const root = document.querySelector('.mymind-blocknote-editor');
  if (!root) {
    return;
  }

  const blockOuters = Array.from(root.querySelectorAll<HTMLElement>('.bn-block-outer[data-id]'));
  for (const outer of blockOuters) {
    outer.classList.toggle('note-active-block', Boolean(blockId && outer.dataset.id === blockId));
  }
}

export function enforceLightweightMediaPreviews(editor: AnyEditor) {
  for (const block of flattenBlocks(editor.document as AnyBlock[])) {
    if (!LIGHTWEIGHT_EDITOR_MEDIA_BLOCK_TYPES.has(block.type)) {
      continue;
    }

    const props = (block.props ?? {}) as Record<string, unknown>;
    if (props.showPreview === false) {
      continue;
    }

    editor.updateBlock(block, {
      props: {
        ...props,
        showPreview: false,
      },
    } as any);
  }
}

export function clampImagePreviewWidths(editor: AnyEditor) {
  const root = document.querySelector<HTMLElement>('.mymind-blocknote-editor');
  if (!root) {
    return;
  }

  for (const block of flattenBlocks(editor.document as AnyBlock[])) {
    if (block.type !== 'image') {
      continue;
    }

    const outer = root.querySelector<HTMLElement>(`.bn-block-outer[data-id="${cssEscape(block.id)}"]`);
    const blockNode = outer?.querySelector<HTMLElement>('.bn-block');
    const content = outer?.querySelector<HTMLElement>('.bn-block-content[data-content-type="image"]');
    const wrapper = content?.querySelector<HTMLElement>('.bn-file-block-content-wrapper');
    const maxWidth = getBlockMediaMaxWidth(root, outer, blockNode, content);
    if (maxWidth <= 0) {
      continue;
    }

    const previewWidth = Number((block.props as Record<string, unknown>).previewWidth);
    const renderedWidth = Math.ceil(wrapper?.getBoundingClientRect().width ?? 0);
    const nextWidth = Number.isFinite(previewWidth) ? Math.min(previewWidth, maxWidth) : maxWidth;
    if (Number.isFinite(previewWidth) && previewWidth <= maxWidth && renderedWidth <= maxWidth + 1) {
      continue;
    }

    editor.updateBlock(block, {
      props: {
        ...(block.props as Record<string, unknown>),
        previewWidth: nextWidth,
      },
    } as any);
  }
}

export function getImageBlockMaxWidth(blockId: string) {
  const root = document.querySelector<HTMLElement>('.mymind-blocknote-editor');
  if (!root) {
    return IMAGE_FALLBACK_MAX_WIDTH;
  }

  const outer = root.querySelector<HTMLElement>(`.bn-block-outer[data-id="${cssEscape(blockId)}"]`);
  const blockNode = outer?.querySelector<HTMLElement>('.bn-block');
  const content = outer?.querySelector<HTMLElement>('.bn-block-content[data-content-type="image"]');
  const maxWidth = getBlockMediaMaxWidth(root, outer, blockNode, content);
  return maxWidth > 0 ? Math.max(IMAGE_MIN_WIDTH, maxWidth) : IMAGE_FALLBACK_MAX_WIDTH;
}

function getBlockMediaMaxWidth(root: HTMLElement, outer?: HTMLElement | null, blockNode?: HTMLElement | null, content?: HTMLElement | null) {
  const widths = [root, outer, blockNode, content]
    .filter((element): element is HTMLElement => Boolean(element))
    .map((element) => Math.floor(element.getBoundingClientRect().width))
    .filter((width) => Number.isFinite(width) && width > 0);

  if (widths.length === 0) {
    return 0;
  }

  const horizontalPadding = content ? getHorizontalPadding(content) : 0;
  return Math.max(64, Math.floor(Math.min(...widths) - horizontalPadding));
}

function getHorizontalPadding(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const left = Number.parseFloat(styles.paddingLeft) || 0;
  const right = Number.parseFloat(styles.paddingRight) || 0;
  return left + right;
}

function cssEscape(value: string) {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}

export { clampNumber };
