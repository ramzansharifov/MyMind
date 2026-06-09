import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
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
    <article className={`card note-card note-preview-card ${note.pinned || note.pinnedAt ? 'pinned' : ''}`}>
      <button className="note-preview-body" type="button" onClick={onOpen}>
        <div className="card-title-row">
          <div>
            <h3>{note.title}</h3>
            {groupTitle ? (
              <small className="note-card-group">
                {t('Group')}: {groupTitle}
              </small>
            ) : null}
            <small>
              {note.category || t('Uncategorized')} / {formatDate(note.updatedAt)}
            </small>
          </div>
          {note.pinned || note.pinnedAt ? <span className="rating-pill">{t('Pinned')}</span> : null}
        </div>
        <p>{notePreview(note) || t('No content yet.')}</p>
      </button>
      <div className="chip-row">
        {note.tags.map((tag) => (
          <span className="chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="card-actions">
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
