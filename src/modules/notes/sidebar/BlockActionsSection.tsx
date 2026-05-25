import { Copy, Trash2 } from 'lucide-react';

interface BlockActionsSectionProps {
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BlockActionsSection({ onDuplicate, onDelete }: BlockActionsSectionProps) {
  return (
    <div className="note-settings-section note-bottom-actions">
      <button className="button ghost compact-action" type="button" onClick={onDuplicate}>
        <Copy size={17} />
        Дублировать
      </button>
      <button className="button danger compact-action" type="button" onClick={onDelete}>
        <Trash2 size={17} />
        Удалить
      </button>
    </div>
  );
}
