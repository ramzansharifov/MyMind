# MyMind

MyMind is a local-first desktop second brain built with React, TypeScript, Electron, Vite, and JSON file storage. It keeps movies, workouts, todo items, finance records, habits, life events, journal entries, notes, projects, contacts, health entries, goals, inventory, and settings fully offline.

There is no backend, cloud sync, database, SQLite layer, or authentication yet. The renderer never reads files directly; it uses a secure Electron preload API and IPC handlers in the main process.

## Install

```powershell
npm install
```

## Run In Development

```powershell
npm run dev
```

This starts Vite, compiles the Electron main/preload TypeScript files, and opens the Electron app.

## Build

```powershell
npm run build
```

## Build A Windows Installer

```powershell
npm run dist:win
```

The Windows distributable is created by electron-builder in `release/`.

## JSON Storage

App data is stored locally in:

```text
Documents/MyMind/data/
```

The project also includes a `data/` folder with the same file names as a development template:

```text
movies.json
workouts.json
todos.json
finance.json
habits.json
calendar_events.json
journal_entries.json
notes.json
projects.json
contacts.json
health.json
goals.json
inventory.json
app_settings.json
```

List collections are initialized with `[]`. Composite collections use objects:

```json
{
  "plans": [],
  "sessions": []
}
```

If a JSON file is missing, the Electron storage layer creates it. If JSON is corrupted, the app creates a `.corrupted.<timestamp>` backup and recreates the original file with a safe default value.

## Current Modules

- Dashboard with global overview and pinned signals
- Global search across the local workspace
- Record Center in Settings for recent active records across modules
- Movies
- Workouts with an exercise library, training plans, factual workout logs, session history, and nutrition journal
- Todo with due dates and local reminders
- Finance with starting balance, optional income/expense tags, a full reset flow, transaction filters, and a separate savings goals page
- Habits as a daily routine builder with daily completion notes and preserved history when habits are removed from the active list
- Calendar with a month grid, date-based events, important upcoming events, and reminders
- Journal
- Notes / Knowledge Base with preview cards and a full-page rich text editor
- Projects
- Contacts
- Health
- Goals
- Inventory
- Archive and trash manager with 30-day trash retention
- Settings with theme, interface density, accent color, start section, currency, backup export/import, and data folder access
- Full single-file JSON backup export/import with import preview
- English/Russian interface language switch in Settings

## Current Data Lifecycle

Regular pages can archive records, move records to trash, and pin important records on the page. Archived and trashed records are hidden from normal lists and global search. Trash entries keep an expiration timestamp and are automatically removed after 30 days when the app starts.

## Adding A Module Later

1. Add module types in `src/modules/new_module/types.ts`.
2. Add UI components and a page in `src/modules/new_module/`.
3. Add collection mapping in `electron/ipc/storage.ipc.ts` if the module needs a new JSON file.
4. Add the collection type to `src/shared/storage/storageTypes.ts`.
5. Register the page in `src/App.tsx` and the sidebar in `src/shared/components/Sidebar.tsx`.
6. Keep calculations in module utility files instead of embedding business logic in UI components.

## Future Linked Records

The current app intentionally keeps modules independent. A future version should add lightweight links between records, for example goals linked to projects, projects linked to tasks, contacts linked to notes, and life events linked to journal entries. This should be implemented as optional relationship metadata first, not as a hard dependency between modules.

## Future JSON To SQLite Migration

The migration path should replace the storage implementation behind IPC, not the React pages:

1. Keep TypeScript entity models stable.
2. Add SQLite tables that mirror the current JSON shape.
3. Build a one-time importer from `Documents/MyMind/data/*.json`.
4. Swap the Electron IPC storage handlers from JSON reads/writes to SQLite calls.
5. Keep JSON export/import as a backup format.
