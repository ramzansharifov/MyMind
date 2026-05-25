import type { AnyBlock } from '../editor/types';
import { supportsBackgroundColor, supportsTextColor } from '../utils/noteEditorFormatting';
import { SettingColorRow } from './SettingColorRow';

interface ColorSectionProps {
  block: AnyBlock;
  onUpdateBlock: (patch: Record<string, unknown>) => void;
}

export function ColorSection({ block, onUpdateBlock }: ColorSectionProps) {
  if (!supportsTextColor(block.type) && !supportsBackgroundColor(block.type)) {
    return null;
  }

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
        {supportsBackgroundColor(block.type) ? (
          <SettingColorRow
            label="Цвет фона"
            kind="background"
            value={String((block.props as Record<string, unknown>).backgroundColor ?? 'default')}
            onChange={(value) => onUpdateBlock({ backgroundColor: value })}
          />
        ) : null}
      </div>
    </div>
  );
}
