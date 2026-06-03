# MyMind

MyMind is a local-first desktop “second brain” for personal knowledge, routines, finance, health, planning, and media tracking. The application is built as a hybrid Electron + React + TypeScript system with all primary data stored in local JSON files under the user’s Documents folder, which makes it easy to inspect, back up, and evolve without depending on a remote database.

The project is intentionally designed around a simple principle: the UI should be rich and modular, while the data layer remains transparent, resilient, and editable by the user. There is no cloud backend, no authentication layer, and no remote sync service in the current version.

---

## 1. Product vision

MyMind is not just a notebook. It is a small personal operating system for everyday life:

- capture ideas, notes, templates, and projects;
- track habits, workouts, nutrition, health, and calendar events;
- manage finance, inventory, contacts, goals, and movies;
- keep everything available offline and under user control;
- support incremental extension through isolated modules.

This makes the app suitable for both personal productivity and long-term experimentation with a modular knowledge workspace.

---

## 2. Core design principles

### Local-first

The app stores its working data in `Documents/MyMind/data/` and uses the Electron main process as the only place that reads and writes files. The renderer process never directly touches the filesystem.

### Modularity

Each feature area lives in its own module folder under `src/modules/`. The top-level shell is thin, and each page receives typed data from `App.tsx` through well-defined props.

### Resilience

The storage backend includes recovery behavior for missing or corrupted files. If a collection is broken, the app backs it up as `.corrupted.<timestamp>` and recreates a safe default structure instead of crashing.

### Extensibility

The data model is already split by collection and module, so new domains can be added through a repeatable pattern: types, renderer page, storage mapping, and navigation registration.

---

## 3. Technology stack

- React 19 + TypeScript for the UI layer
- Vite for frontend development and build pipeline
- Electron 33 for the desktop shell and OS integration
- IPC (Electron preload + main process) for safe renderer-to-main communication
- JSON files as the primary persistence format
- BlockNote for the rich note editor experience
- Recharts for data visualization
- Lucide React icons for the interface

This stack is intentionally lightweight: no heavy backend, no database migration complexity, and no dependency on external services.

---

## 4. Application architecture

### 4.1 Runtime flow

1. `electron/main.ts` creates the desktop window.
2. `electron/preload.ts` exposes a limited API to the renderer via `contextBridge`.
3. The renderer calls `storageClient` in `src/shared/storage/storageClient.ts`.
4. IPC handlers in `electron/ipc/storage.ipc.ts` perform file operations in the Electron main process.
5. The app state in `src/shared/app/useAppData.ts` hydrates collections from storage, normalizes them, and persists changes back.

This separation ensures that a renderer-side bug cannot directly corrupt local files.

### 4.2 Why the IPC layer matters

The architecture intentionally places all file I/O in the main process:

- safer access control;
- central recovery and backup logic;
- easier future replacement of JSON storage with SQLite or another backend;
- better control over exported/imported data and asset handling.

### 4.3 Renderer structure

The main shell is centered in `src/App.tsx`:

- it manages the current module;
- lazy-loads pages for performance;
- handles reminders and note-editor dirty-state navigation;
- passes collection data into each module page.

The `AppShell` and navigation definitions organize the interface around a modular sidebar and grouped sections.

---

## 5. Data model and storage strategy

### 5.1 Primary storage location

All runtime data is stored under:

```text
Documents/MyMind/data/
```

The repository also contains a `data/` template folder with the same file names used by the app during development.

### 5.2 Collection catalog

The current data collections are:

- `movies.json`
- `workouts.json`
- `todos.json`
- `finance.json`
- `habits.json`
- `calendar_events.json`
- `journal_entries.json`
- `notes.json`
- `templates.json`
- `projects.json`
- `contacts.json`
- `health.json`
- `goals.json`
- `inventory.json`
- `app_settings.json`

### 5.3 Collection shapes

- list-based collections are stored as arrays;
- composite modules such as `workouts`, `finance`, `habits`, `todos`, and `health` use structured objects;
- settings are stored as one object under `app_settings.json`.

This makes the storage format readable and easy to inspect with a text editor, while still allowing structured logic in the renderer.

### 5.4 Data safety logic

