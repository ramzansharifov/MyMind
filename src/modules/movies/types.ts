import type { BaseEntity } from '../../shared/types/common';

export type MovieStatus = 'watched' | 'unwatched' | 'planned';

export interface Movie extends BaseEntity {
  title: string;
  originalTitle: string;
  year: number;
  status: MovieStatus;
  rating: number;
  posterPath: string;
  genres: string[];
  notes: string;
  watchedAt: string | null;
}
