import { useEffect, useState, type CSSProperties } from 'react';
import { AddButton, BackButton, EditButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { filterMovies, movieGenres } from './movieUtils';
import { MovieCard } from './MovieCard';
import { MovieForm } from './MovieForm';
import { posterPathToSrc } from './posterUtils';
import type { Movie, MovieStatus } from './types';

interface MoviesPageProps {
  movies: Movie[];
  onChange: (movies: Movie[]) => void;
}

export function MoviesPage({ movies, onChange }: MoviesPageProps) {
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<MovieStatus[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Movie | null | undefined>(undefined);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [previewPoster, setPreviewPoster] = useState<{ src: string; title: string } | null>(null);
  const activeMovies = movies.filter((movie) => !isHiddenFromRegularLists(movie));
  const searched = filterMovies(activeMovies, query, 'all', '', 0);
  const filtered = searched.filter((movie) => {
    const matchesStatus = statuses.length === 0 || statuses.includes(movie.status);
    const matchesGenre = genres.length === 0 || genres.some((item) => movie.genres.includes(item));
    return matchesStatus && matchesGenre && movie.rating >= minRating;
  }).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const { t } = useI18n();
  const availableGenres = movieGenres(activeMovies);
  const activeFilterCount = statuses.length + genres.length + (minRating > 0 ? 1 : 0);

  useEffect(() => {
    if (!previewPoster) {
      return undefined;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPreviewPoster(null);
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewPoster]);

  function saveMovie(movie: Movie) {
    const exists = movies.some((item) => item.id === movie.id);
    onChange(exists ? movies.map((item) => (item.id === movie.id ? movie : item)) : [movie, ...movies]);
    if (selectedMovie?.id === movie.id) {
      setSelectedMovie(movie);
    }
    setEditing(undefined);
  }

  function toggleStatusFilter(value: MovieStatus) {
    setStatuses((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleGenreFilter(value: string) {
    setGenres((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function clearMovieFilters() {
    setStatuses([]);
    setGenres([]);
    setMinRating(0);
  }

  if (editing !== undefined) {
    return <MovieForm movie={editing} onCancel={() => setEditing(undefined)} onSave={saveMovie} />;
  }

  if (selectedMovie) {
    const currentMovie = movies.find((movie) => movie.id === selectedMovie.id) ?? selectedMovie;
    const posterSrc = posterPathToSrc(currentMovie.posterPath);
    const backdropStyle = posterSrc
      ? ({ backgroundImage: `url("${posterSrc.replace(/"/g, '\\"')}")` } satisfies CSSProperties)
      : undefined;

    return (
      <section className={`movie-detail-shell${posterSrc ? ' has-backdrop' : ''}`}>
        {posterSrc ? (
          <div className="movie-detail-backdrop" aria-hidden="true">
            <div className="movie-detail-backdrop-image" style={backdropStyle} />
          </div>
        ) : null}
        <div className="movie-detail-header">
          <BackButton
            label="Back to movies"
            onClick={() => {
              setPreviewPoster(null);
              setSelectedMovie(null);
            }}
          />
          <div className="card-actions">
            <EditButton
              className="movie-detail-edit-button"
              label="Edit movie"
              iconOnly={false}
              onClick={() => setEditing(currentMovie)}
            />
          </div>
        </div>
        <article className="movie-detail-page">
          {posterSrc ? (
            <button
              className="movie-detail-poster movie-detail-poster-button"
              type="button"
              aria-label={t('Open poster')}
              onClick={() => setPreviewPoster({ src: posterSrc, title: currentMovie.title })}
            >
              <img src={posterSrc} alt={currentMovie.title} />
            </button>
          ) : (
            <div className="movie-detail-poster">
              <span>{t('No poster')}</span>
            </div>
          )}
          <div className="movie-detail-content">
            <h1>{currentMovie.title}</h1>
            <p>{currentMovie.originalTitle || currentMovie.title}</p>
            <div className="chip-row">
              <span className="chip">{currentMovie.year}</span>
              <span className="chip">{t(currentMovie.status)}</span>
              <span className="chip">{currentMovie.rating > 0 ? `${currentMovie.rating}/10` : t('No rating')}</span>
              {currentMovie.director ? <span className="chip">{currentMovie.director}</span> : null}
            </div>
            <p>{currentMovie.description || currentMovie.notes || t('No notes yet.')}</p>
            {currentMovie.cast ? (
              <div>
                <h3>{t('Cast')}</h3>
                <p>{currentMovie.cast}</p>
              </div>
            ) : null}
            {currentMovie.notes && currentMovie.description ? (
              <div>
                <h3>{t('Notes')}</h3>
                <p>{currentMovie.notes}</p>
              </div>
            ) : null}
            <div className="chip-row">
              {currentMovie.genres.map((genre) => (
                <span className="chip" key={genre}>{genre}</span>
              ))}
            </div>
          </div>
        </article>
        {previewPoster ? (
          <div
            className="movie-poster-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={t('Full size poster')}
            onClick={() => setPreviewPoster(null)}
          >
            <img
              src={previewPoster.src}
              alt={previewPoster.title}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title="Movies"
        subtitle="A watchlist, memory bank, and little film shelf."
        actions={
          <AddButton label="Add movie" onClick={() => setEditing(null)} />
        }
      />
      <CollapsibleFilters
        query={query}
        placeholder="Search title"
        isOpen={filtersOpen}
        activeCount={activeFilterCount}
        onQueryChange={setQuery}
        onToggle={() => setFiltersOpen((current) => !current)}
      >
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Status')}</strong>
            {statuses.length > 0 ? <button type="button" onClick={() => setStatuses([])}>{t('Clear')}</button> : null}
          </div>
          <div className="filter-chip-row">
            {movieStatusFilters.map((item) => (
              <button className={`filter-chip${statuses.includes(item) ? ' active' : ''}`} type="button" key={item} onClick={() => toggleStatusFilter(item)}>
                {t(item)}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Genre')}</strong>
            {genres.length > 0 ? <button type="button" onClick={() => setGenres([])}>{t('Clear')}</button> : null}
          </div>
          <div className="filter-chip-row">
            {availableGenres.length > 0 ? availableGenres.map((item) => (
              <button className={`filter-chip${genres.includes(item) ? ' active' : ''}`} type="button" key={item} onClick={() => toggleGenreFilter(item)}>
                {item}
              </button>
            )) : <span className="muted-text">{t('No genres yet.')}</span>}
          </div>
        </div>
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Minimum rating')}</strong>
            {minRating > 0 ? <button type="button" onClick={() => setMinRating(0)}>{t('Clear')}</button> : null}
          </div>
          <div className="filter-chip-row">
            {ratingFilters.map((item) => (
              <button className={`filter-chip${minRating === item ? ' active' : ''}`} type="button" key={item} onClick={() => setMinRating(item)}>
                {item === 0 ? t('All') : `${item}/10+`}
              </button>
            ))}
          </div>
        </div>
        {activeFilterCount > 0 ? <button className="button ghost filter-clear-button" type="button" onClick={clearMovieFilters}>{t('Clear filters')}</button> : null}
      </CollapsibleFilters>
      {filtered.length === 0 ? (
        <EmptyState title="No movies found" message="Add a movie or relax the filters." />
      ) : (
        <div className="card-grid">
          {filtered.map((movie) => (
            <MovieCard
              movie={movie}
              key={movie.id}
              onOpen={() => setSelectedMovie(movie)}
              onEdit={() => setEditing(movie)}
              onPin={() => {
                const timestamp = new Date().toISOString();
                onChange(movies.map((item) => (item.id === movie.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)));
              }}
              onArchive={() => onChange(movies.map((item) => (item.id === movie.id ? archiveEntity(item) : item)))}
              onTrash={() => onChange(movies.map((item) => (item.id === movie.id ? trashEntity(item) : item)))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const movieStatusFilters: MovieStatus[] = ['planned', 'unwatched', 'watched'];
const ratingFilters = [0, 6, 8, 9];
