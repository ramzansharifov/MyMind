import { useMemo, useState } from 'react';
import type { AppData } from '../app/appData';
import { useI18n } from '../i18n/I18nProvider';
import type { ModuleKey } from '../types/common';
import { isHiddenFromRegularLists } from '../utils/archiveUtils';

interface SearchResult {
  id: string;
  module: ModuleKey;
  title: string;
  detail: string;
}

export function GlobalSearch({ data, onNavigate }: { data: AppData; onNavigate: (module: ModuleKey) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => buildResults(data, query), [data, query]);
  const { t } = useI18n();

  return (
    <div className="global-search">
      <input value={query} placeholder={t('Search everything...')} onChange={(event) => setQuery(event.target.value)} />
      {query.trim() && results.length > 0 ? (
        <div className="global-search-results">
          {results.slice(0, 10).map((result) => (
            <button
              type="button"
              key={result.id}
              onClick={() => {
                onNavigate(result.module);
                setQuery('');
              }}
            >
              <strong>{result.title}</strong>
              <span>
                {t(moduleLabels[result.module])} / {result.detail}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const moduleLabels: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  movies: 'Movies',
  workouts: 'Workouts',
  todos: 'Todo',
  finance: 'Finance',
  habits: 'Habits',
  calendar: 'Calendar',
  journal: 'Diary',
  notes: 'Notes',
  templates: 'Templates',
  study: 'Обучение',
  boards: 'Boards',
  projects: 'Projects',
  contacts: 'Contacts',
  health: 'Health',
  goals: 'Goals',
  inventory: 'Inventory',
  settings: 'Settings',
};

function buildResults(data: AppData, query: string): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }
  const results: SearchResult[] = [];
  const add = (result: SearchResult, haystack: string) => {
    if (haystack.toLowerCase().includes(normalized)) {
      results.push(result);
    }
  };
  data.todos.items.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `todo-${item.id}`, module: 'todos', title: item.title, detail: item.description }, `${item.title} ${item.description} ${item.tags.join(' ')}`));
  data.notes.items.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `note-${item.id}`, module: 'notes', title: item.title, detail: item.category }, `${item.title} ${item.content} ${item.tags.join(' ')}`));
  data.templates.items.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `template-${item.id}`, module: 'templates', title: item.title, detail: item.category }, `${item.title} ${item.body} ${item.tags.join(' ')} ${item.variables.join(' ')}`));
  data.study.nodes.forEach((item) => add({ id: `study-${item.id}`, module: 'study', title: item.title, detail: item.type === 'folder' ? 'Folder' : 'Material' }, item.title));
  data.boards.boards.forEach((item) => add({ id: `board-${item.id}`, module: 'boards', title: item.title, detail: 'Board' }, item.title));
  data.journalEntries.items.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `journal-${item.id}`, module: 'journal', title: item.title, detail: item.mood }, `${item.title} ${item.content} ${item.tags.join(' ')}`));
  data.movies.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `movie-${item.id}`, module: 'movies', title: item.title, detail: item.status }, `${item.title} ${item.originalTitle} ${item.notes} ${item.genres.join(' ')}`));
  data.finance.transactions.forEach((item) => add({ id: `finance-${item.id}`, module: 'finance', title: item.title, detail: item.sourceOrCategory }, `${item.title} ${item.description} ${item.tags.join(' ')}`));
  data.calendarEvents.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `event-${item.id}`, module: 'calendar', title: item.title, detail: item.category }, `${item.title} ${item.description} ${item.category} ${(item.tags ?? []).join(' ')}`));
  data.projects.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `project-${item.id}`, module: 'projects', title: item.title, detail: item.status }, `${item.title} ${item.description} ${item.tags.join(' ')}`));
  data.contacts.items.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `contact-${item.id}`, module: 'contacts', title: item.name, detail: item.relationship }, `${item.name} ${item.notes} ${item.tags.join(' ')}`));
  data.goals.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `goal-${item.id}`, module: 'goals', title: item.title, detail: item.status }, `${item.title} ${item.description} ${item.tags.join(' ')}`));
  data.inventory.filter((item) => !isHiddenFromRegularLists(item)).forEach((item) => add({ id: `inventory-${item.id}`, module: 'inventory', title: item.title, detail: item.location }, `${item.title} ${item.category} ${item.notes} ${item.tags.join(' ')}`));
  return results;
}
