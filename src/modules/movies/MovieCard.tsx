import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';
import { posterPathToSrc } from './posterUtils';
import type { Movie } from './types';

interface MovieCardProps {
  movie: Movie;
  onOpen: () => void;
  onEdit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
}

export function MovieCard({ movie, onOpen, onEdit, onPin, onArchive, onTrash }: MovieCardProps) {
  const { t } = useI18n();
  const posterSrc = posterPathToSrc(movie.posterPath);
  return (
    <article
      className={cn(
        'grid min-h-[230px] gap-3.5 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel',
        'hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]',
        movie.pinnedAt && 'border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent)_12%)]',
      )}
    >
      <button
        className="aspect-[16/10] w-full overflow-hidden rounded-panel border border-app-border bg-app-surface-soft p-0 text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))]"
        type="button"
        onClick={onOpen}
      >
        {posterSrc ? <img className="h-full w-full object-cover object-center" src={posterSrc} alt={movie.title} /> : <span>{t('No poster')}</span>}
      </button>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-app-text">{movie.title}</h3>
          <small className="text-app-muted">
            {movie.year} / {t(movie.status)}
          </small>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-app-border bg-app-chip px-2.5 py-1.5 text-xs leading-tight text-app-chip-text">
          {movie.rating > 0 ? `${movie.rating}/10` : t('No rating')}
        </span>
      </div>
      <p className="text-app-muted">{movie.description || movie.notes || t('No notes yet.')}</p>
      <div className="flex flex-wrap gap-2">
        {movie.genres.map((genre) => (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-app-border bg-app-chip px-2.5 py-1.5 text-xs leading-tight text-app-chip-text" key={genre}>
            {genre}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PinButton isPinned={Boolean(movie.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton label="Archive" onConfirm={onArchive} confirmTitle="Archive item?" confirmMessage="The item will be hidden from regular lists but kept in local SQLite storage." />
        <DeleteButton label="Move to trash" onConfirm={onTrash} confirmTitle="Move movie to trash?" confirmMessage="The movie will stay in trash for 30 days before permanent deletion." />
      </div>
    </article>
  );
}
