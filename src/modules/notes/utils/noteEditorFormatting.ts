import type { AnyBlock } from '../editor/types';
import { COLOR_PRESETS, LIST_BLOCK_TYPES, type BlockNoteColor } from '../editor/constants';

export function supportsTextColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout'].includes(type);
}

export function supportsBackgroundColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout', 'image'].includes(type);
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
