import { ArrowLeft, BookOpen, Brush, Save } from 'lucide-react';
import { Tooltip } from '../../../shared/components/Tooltip';
import type { NoteLayoutWidth } from '../types';
import type { NoteMode } from '../editor/types';
import { NoteLayoutWidthPicker } from './NoteLayoutWidthPicker';

interface NoteTopBarProps {
  mode: NoteMode;
  dirty: boolean;
  lastSavedLabel: string;
  layoutWidth: NoteLayoutWidth;
  onBack: () => void;
  onLayoutWidthChange: (value: NoteLayoutWidth) => void;
  onModeChange: (mode: NoteMode) => void;
  onSave: () => void;
}

export function NoteTopBar({
  mode,
  dirty,
  lastSavedLabel,
  layoutWidth,
  onBack,
  onLayoutWidthChange,
  onModeChange,
  onSave,
}: NoteTopBarProps) {
  const saveStatusText = dirty ? 'Есть несохранённые изменения' : `Последнее сохранение: ${lastSavedLabel}`;

  return (
    <div className="note-topbar">
      <div className="note-topbar-leading">
        <button className="button ghost note-topbar-back" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          Назад к заметкам
        </button>
        <Tooltip content={saveStatusText} position="bottom">
          <span className={`note-save-status-dot${dirty ? ' dirty' : ' saved'}`} aria-label={saveStatusText} tabIndex={0} />
        </Tooltip>
      </div>
      <div className="note-topbar-actions">
        <button className={`button ghost${mode === 'read' ? ' active' : ''}`} type="button" onClick={() => onModeChange('read')}>
          <BookOpen size={18} />
          Чтение
        </button>
        <button className={`button ghost${mode === 'edit' ? ' active' : ''}`} type="button" onClick={() => onModeChange('edit')}>
          <Brush size={18} />
          Визуальный редактор
        </button>
        <NoteLayoutWidthPicker layoutWidth={layoutWidth} onChange={onLayoutWidthChange} />
        <button className="button accent note-save-button" type="button" onClick={onSave}>
          <Save size={18} />
          Сохранить
        </button>
      </div>
    </div>
  );
}
