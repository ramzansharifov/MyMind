import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { EntityForm } from '../../shared/components/EntityForm';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { posterPathToSrc } from './posterUtils';
import type { Movie, MovieStatus } from './types';

interface MovieFormProps {
  movie?: Movie | null;
  onCancel: () => void;
  onSave: (movie: Movie) => void;
}

export function MovieForm({ movie, onCancel, onSave }: MovieFormProps) {
  const [title, setTitle] = useState(movie?.title ?? '');
  const [originalTitle, setOriginalTitle] = useState(movie?.originalTitle ?? '');
  const [year, setYear] = useState(String(movie?.year ?? new Date().getFullYear()));
  const [status, setStatus] = useState<MovieStatus>(movie?.status ?? 'planned');
  const [rating, setRating] = useState(String(movie?.rating ?? 0));
  const [posterPath, setPosterPath] = useState(movie?.posterPath ?? '');
  const [genres, setGenres] = useState(joinCsv(movie?.genres ?? []));
  const [notes, setNotes] = useState(movie?.notes ?? '');
  const posterInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const posterPreviewSrc = posterPathToSrc(posterPath);

  function selectPoster(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setPosterPath(result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
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
      rating: Math.max(0, Math.min(10, Number.parseFloat(rating) || 0)),
      posterPath: posterPath.trim(),
      genres: splitCsv(genres),
      notes: notes.trim(),
      watchedAt: status === 'watched' ? movie?.watchedAt ?? timestamp : null,
      createdAt: movie?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={movie ? 'Edit movie' : 'Add movie'} saveLabel="Save movie" onCancel={onCancel} onSubmit={submit}>
      <label>
        {t('Title')}
        <input required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t('Original title')}
        <input value={originalTitle} onChange={(event) => setOriginalTitle(event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          {t('Year')}
          <input value={year} onChange={(event) => setYear(event.target.value)} />
        </label>
        <label>
          {t('Rating')}
          <input value={rating} onChange={(event) => setRating(event.target.value)} />
        </label>
      </div>
      <label>
        {t('Status')}
        <select value={status} onChange={(event) => setStatus(event.target.value as MovieStatus)}>
          <option value="planned">{t('Planned')}</option>
          <option value="unwatched">{t('Unwatched')}</option>
          <option value="watched">{t('Watched')}</option>
        </select>
      </label>
      <div className="movie-poster-field">
        <span>{t('Poster image')}</span>
        <div className="movie-poster-picker">
          <div className="movie-poster-preview">
            {posterPreviewSrc ? <img src={posterPreviewSrc} alt={t('Selected poster preview')} /> : <span>{t('No poster')}</span>}
          </div>
          <div className="movie-poster-controls">
            <input ref={posterInputRef} className="visually-hidden" type="file" accept="image/*" onChange={selectPoster} />
            <button className="button ghost" type="button" onClick={() => posterInputRef.current?.click()}>
              <ImagePlus size={17} aria-hidden="true" />
              <span>{t(posterPath ? 'Change poster' : 'Choose poster')}</span>
            </button>
            {posterPath ? (
              <button className="button ghost" type="button" onClick={() => setPosterPath('')}>
                <Trash2 size={17} aria-hidden="true" />
                <span>{t('Remove poster')}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <label>
        {t('Genres')}
        <input value={genres} onChange={(event) => setGenres(event.target.value)} />
      </label>
      <label>
        {t('Notes')}
        <textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
    </EntityForm>
  );
}
