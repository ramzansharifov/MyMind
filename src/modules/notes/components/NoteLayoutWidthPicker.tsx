import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { NoteLayoutWidth } from '../types';

export const NOTE_LAYOUT_WIDTHS = [900, 1000, 1100, 1200] as const satisfies readonly NoteLayoutWidth[];
export const DEFAULT_NOTE_LAYOUT_WIDTH: NoteLayoutWidth = 1200;

interface NoteLayoutWidthPickerProps {
  layoutWidth: NoteLayoutWidth;
  onChange: (value: NoteLayoutWidth) => void;
}

export function NoteLayoutWidthPicker({ layoutWidth, onChange }: NoteLayoutWidthPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`note-layout-width-select${open ? ' open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <span>Ширина</span>
      <button
        className="note-layout-width-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {layoutWidth}px
        <ChevronDown size={15} />
      </button>
      {open ? (
        <div className="note-layout-width-menu" role="listbox" aria-label="Ширина заметки">
          {NOTE_LAYOUT_WIDTHS.map((width) => (
            <button
              className={width === layoutWidth ? 'active' : ''}
              type="button"
              role="option"
              aria-selected={width === layoutWidth}
              key={width}
              onClick={() => {
                onChange(width);
                setOpen(false);
              }}
            >
              <span>{width}px</span>
              {width === layoutWidth ? <span className="note-layout-width-current" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function normalizeNoteLayoutWidth(value: unknown): NoteLayoutWidth {
  const width = Number(value);
  return NOTE_LAYOUT_WIDTHS.includes(width as NoteLayoutWidth) ? (width as NoteLayoutWidth) : DEFAULT_NOTE_LAYOUT_WIDTH;
}
