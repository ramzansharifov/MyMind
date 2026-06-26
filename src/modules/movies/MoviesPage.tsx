import { useEffect, useState, type CSSProperties } from 'react';
import { AddButton, BackButton, EditButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { ModulePageShell } from '../../shared/components/ModulePageShell';
import { useI18n } from '../../shared/i18n';
import { cn } from '../../shared/utils/classNames';
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
      <section className={cn('relative -m-8 min-h-[calc(100vh-64px)] overflow-hidden bg-app-bg p-8', posterSrc && 'isolate')}>
        {posterSrc ? (
          <>
            <div className="pointer-events-none fixed inset-y-0 right-0 left-[var(--sidebar-width)] z-0 overflow-hidden" aria-hidden="true">
              <div className="absolute -inset-[22px] scale-[1.02] bg-cover bg-center opacity-[0.66] blur-[10px] saturate-[1.12]" style={backdropStyle} />
            </div>
            <div
              className="pointer-events-none fixed inset-y-0 right-0 left-[var(--sidebar-width)] z-0 bg-[radial-gradient(circle_at_28%_24%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_34%),linear-gradient(90deg,color-mix(in_srgb,var(--bg)_38%,transparent),color-mix(in_srgb,var(--bg)_64%,transparent)),linear-gradient(180deg,color-mix(in_srgb,var(--bg)_34%,transparent),color-mix(in_srgb,var(--bg)_78%,transparent))]"
              aria-hidden="true"
            />
          </>
        ) : null}
        <div className="relative z-[1] mb-4 flex items-center justify-between gap-3">
          <BackButton
            label="Back to movies"
            onClick={() => {
              setPreviewPoster(null);
              setSelectedMovie(null);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <EditButton label="Edit movie" iconOnly={false} onClick={() => setEditing(currentMovie)} />
          </div>
        </div>
        <article className="relative z-[1] grid grid-cols-[minmax(280px,380px)_minmax(0,1fr)] items-stretch gap-[22px] rounded-panel border border-app-border bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-[18px] shadow-[0_14px_34px_var(--shadow)] [backdrop-filter:blur(12px)] max-[900px]:grid-cols-1">
          {posterSrc ? (
            <button
              className="grid min-h-[420px] cursor-zoom-in place-items-center overflow-hidden rounded-panel border border-app-border bg-app-surface-soft p-0 text-app-muted transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent)_56%,var(--border))] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent),0_18px_42px_var(--shadow)]"
              type="button"
              aria-label={t('Open poster')}
              onClick={() => setPreviewPoster({ src: posterSrc, title: currentMovie.title })}
            >
              <img className="h-full w-full bg-white object-contain object-center" src={posterSrc} alt={currentMovie.title} />
            </button>
          ) : (
            <div className="grid min-h-[420px] place-items-center overflow-hidden rounded-panel border border-app-border bg-app-surface-soft text-app-muted">
              <span>{t('No poster')}</span>
            </div>
          )}
          <div className="grid min-w-0 content-start gap-3.5">
            <h1 className="text-[34px] font-extrabold text-app-text">{currentMovie.title}</h1>
            <p className="text-app-text">{currentMovie.originalTitle || currentMovie.title}</p>
            <div className="flex flex-wrap gap-2">
              <span className={chipClass}>{currentMovie.year}</span>
              <span className={chipClass}>{t(currentMovie.status)}</span>
              <span className={chipClass}>{currentMovie.rating > 0 ? `${currentMovie.rating}/10` : t('No rating')}</span>
              {currentMovie.director ? <span className={chipClass}>{currentMovie.director}</span> : null}
            </div>
            <p className="text-app-text">{currentMovie.description || currentMovie.notes || t('No notes yet.')}</p>
            {currentMovie.cast ? (
              <div>
                <h3 className="text-base font-bold text-app-text">{t('Cast')}</h3>
                <p className="text-app-text">{currentMovie.cast}</p>
              </div>
            ) : null}
            {currentMovie.notes && currentMovie.description ? (
              <div>
                <h3 className="text-base font-bold text-app-text">{t('Notes')}</h3>
                <p className="text-app-text">{currentMovie.notes}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {currentMovie.genres.map((genre) => (
                <span className={chipClass} key={genre}>{genre}</span>
              ))}
            </div>
          </div>
        </article>
        {previewPoster ? (
          <div
            className="fixed inset-y-0 right-0 left-[var(--sidebar-width)] z-[12000] grid cursor-zoom-out place-items-center bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--surface)_32%,transparent),transparent_58%),color-mix(in_srgb,#020711_86%,transparent)] p-[34px] [backdrop-filter:blur(14px)]"
            role="dialog"
            aria-modal="true"
            aria-label={t('Full size poster')}
            onClick={() => setPreviewPoster(null)}
          >
            <img
              className="block max-h-[calc(100vh-68px)] max-w-[min(100%,1180px)] rounded-panel border border-[color-mix(in_srgb,white_14%,var(--border))] bg-white object-contain shadow-modal"
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
    <ModulePageShell
      title="Movies"
      subtitle="A watchlist, memory bank, and little film shelf."
      actions={<AddButton label="Add movie" onClick={() => setEditing(null)} />}
    >
      <CollapsibleFilters
        query={query}
        placeholder="Search title"
        isOpen={filtersOpen}
        activeCount={activeFilterCount}
        onQueryChange={setQuery}
        onToggle={() => setFiltersOpen((current) => !current)}
      >
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2.5 text-app-muted">
            <strong>{t('Status')}</strong>
            {statuses.length > 0 ? <button className="border-0 bg-transparent p-0 text-app-accent-strong" type="button" onClick={() => setStatuses([])}>{t('Clear')}</button> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {movieStatusFilters.map((item) => (
              <button className={filterChipClass(statuses.includes(item))} type="button" key={item} onClick={() => toggleStatusFilter(item)}>
                {t(item)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2.5 text-app-muted">
            <strong>{t('Genre')}</strong>
            {genres.length > 0 ? <button className="border-0 bg-transparent p-0 text-app-accent-strong" type="button" onClick={() => setGenres([])}>{t('Clear')}</button> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableGenres.length > 0 ? availableGenres.map((item) => (
              <button className={filterChipClass(genres.includes(item))} type="button" key={item} onClick={() => toggleGenreFilter(item)}>
                {item}
              </button>
            )) : <span className="text-app-muted">{t('No genres yet.')}</span>}
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2.5 text-app-muted">
            <strong>{t('Minimum rating')}</strong>
            {minRating > 0 ? <button className="border-0 bg-transparent p-0 text-app-accent-strong" type="button" onClick={() => setMinRating(0)}>{t('Clear')}</button> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {ratingFilters.map((item) => (
              <button className={filterChipClass(minRating === item)} type="button" key={item} onClick={() => setMinRating(item)}>
                {item === 0 ? t('All') : `${item}/10+`}
              </button>
            ))}
          </div>
        </div>
        {activeFilterCount > 0 ? (
          <button
            className="inline-flex min-h-control w-fit items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]"
            type="button"
            onClick={clearMovieFilters}
          >
            {t('Clear filters')}
          </button>
        ) : null}
      </CollapsibleFilters>
      {filtered.length === 0 ? (
        <EmptyState title="No movies found" message="Add a movie or relax the filters." />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
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
    </ModulePageShell>
  );
}

const movieStatusFilters: MovieStatus[] = ['planned', 'unwatched', 'watched'];
const ratingFilters = [0, 6, 8, 9];
const chipClass = 'inline-flex w-fit items-center gap-1.5 rounded-full border border-app-border bg-app-chip px-2.5 py-1.5 text-xs leading-tight text-app-chip-text';

function filterChipClass(active: boolean) {
  return cn(
    'inline-flex min-h-9 items-center gap-[7px] rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface-soft)] px-3 py-[7px] text-app-text [backdrop-filter:var(--glass-blur)] transition-colors',
    'hover:border-[color-mix(in_srgb,var(--accent)_54%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))]',
    active && 'border-[color-mix(in_srgb,var(--accent)_54%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))]',
  );
}
