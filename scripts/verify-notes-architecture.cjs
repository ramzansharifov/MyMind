const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assertIncludes = (file, token) => {
  const source = read(file);
  if (!source.includes(token)) {
    throw new Error(`${file} must include ${token}`);
  }
};
const assertNotIncludes = (file, token) => {
  const source = read(file);
  if (source.includes(token)) {
    throw new Error(`${file} must not include ${token}`);
  }
};

assertIncludes('src/modules/notes/NoteEditorWorkspace.tsx', 'StudyBlockEditor');
assertIncludes('src/modules/notes/NoteEditorPage.tsx', "from './NoteEditorWorkspace'");
assertIncludes('src/shared/components/SimpleEntityPage.tsx', 'useCollectionItems');
assertNotIncludes('src/vite-env.d.ts', 'tldraw');
assertNotIncludes('src/modules/notes/NoteEditorWorkspace.tsx', '@blocknote');

console.log('Notes architecture checks passed.');
