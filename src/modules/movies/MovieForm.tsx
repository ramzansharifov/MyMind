import { CalendarClock, Check, Circle, Eye, ImagePlus, Link, Trash2, Upload } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { BackButton, SaveButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
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
    <section className="movie-form-page">
      <div className="movie-form-page-header">
        <div className="movie-form-title">
          <h1>{t(formTitle)}</h1>
        </div>
        <div className="movie-form-page-actions">
          <BackButton label="Back to movies" onClick={onCancel} />
          <SaveButton label="Save movie" form={formId} />
        </div>
      </div>

      <form className="entity-form movie-form-page-form" id={formId} onSubmit={submit}>
        <div className="movie-form-page-grid">
          <div className="movie-form-main">
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
            <div className="form-grid">
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

          <aside className="movie-form-side">
            <div className="form-section">
              <strong>{t('Status')}</strong>
              <div className="movie-status-picker">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = status === option.value;
                  return (
                    <button
                      className={`movie-status-choice${isActive ? ' active' : ''}`}
                      type="button"
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                    >
                      <span className="movie-status-icon">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{t(option.label)}</strong>
                        <small>{t(option.description)}</small>
                      </span>
                      {isActive ? <Check size={16} aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="movie-poster-field">
              <span>{t('Poster image')}</span>
              <div className="movie-poster-source-tabs" role="group" aria-label={t('Poster source')}>
                <button
                  className={`movie-poster-source-button${posterSource === 'file' ? ' active' : ''}`}
                  type="button"
                  onClick={() => selectPosterSource('file')}
                >
                  <Upload size={16} aria-hidden="true" />
                  <span>{t('Poster file')}</span>
                </button>
                <button
                  className={`movie-poster-source-button${posterSource === 'url' ? ' active' : ''}`}
                  type="button"
                  onClick={() => selectPosterSource('url')}
                >
                  <Link size={16} aria-hidden="true" />
                  <span>{t('Image URL')}</span>
                </button>
              </div>
              <div className="movie-poster-picker">
                <input ref={posterInputRef} className="visually-hidden" type="file" accept="image/*" onChange={selectPoster} />
                <button
                  className={`movie-poster-preview${posterSource === 'url' ? ' url-mode' : ''}`}
                  type="button"
                  onClick={() => {
                    if (posterSource === 'file') {
                      posterInputRef.current?.click();
                    }
                  }}
                >
                  {posterPreviewSrc ? (
                    <img src={posterPreviewSrc} alt={t('Selected poster preview')} />
                  ) : (
                    <span>
                      {posterSource === 'file' ? <ImagePlus size={24} aria-hidden="true" /> : <Link size={24} aria-hidden="true" />}
                      {posterSource === 'file' ? t('Choose poster') : t('Paste poster URL')}
                    </span>
                  )}
                </button>
                {posterSource === 'url' ? (
                  <label className="movie-poster-url-field">
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
                  <button className="button ghost movie-remove-poster-button" type="button" onClick={removePoster}>
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
    <fieldset className="workout-rating-scale movie-rating-scale">
      <legend>
        <span>{label}</span>
        <strong>{value}/10</strong>
      </legend>
      <div className="workout-rating-options" role="radiogroup" aria-label={label}>
        {Array.from({ length: 10 }, (_, index) => {
          const rating = index + 1;
          return (
            <button
              key={rating}
              type="button"
              className={`workout-rating-option${rating <= value ? ' selected' : ''}${rating === value ? ' current' : ''}`}
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
