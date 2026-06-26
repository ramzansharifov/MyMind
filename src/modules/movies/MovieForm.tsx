import { CalendarClock, Check, Circle, Eye, ImagePlus, Link, Trash2, Upload } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { BackButton, SaveButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n';
import { cn } from '../../shared/utils/classNames';
import { createId } from '../../shared/utils/idGenerator';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { isRemotePosterUrl, posterPathToSrc } from './posterUtils';
import type { Movie, MovieStatus } from './types';

interface MovieFormProps {
  movie?: Movie | null;
  onCancel: () => void;
  onSave: (movie: Movie) => void;
}

type PosterSource = 'file' | 'url';

export function MovieForm({ movie, onCancel, onSave }: MovieFormProps) {
  const formId = useId();
  const initialPosterPath = movie?.posterPath ?? '';
  const [title, setTitle] = useState(movie?.title ?? '');
  const [originalTitle, setOriginalTitle] = useState(movie?.originalTitle ?? '');
  const [year, setYear] = useState(String(movie?.year ?? new Date().getFullYear()));
  const [status, setStatus] = useState<MovieStatus>(movie?.status ?? 'planned');
  const [rating, setRating] = useState(movie?.rating ?? 0);
  const [posterSource, setPosterSource] = useState<PosterSource>(isRemotePosterUrl(initialPosterPath) ? 'url' : 'file');
  const [posterPath, setPosterPath] = useState(initialPosterPath);
  const [posterUrl, setPosterUrl] = useState(isRemotePosterUrl(initialPosterPath) ? initialPosterPath : '');
  const [description, setDescription] = useState(movie?.description ?? '');
  const [cast, setCast] = useState(movie?.cast ?? '');
  const [director, setDirector] = useState(movie?.director ?? '');
  const [genres, setGenres] = useState(joinCsv(movie?.genres ?? []));
  const [notes, setNotes] = useState(movie?.notes ?? '');
  const posterInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const formTitle = movie ? 'Edit movie' : 'Add movie';
  const activePosterPath = posterSource === 'url' ? posterUrl : posterPath;
  const posterPreviewSrc = posterPathToSrc(activePosterPath);
  const hasPoster = Boolean(activePosterPath.trim());

  function selectPoster(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setPosterSource('file');
        setPosterPath(result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function selectPosterSource(source: PosterSource) {
    setPosterSource(source);

    if (source === 'url' && isRemotePosterUrl(posterPath)) {
      setPosterUrl(posterPath);
    }
  }

  function removePoster() {
    setPosterPath('');
    setPosterUrl('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      id: movie?.id ?? createId('movie'),
      title: title.trim(),
      originalTitle: originalTitle.trim(),
      year: Number.parseInt(year, 10) || new Date().getFullYear(),
      status,
      rating: Math.max(0, Math.min(10, rating || 0)),
      posterPath: activePosterPath.trim(),
      description: description.trim(),
      cast: cast.trim(),
      director: director.trim(),
      genres: splitCsv(genres),
      notes: notes.trim(),
      watchedAt: status === 'watched' ? movie?.watchedAt ?? timestamp : null,
      createdAt: movie?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <section className="mx-auto grid max-w-[1180px] gap-[18px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-panel border border-app-border bg-app-surface p-[18px] shadow-[0_14px_34px_var(--shadow)] max-[980px]:grid-cols-1">
        <div className="min-w-0">
          <h1 className="text-[34px] font-extrabold text-app-accent-strong">{t(formTitle)}</h1>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2.5 max-[980px]:justify-start">
          <BackButton label="Back to movies" onClick={onCancel} />
          <SaveButton label="Save movie" form={formId} />
        </div>
      </div>

      <form className="grid min-w-0 gap-4" id={formId} onSubmit={submit}>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(320px,400px)] items-start gap-[18px] max-[980px]:grid-cols-1">
          <div className="grid min-w-0 gap-3.5 rounded-panel border border-app-border bg-app-surface p-[18px] max-[640px]:p-3.5">
            <label>
              {t('Title')}
              <input required value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              {t('Original title')}
              <input value={originalTitle} onChange={(event) => setOriginalTitle(event.target.value)} />
            </label>
            <label>
              {t('Movie description')}
              <textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              <label>
                {t('Year')}
                <input value={year} onChange={(event) => setYear(event.target.value)} />
              </label>
              <label>
                {t('Director')}
                <input value={director} onChange={(event) => setDirector(event.target.value)} />
              </label>
            </div>
            <label>
              {t('Cast')}
              <input value={cast} onChange={(event) => setCast(event.target.value)} placeholder={t('Comma-separated names')} />
            </label>
            <RatingScale label={t('Rating')} value={rating} onChange={setRating} />
            <label>
              {t('Genres')}
              <input value={genres} onChange={(event) => setGenres(event.target.value)} />
            </label>
            <label>
              {t('Notes')}
              <textarea rows={7} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </div>

          <aside className="sticky top-[18px] grid min-w-0 gap-3.5 max-[980px]:static">
            <div className="grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--glass-surface-soft)] p-3 [backdrop-filter:var(--glass-blur)]">
              <strong className="text-app-text">{t('Status')}</strong>
              <div className="grid gap-2.5">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = status === option.value;
                  return (
                    <button
                      className={cn(
                        'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 text-left text-app-text transition-colors',
                        'hover:border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] hover:bg-app-surface-strong',
                        isActive && 'border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] bg-app-surface-strong',
                      )}
                      type="button"
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-panel border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-soft))] text-app-accent-strong">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="min-w-0 break-words">{t(option.label)}</strong>
                        <small className="min-w-0 text-app-muted">{t(option.description)}</small>
                      </span>
                      {isActive ? <Check size={16} aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2.5 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3 text-[13px] text-app-muted">
              <span>{t('Poster image')}</span>
              <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-panel border border-app-border bg-app-surface p-1" role="group" aria-label={t('Poster source')}>
                <button
                  className={cn(
                    'inline-flex min-h-[34px] items-center gap-[7px] rounded-md border-0 bg-transparent px-[11px] font-bold text-app-muted',
                    'hover:bg-[var(--selected-bg)] hover:text-app-accent-strong',
                    posterSource === 'file' && 'bg-[var(--selected-bg)] text-app-accent-strong',
                  )}
                  type="button"
                  onClick={() => selectPosterSource('file')}
                >
                  <Upload size={16} aria-hidden="true" />
                  <span>{t('Poster file')}</span>
                </button>
                <button
                  className={cn(
                    'inline-flex min-h-[34px] items-center gap-[7px] rounded-md border-0 bg-transparent px-[11px] font-bold text-app-muted',
                    'hover:bg-[var(--selected-bg)] hover:text-app-accent-strong',
                    posterSource === 'url' && 'bg-[var(--selected-bg)] text-app-accent-strong',
                  )}
                  type="button"
                  onClick={() => selectPosterSource('url')}
                >
                  <Link size={16} aria-hidden="true" />
                  <span>{t('Image URL')}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <input ref={posterInputRef} className="visually-hidden" type="file" accept="image/*" onChange={selectPoster} />
                <button
                  className={cn(
                    'grid aspect-[16/10] min-h-[260px] max-h-[420px] w-full place-items-center overflow-hidden rounded-panel border border-app-border bg-app-surface p-0 text-center text-app-muted transition-colors',
                    posterSource === 'file' &&
                      'hover:border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]',
                    posterSource === 'url' && 'cursor-default',
                  )}
                  type="button"
                  onClick={() => {
                    if (posterSource === 'file') {
                      posterInputRef.current?.click();
                    }
                  }}
                >
                  {posterPreviewSrc ? (
                    <img className="h-full w-full bg-white object-contain object-center" src={posterPreviewSrc} alt={t('Selected poster preview')} />
                  ) : (
                    <span className="grid justify-items-center gap-2 p-3.5 font-bold">
                      {posterSource === 'file' ? <ImagePlus size={24} aria-hidden="true" /> : <Link size={24} aria-hidden="true" />}
                      {posterSource === 'file' ? t('Choose poster') : t('Paste poster URL')}
                    </span>
                  )}
                </button>
                {posterSource === 'url' ? (
                  <label className="min-w-0">
                    {t('Poster image URL')}
                    <input
                      type="url"
                      inputMode="url"
                      pattern="https?://.+"
                      placeholder="https://example.com/poster.jpg"
                      value={posterUrl}
                      onChange={(event) => setPosterUrl(event.target.value)}
                    />
                  </label>
                ) : null}
                {hasPoster ? (
                  <button
                    className="inline-flex min-h-control w-fit items-center justify-center gap-2 whitespace-nowrap rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-[border-color,box-shadow,transform,background,color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)] hover:text-[color-mix(in_srgb,var(--accent-strong)_92%,white)] hover:shadow-[0_8px_22px_var(--shadow)]"
                    type="button"
                    onClick={removePoster}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    <span>{t('Remove poster')}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>

      </form>
    </section>
  );
}

const statusOptions: Array<{ value: MovieStatus; label: string; description: string; icon: typeof Circle }> = [
  { value: 'planned', label: 'Planned', description: 'Saved for later', icon: CalendarClock },
  { value: 'unwatched', label: 'Unwatched', description: 'Available but not watched', icon: Circle },
  { value: 'watched', label: 'Watched', description: 'Already watched', icon: Eye },
];

function RatingScale({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="m-0 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3">
      <legend className="flex w-full items-center justify-between gap-3 px-1 text-app-muted">
        <span>{label}</span>
        <strong className="text-app-text">{value}/10</strong>
      </legend>
      <div className="mt-2 grid grid-cols-10 gap-2" role="radiogroup" aria-label={label}>
        {Array.from({ length: 10 }, (_, index) => {
          const rating = index + 1;
          return (
            <button
              key={rating}
              type="button"
              className={cn(
                'min-h-[42px] rounded-panel border border-app-border bg-app-surface text-sm font-bold text-app-muted transition-colors',
                'hover:border-[color-mix(in_srgb,var(--accent)_52%,var(--border))] hover:bg-app-surface-strong hover:text-app-text',
                rating <= value && 'border-[var(--selected-border)] bg-[var(--selected-bg)] text-app-text',
                rating === value && 'shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_22%,transparent)]',
              )}
              aria-pressed={rating === value}
              onClick={() => onChange(rating)}
            >
              {rating}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
