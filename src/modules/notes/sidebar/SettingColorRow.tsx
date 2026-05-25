import { COLOR_PRESETS, type BlockNoteColor } from '../editor/constants';
import { colorLabel, resolveCssColor } from '../utils/noteEditorFormatting';

interface SettingColorRowProps {
  label: string;
  kind: 'text' | 'background';
  value: string;
  onChange: (value: string) => void;
}

export function SettingColorRow({ label, kind, value, onChange }: SettingColorRowProps) {
  return (
    <details className="note-color-details">
      <summary>
        <span>{label}</span>
        <span
          className="note-color-current"
          style={{ backgroundColor: resolveCssColor(value, kind) }}
          aria-label={colorLabel((COLOR_PRESETS.includes(value as BlockNoteColor) ? value : 'default') as BlockNoteColor)}
        >
          {kind === 'text' ? <span style={{ color: resolveCssColor(value, 'text') }}>A</span> : null}
        </span>
      </summary>
      <div className="note-color-row">
        {COLOR_PRESETS.map((color) => (
          <button
            className={`note-color-swatch${value === color ? ' active' : ''}`}
            type="button"
            key={color}
            style={{ backgroundColor: resolveCssColor(color, kind) }}
            aria-label={colorLabel(color)}
            onClick={() => onChange(color)}
          >
            {kind === 'text' ? <span style={{ color: resolveCssColor(color, 'text') }}>A</span> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
