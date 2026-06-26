const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(file, token) {
  assert(read(file).includes(token), `${file} must include ${token}`);
}

function assertNotIncludes(file, token) {
  assert(!read(file).includes(token), `${file} must not include ${token}`);
}

function walk(directory) {
  const entries = fs.readdirSync(path.join(root, directory), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relative = path.join(directory, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) return walk(relative);
    return [relative];
  });
}

for (const file of [
  'src/app/index.ts',
  'src/app/providers/AppProviders.tsx',
  'src/app/routing/ModuleRenderer.tsx',
  'src/shared/app/index.ts',
  'src/shared/components/index.ts',
  'src/shared/forms/index.ts',
  'src/shared/forms/FormField.tsx',
  'src/shared/forms/FormModal.tsx',
  'src/shared/forms/EntityForm.tsx',
  'src/shared/i18n/index.ts',
  'src/shared/layouts/index.ts',
  'src/shared/storage/index.ts',
  'src/shared/ui/index.ts',
]) {
  assert(exists(file), `${file} must exist as a public architecture entrypoint`);
}

assertIncludes('src/App.tsx', "from './app/index'");
assertIncludes('src/App.tsx', "from './shared/app'");
assertIncludes('src/App.tsx', "from './shared/components'");
assertIncludes('src/App.tsx', "from './shared/layouts'");
assertNotIncludes('src/App.tsx', './app/dialogs/');
assertNotIncludes('src/App.tsx', './shared/app/useAppData');
assertNotIncludes('src/App.tsx', './shared/components/LoadingState');

const moduleNames = [
  'boards',
  'calendar',
  'contacts',
  'dashboard',
  'finance',
  'goals',
  'habits',
  'health',
  'inventory',
  'journal',
  'movies',
  'notes',
  'nutrition',
  'projects',
  'settings',
  'study',
  'templates',
  'todos',
  'workouts',
];

for (const moduleName of moduleNames) {
  assert(exists(`src/modules/${moduleName}/index.ts`), `src/modules/${moduleName}/index.ts must exist`);
  assertIncludes('src/app/routing/ModuleRenderer.tsx', `import('../../modules/${moduleName}')`);
  assertNotIncludes('src/app/routing/ModuleRenderer.tsx', `import('../../modules/${moduleName}/`);
}

assertNotIncludes('src/modules/notes/index.ts', 'NoteEditorPage');
assertIncludes('src/shared/app/collectionRegistry.ts', 'dataCollections');
assertIncludes('src/shared/app/settingsModel.ts', 'normalizeSidebarSettings');
assertIncludes('src/shared/app/groupedContentModel.ts', 'normalizeGroupedContentData');
assertNotIncludes('src/shared/app/appData.ts', 'function normalizeGroupedContentData');
assertNotIncludes('src/shared/app/appData.ts', 'export function createDefaultSettings');
assertIncludes('src/shared/app/moduleRegistry.ts', 'labelKey');
assertIncludes('src/shared/app/moduleCollections.ts', 'moduleCollections');
assertNotIncludes('src/shared/app/appData.ts', 'export const moduleCollections');
assertIncludes('src/shared/app/moduleContracts.ts', 'getModuleCollections');
assertIncludes('src/shared/app/moduleContracts.ts', 'hasDirtyNavigationGuard');
assertIncludes('src/app/routing/ModuleRenderer.tsx', 'getModuleContract(activeModule)');
assertIncludes('src/shared/i18n/translations.ts', 'export type TranslationKey');
assertIncludes('src/shared/forms/index.ts', "./FormField");
assertIncludes('src/shared/forms/index.ts', "./FormModal");
assertIncludes('src/shared/forms/index.ts', "./EntityForm");

for (const file of walk('src')) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  if (file.includes('.bak') || file.includes('.broken')) continue;
  if (file === 'src/shared/i18n/I18nProvider.tsx') continue;
  assertNotIncludes(file, 'shared/i18n/I18nProvider');
  assertNotIncludes(file, '../i18n/I18nProvider');
}

console.log('App architecture checks passed.');