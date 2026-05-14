import { useState } from 'react';
import { AddButton, BackButton, EditButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterBar } from '../../shared/components/FilterBar';
import { PageHeader } from '../../shared/components/PageHeader';
import { SearchInput } from '../../shared/components/SearchInput';
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
  const [status, setStatus] = useState<MovieStatus | 'all'>('all');
  const [genre, setGenre] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [editing, setEditing] = useState<Movie | null | undefined>(undefined);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const activeMovies = movies.filter((movie) => !isHiddenFromRegularLists(movie));
  const filtered = filterMovies(activeMovies, query, status, genre, minRating).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const { t } = useI18n();

  function saveMovie(movie: Movie) {
    const exists = movies.some((item) => item.id === movie.id);
    onChange(exists ? movies.map((item) => (item.id === movie.id ? movie : item)) : [movie, ...movies]);
    setEditing(undefined);
  }

  if (selectedMovie) {
    const currentMovie = movies.find((movie) => movie.id === selectedMovie.id) ?? selectedMovie;
    const posterSrc = posterPathToSrc(currentMovie.posterPath);
    const shouldShowPosterPath = currentMovie.posterPath && !currentMovie.posterPath.trim().startsWith('data:image/');
    return (
      <section>
        <div className="movie-detail-header">
          <BackButton label="Back to movies" onClick={() => setSelectedMovie(null)} />
          <div className="card-actions">
            <EditButton label="Edit" onClick={() => setEditing(currentMovie)} />
          </div>
        </div>
        <article className="movie-detail-page">
          <div className="movie-detail-poster">
            {posterSrc ? <img src={posterSrc} alt={currentMovie.title} /> : <span>{t('No poster')}</span>}
          </div>
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
            {shouldShowPosterPath ? <code>{currentMovie.posterPath}</code> : null}
          </div>
        </article>
        {editing !== undefined ? <MovieForm movie={editing} onCancel={() => setEditing(undefined)} onSave={saveMovie} /> : null}
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
      <FilterBar>
        <SearchInput value={query} placeholder="Search title" onChange={setQuery} />
        <label>
          {t('Status')}
          <select value={status} onChange={(event) => setStatus(event.target.value as MovieStatus | 'all')}>
            <option value="all">{t('All')}</option>
            <option value="planned">{t('Planned')}</option>
            <option value="unwatched">{t('Unwatched')}</option>
            <option value="watched">{t('Watched')}</option>
          </select>
        </label>
        <label>
          {t('Genre')}
          <select value={genre} onChange={(event) => setGenre(event.target.value)}>
            <option value="">{t('All')}</option>
            {movieGenres(activeMovies).map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Minimum rating')}
          <input type="number" min="0" max="10" value={minRating} onChange={(event) => setMinRating(Number(event.target.value))} />
        </label>
      </FilterBar>
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
      {editing !== undefined ? <MovieForm movie={editing} onCancel={() => setEditing(undefined)} onSave={saveMovie} /> : null}
    </section>
  );
}