The storage implementation in `electron/ipc/storage.ipc.ts` includes:

- automatic creation of missing files;
- atomic write operations using temp files + rename;
- corruption backup into `.corrupted.<timestamp>` files;
- retry handling for transient filesystem errors;
- queueing for collection writes to reduce race conditions.

This is one of the strongest parts of the codebase because it protects the workspace from common user and OS-level failures.

---

## 6. Current module map

### Dashboard

A central overview screen that aggregates signals from the whole workspace, presents important panels, and gives fast navigation into key modules.

### Movies

Tracks watched or planned movies and related personal media records.

### Workouts

Provides workout data, exercise libraries, training plans, logs, session history, and nutrition entries. It is one of the most structured module domains in the project.

### Todos

Handles task lists with due dates, groups, local reminders, and task lifecycle management.

### Finance

Supports starting balances, transactions, savings goals, tags, filters, and reset flows.

### Habits

A routine builder with daily habit tracking and completion notes.

### Calendar

Provides month-grid planning, event management, reminders, and date-based life organization.

### Journal

Serves as a reflective or diary-style section for personal entries.

### Notes

A knowledge workspace with preview cards, note indexing, search support, rich content editing, and asset management.

### Templates

Stores reusable content structures for recurring notes or forms.

### Projects

Keeps project-oriented records and individual work items.

### Contacts

Stores contact information in grouped data records.

### Health

Tracks health metrics, logs, and other wellbeing-related entries.

### Goals

Supports personal outcome tracking and long-term planning.

### Inventory

Captures physical or digital inventory items and their state.

### Settings

Centralizes theme mode, density, language, currency, start section, data folder access, backup import/export, and the current data workspace.

---

## 7. Notes and asset system

The notes system is more advanced than the rest of the project because it includes:

- indexed note metadata;
- a search index;
- draft persistence;
- asset upload and storage;
- HTML cache generation;
- cleanup of unused assets.

This part of the codebase is very important because it demonstrates how the app can evolve from simple JSON records to a richer, document-centric workspace without introducing a database dependency.

---

## 8. Data lifecycle and operational behavior

The app supports several operational patterns:

- archive records;
- move records to trash;
- pin important items;
- retain trashed records for a limited period;
- clean expired trash during startup or workspace maintenance;
- restore and import previous backups.

Trash retention is currently set to 30 days, which makes the system practical for personal record keeping without forcing permanent deletion.

---

## 9. Development workflow

### Install

```powershell
npm install
```

### Run in development

```powershell
npm run dev
```

This starts Vite, watches TypeScript for Electron files, and launches the Electron desktop app.

### Build the web/electron bundle

```powershell
npm run build
```

### Build a Windows installer

```powershell
npm run dist:win
```

The distributable output is placed under `release/`.

---

## 10. How to extend the app safely

A new module should follow this pattern:

1. Define typed entities in `src/modules/new_module/types.ts`.
2. Create the page and UI in `src/modules/new_module/`.
3. Add storage collection support in `electron/ipc/storage.ipc.ts` if a new file is needed.
4. Add collection metadata in `src/shared/storage/storageTypes.ts`.
5. Register the module in `src/App.tsx` and the navigation shell.
6. Keep calculations and transforms in utility files rather than directly in components.

This keeps the app architecture consistent even as the feature set grows.

---

## 11. Future evolution ideas

The project is already structured for further growth:

- add lightweight relationship metadata between records (goal → project, contact → note, event → journal entry);
- replace the JSON storage backend behind IPC with SQLite or another durable engine;
- add richer analytics and charting for finance, habits, and health;
- support import/export of individual modules and full snapshots;
- introduce search ranking, tagging, and smart filtering.

The current design makes that future migration possible without rewriting the UI pages first.

---

## 12. Summary

MyMind is a focused, offline-first desktop workspace that combines personal knowledge management, planning, tracking, and local automation in one app. Its main technical strength is not complexity but clarity: React pages, Electron IPC, and JSON collections are intentionally separated so the project remains understandable, secure, and easy to extend.

In other words, MyMind is currently a small but well-structured personal OS for local digital life, and its architecture is already ready for the next step: richer integrations, smarter linking, and a more durable storage backend.
