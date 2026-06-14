import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
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
    <article className={cn(cardClass, entry.pinnedAt && pinnedClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold text-app-text">{entry.title}</h3>
          <small className="text-app-muted">
            {entry.mood || t('No mood')} / {formatDate(entry.createdAt)}
          </small>
        </div>
      </div>
      <p className="line-clamp-5 whitespace-pre-wrap text-sm text-app-muted">{entry.content}</p>
      <div className="flex flex-wrap gap-2">
        {entry.tags.map((tag) => (
          <span className={chipClass} key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <PinButton isPinned={Boolean(entry.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton label="Archive" onConfirm={onArchive} confirmTitle="Archive item?" confirmMessage="The item will be hidden from regular lists but kept in local SQLite storage." />
        <DeleteButton label="Move to trash" onConfirm={onTrash} confirmTitle="Move journal entry to trash?" confirmMessage="The journal entry will stay in trash for 30 days before permanent deletion." />
      </div>
    </article>
  );
}

const cardClass =
  'grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel transition-colors hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]';

const pinnedClass = 'border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]';

const chipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
