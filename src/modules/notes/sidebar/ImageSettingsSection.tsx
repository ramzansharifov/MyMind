import { NoteRange } from '../editor/NoteEditorControls';
import type { AnyBlock } from '../editor/types';
import { IMAGE_MIN_WIDTH } from '../utils/noteEditorDom';
import { SettingChoiceRow } from './SettingChoiceRow';

interface ImageSettingsSectionProps {
  block: AnyBlock;
  imageWidthValue: number;
  imageMaxWidth: number;
  onSetImageWidth: (value: number) => void;
  onUpdateBlock: (patch: Record<string, unknown>) => void;
}

export function ImageSettingsSection({ block, imageWidthValue, imageMaxWidth, onSetImageWidth, onUpdateBlock }: ImageSettingsSectionProps) {
  return (
    <>
      <label className="note-settings-input">
        Ширина, px
        <input type="number" min={IMAGE_MIN_WIDTH} max={imageMaxWidth} step="10" value={imageWidthValue} onChange={(event) => onSetImageWidth(Number(event.target.value))} />
      </label>
      <NoteRange className="note-image-width-slider" min={IMAGE_MIN_WIDTH} max={imageMaxWidth} step={10} value={imageWidthValue} onChange={onSetImageWidth} />
      <button className="button ghost compact-action full-width" type="button" onClick={() => onSetImageWidth(imageMaxWidth)}>
        По ширине блока
      </button>
      <SettingChoiceRow
        label="Выравнивание"
        value={String((block.props as Record<string, unknown>).textAlignment ?? 'left')}
        options={['left', 'center', 'right']}
        onChange={(value) => onUpdateBlock({ textAlignment: value })}
      />
      <label className="note-settings-input">
        Подпись
        <input value={String((block.props as Record<string, unknown>).caption ?? '')} onChange={(event) => onUpdateBlock({ caption: event.target.value })} />
      </label>
    </>
  );
}
