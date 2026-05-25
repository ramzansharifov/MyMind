import { DEFAULT_DRAWING_HEIGHT, DRAWING_COLOR_PRESETS, DRAWING_WIDTH_PRESETS } from '../editor/constants';
import { NoteRange } from '../editor/NoteEditorControls';
import type { AnyBlock } from '../editor/types';
import { clampNumber } from '../utils/noteEditorFormatting';

interface DrawingSettingsSectionProps {
  block: AnyBlock;
  onUpdateBlock: (patch: Record<string, unknown>) => void;
}

export function DrawingSettingsSection({ block, onUpdateBlock }: DrawingSettingsSectionProps) {
  return (
    <div className="note-settings-section note-drawing-settings-section">
      <h4>Drawing</h4>
      <div className="note-drawing-color-row" aria-label="Stroke color">
        {DRAWING_COLOR_PRESETS.map((color) => (
          <button
            className={`note-drawing-color-swatch${String((block.props as Record<string, unknown>).strokeColor ?? '#e8edf5') === color ? ' active' : ''}`}
            type="button"
            key={color}
            style={{ backgroundColor: color }}
            aria-label={color}
            onClick={() => onUpdateBlock({ strokeColor: color })}
          />
        ))}
      </div>
      <label className="note-settings-input">
        Thickness
        <NoteRange min={1} max={16} step={1} value={Number((block.props as Record<string, unknown>).strokeWidth ?? 3)} onChange={(value) => onUpdateBlock({ strokeWidth: value })} />
      </label>
      <div className="note-drawing-width-row">
        {DRAWING_WIDTH_PRESETS.map((width) => (
          <button
            className={Number((block.props as Record<string, unknown>).strokeWidth ?? 3) === width ? 'active' : ''}
            type="button"
            key={width}
            onClick={() => onUpdateBlock({ strokeWidth: width })}
          >
            {width}px
          </button>
        ))}
      </div>
      <label className="note-settings-input">
        Height, px
        <input
          type="number"
          min="220"
          max="900"
          step="20"
          value={Number((block.props as Record<string, unknown>).canvasHeight ?? DEFAULT_DRAWING_HEIGHT)}
          onChange={(event) => onUpdateBlock({ canvasHeight: clampNumber(Number(event.target.value), 220, 900) })}
        />
      </label>
      <NoteRange
        className="note-drawing-height-slider"
        min={220}
        max={900}
        step={20}
        value={Number((block.props as Record<string, unknown>).canvasHeight ?? DEFAULT_DRAWING_HEIGHT)}
        onChange={(value) => onUpdateBlock({ canvasHeight: value })}
      />
    </div>
  );
}
