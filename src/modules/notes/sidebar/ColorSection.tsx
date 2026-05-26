import type { AnyBlock } from '../editor/types';
import { supportsBackgroundColor, supportsTextColor } from '../utils/noteEditorFormatting';
import { SettingColorRow } from './SettingColorRow';

interface ColorSectionProps {
  block: AnyBlock;
  onUpdateBlock: (patch: Record<string, unknown>) => void;
}

export function ColorSection({ block, onUpdateBlock }: ColorSectionProps) {
  const isDivider = block.type === 'divider';

  if (!supportsTextColor(block.type) && !supportsBackgroundColor(block.type) && !isDivider) {
    return null;
  }

  const backgroundLabel = isDivider ? 'Цвет дивайдера' : 'Цвет фона';
  const backgroundValue = isDivider ? (block.props as Record<string, unknown>).dividerColor : (block.props as Record<string, unknown>).backgroundColor;

  return (
    <div className="note-settings-section note-drag-menu-section">
      <div className="note-menu-group">
        {supportsTextColor(block.type) ? (
          <SettingColorRow
            label="Цвет текста"
            kind="text"
            value={String((block.props as Record<string, unknown>).textColor ?? 'default')}
            onChange={(value) => onUpdateBlock({ textColor: value })}
          />
        ) : null}
        {supportsBackgroundColor(block.type) || isDivider ? (
          <SettingColorRow
            label={backgroundLabel}
            kind="background"
            value={String(backgroundValue ?? 'default')}
            onChange={(value) => onUpdateBlock(isDivider ? { dividerColor: value } : { backgroundColor: value })}
          />
        ) : null}
      </div>
    </div>
  );
}
