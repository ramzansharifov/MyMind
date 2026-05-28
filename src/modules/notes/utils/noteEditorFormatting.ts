import type { AnyBlock } from '../editor/types';
import { COLOR_PRESETS, LIST_BLOCK_TYPES, TEXT_SIZE_BLOCK_TYPES, TEXT_SIZE_DEFAULT, TEXT_SIZE_MAX, TEXT_SIZE_MIN, type BlockNoteColor } from '../editor/constants';

export function supportsTextColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout'].includes(type);
}

export function supportsBackgroundColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout', 'image'].includes(type);
}

export function supportsTextSize(type: string) {
  return TEXT_SIZE_BLOCK_TYPES.has(type);
}

export function getSidebarBlockTypeValue(block: AnyBlock) {
  if (block.type === 'codeBlock' && ['markdown', 'md'].includes(String((block.props as Record<string, unknown>).language ?? '').toLowerCase())) {
    return 'markdown';
  }

  if (LIST_BLOCK_TYPES.has(block.type)) {
    return 'list';
  }

  if (block.type === 'toggleListItem' || (block.type === 'heading' && (block.props as Record<string, unknown>).isToggleable)) {
    return 'toggle';
  }

  if (block.type === 'heading') {
    return `heading-${String((block.props as Record<string, unknown>).level ?? 1)}`;
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

export function colorLabel(value: BlockNoteColor) {
  const labels: Record<BlockNoteColor, string> = {
    default: 'По умолчанию',
    gray: 'Серый',
    brown: 'Коричневый',
    red: 'Красный',
    orange: 'Оранжевый',
    yellow: 'Жёлтый',
    green: 'Зелёный',
    blue: 'Синий',
    purple: 'Фиолетовый',
    pink: 'Розовый',
  };
  return labels[value];
}

export function resolveCssColor(value: unknown, kind: 'text' | 'background' = 'background') {
  if (!value || value === 'default') {
    return kind === 'text' ? 'var(--text)' : 'var(--surface-soft)';
  }

  if (typeof value === 'string' && COLOR_PRESETS.includes(value as BlockNoteColor)) {
    return `var(--bn-colors-highlights-${value}-${kind})`;
  }

  return String(value);
}

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function normalizeTextSize(value: unknown) {
  const textSize = Number(value);
  if (!Number.isFinite(textSize) || textSize <= 0) {
    return '';
  }

  return String(Math.round(clampNumber(textSize, TEXT_SIZE_MIN, TEXT_SIZE_MAX)));
}

export function getBlockTextSizeValue(block: AnyBlock) {
  return normalizeTextSize((block.props as Record<string, unknown>).textSize) || getInlineTextSizeValue(block.content);
}

export function getEffectiveTextSize(value: unknown) {
  const normalized = normalizeTextSize(value);
  return normalized ? Number(normalized) : TEXT_SIZE_DEFAULT;
}

export function getInlineTextSizeValue(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }

  for (const item of content) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const value = item as Record<string, any>;
    const textSize = normalizeTextSize(value.styles?.textSize);
    if (textSize) {
      return textSize;
    }

    const nestedTextSize = getInlineTextSizeValue(value.content);
    if (nestedTextSize) {
      return nestedTextSize;
    }
  }

  return '';
}

export function applyTextSizeToInlineContent(content: unknown, value: unknown): unknown {
  const textSize = normalizeTextSize(value);

  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content, styles: textSize ? { textSize } : {} }] : content;
  }

  if (!Array.isArray(content)) {
    return content;
  }

  return content.map((item) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const next = { ...(item as Record<string, any>) };

    if (typeof next.text === 'string') {
      const styles = { ...(next.styles ?? {}) };
      if (textSize) {
        styles.textSize = textSize;
      } else {
        delete styles.textSize;
      }
      next.styles = styles;
    }

    if (Array.isArray(next.content)) {
      next.content = applyTextSizeToInlineContent(next.content, textSize);
    }

    return next;
  });
}
