import { ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
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
    <article className={`card movie-card ${movie.pinnedAt ? 'pinned' : ''}`}>
      <button className="movie-poster-button" type="button" onClick={onOpen}>
        {posterSrc ? <img src={posterSrc} alt={movie.title} /> : <span>{t('No poster')}</span>}
      </button>
      <div className="card-title-row">
        <div>
          <h3>{movie.title}</h3>
          <small>
            {movie.year} / {t(movie.status)}
          </small>
        </div>
        <span className="rating-pill">{movie.rating > 0 ? `${movie.rating}/10` : t('No rating')}</span>
      </div>
      <p>{movie.description || movie.notes || t('No notes yet.')}</p>
      <div className="chip-row">
        {movie.genres.map((genre) => (
          <span className="chip" key={genre}>
            {genre}
          </span>
        ))}
      </div>
      <div className="card-actions">
        <PinButton isPinned={Boolean(movie.pinnedAt)} onClick={onPin} />
        <EditButton onClick={onEdit} />
        <ArchiveButton label="Archive" onConfirm={onArchive} confirmTitle="Archive item?" confirmMessage="The item will be hidden from regular lists but kept in local SQLite storage." />
        <DeleteButton label="Move to trash" onConfirm={onTrash} confirmTitle="Move movie to trash?" confirmMessage="The movie will stay in trash for 30 days before permanent deletion." />
      </div>
    </article>
  );
}
