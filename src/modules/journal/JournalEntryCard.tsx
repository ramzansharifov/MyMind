import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import type { JournalEntry } from './types';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
}

export function JournalEntryCard({ entry, onEdit, onPin, onArchive, onTrash }: JournalEntryCardProps) {
  const { t } = useI18n();
  return (
    <article className={`card ${entry.pinnedAt ? 'pinned' : ''}`}>
      <div className="card-title-row">
        <div>
          <h3>{entry.title}</h3>
          <small>
            {entry.mood || t('No mood')} / {formatDate(entry.createdAt)}
          </small>
        </div>
      </div>
      <p>{entry.content}</p>
      <div className="chip-row">
        {entry.tags.map((tag) => (
          <span className="chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="card-actions">
        <PinButton isPinned={Boolean(entry.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton label="Archive" onConfirm={onArchive} confirmTitle="Archive item?" confirmMessage="The item will be hidden from regular lists but kept in local JSON storage." />
        <DeleteButton label="Move to trash" onConfirm={onTrash} confirmTitle="Move journal entry to trash?" confirmMessage="The journal entry will stay in trash for 30 days before permanent deletion." />
      </div>
    </article>
  );
}
