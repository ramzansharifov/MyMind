import type { Movie, MovieStatus } from './types';

export function movieGenres(movies: Movie[]) {
  return Array.from(new Set(movies.flatMap((movie) => movie.genres))).sort();
}

export function filterMovies(
  movies: Movie[],
  query: string,
  status: MovieStatus | 'all',
  genre: string,
  minRating: number,
) {
  const normalized = query.trim().toLowerCase();
  return movies
    .filter((movie) => {
      const matchesQuery =
        !normalized ||
        movie.title.toLowerCase().includes(normalized) ||
        movie.originalTitle.toLowerCase().includes(normalized);
      const matchesStatus = status === 'all' || movie.status === status;
      const matchesGenre = !genre || movie.genres.includes(genre);
      return matchesQuery && matchesStatus && matchesGenre && movie.rating >= minRating;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
