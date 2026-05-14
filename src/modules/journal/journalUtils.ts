import type { JournalEntry } from './types';

export function journalTags(entries: JournalEntry[]) {
  return Array.from(new Set(entries.flatMap((entry) => entry.tags))).sort();
}

export function journalMoods(entries: JournalEntry[]) {
  return Array.from(new Set(entries.map((entry) => entry.mood).filter(Boolean))).sort();
}

export function filterEntries(entries: JournalEntry[], query: string, tag: string, mood: string) {
  const normalized = query.trim().toLowerCase();
  return entries
    .filter((entry) => {
      const matchesQuery =
        !normalized || entry.title.toLowerCase().includes(normalized) || entry.content.toLowerCase().includes(normalized);
      const matchesTag = !tag || entry.tags.includes(tag);
      const matchesMood = !mood || entry.mood === mood;
      return matchesQuery && matchesTag && matchesMood;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
