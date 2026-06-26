import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n';
import { formatDate } from '../../shared/utils/dateUtils';
import { cn } from '../../shared/utils/classNames';
import { notePreview } from './noteUtils';
import type { Note } from './types';

interface NoteCardProps {
  note: Note;
  groupTitle?: string;
  onOpen: () => void;
  onEdit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
}

export function NoteCard({ note, groupTitle, onOpen, onEdit, onPin, onArchive, onTrash }: NoteCardProps) {
  const { t } = useI18n();
  return (
    <article className={cn(cardClass, Boolean(note.pinned || note.pinnedAt) && 'border-[rgba(72,190,171,0.45)]')}>
      <button className="flex min-h-32 w-full cursor-pointer flex-col gap-2.5 border-0 bg-transparent p-0 text-left text-inherit" type="button" onClick={onOpen}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-lg font-extrabold text-app-text">{note.title}</h3>
            {groupTitle ? (
              <small className="block text-xs text-app-accent">
                {t('Group')}: {groupTitle}
              </small>
            ) : null}
            <small className="block text-xs text-app-muted">
              {note.category || t('Uncategorized')} / {formatDate(note.updatedAt)}
            </small>
          </div>
          {note.pinned || note.pinnedAt ? <span className={pillClass}>{t('Pinned')}</span> : null}
        </div>
        <p className="m-0 line-clamp-4 text-sm leading-6 text-app-muted">{notePreview(note) || t('No content yet.')}</p>
      </button>
      <div className="flex flex-wrap gap-2">
        {note.tags.map((tag) => (
          <span className={chipClass} key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <PinButton isPinned={Boolean(note.pinned || note.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton
          label="Archive"
          confirmTitle="Archive note?"
          confirmMessage="The note will be hidden from regular lists but kept in local SQLite storage."
          onConfirm={onArchive}
        />
        <DeleteButton
          label="Move to trash"
          confirmTitle="Move to trash?"
          confirmMessage="The item will stay in trash for 30 days before permanent deletion."
          onConfirm={onTrash}
        />
      </div>
    </article>
  );
}

const cardClass =
  'flex min-w-0 flex-col gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel transition-colors hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]';
const pillClass =
  'inline-flex shrink-0 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-1 text-xs font-bold text-app-accent-strong';
const chipClass =
  'inline-flex w-fit items-center gap-1.5 rounded-full border border-app-border bg-app-chip px-2.5 py-1.5 text-xs leading-tight text-app-chip-text';
