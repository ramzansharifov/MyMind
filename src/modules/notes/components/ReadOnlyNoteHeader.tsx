import { Tags } from 'lucide-react';

interface ReadOnlyNoteHeaderProps {
  title: string;
  tags: string[];
}

export function ReadOnlyNoteHeader({ title, tags }: ReadOnlyNoteHeaderProps) {
  return (
    <div className="note-read-only-header">
      <h1>{title.trim() || 'Без названия'}</h1>
      {tags.length > 0 ? (
        <div className="note-tag-row read-only">
          <Tags size={17} />
          {tags.map((tag) => (
            <span className="note-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
