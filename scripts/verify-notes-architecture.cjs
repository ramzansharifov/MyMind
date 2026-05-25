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

assertIncludes('src/modules/notes/editor/constants.ts', "'drawing'");
assertIncludes('src/modules/notes/editor/contentSanitizer.ts', "source.type === 'drawing'");
assertIncludes('src/modules/notes/editor/noteSchema.ts', 'drawingBlockSpec');
assertIncludes('src/modules/notes/editor/ReadOnlyBlocks.tsx', 'note-read-video');
assertIncludes('src/modules/notes/editor/ReadOnlyBlocks.tsx', 'note-read-audio');
assertIncludes('src/modules/notes/editor/ReadOnlyBlocks.tsx', 'note-read-file');
assertIncludes('src/modules/notes/NoteEditorWorkspace.tsx', "from './editor/ReadOnlyBlocks'");
assertIncludes('src/modules/notes/NoteEditorPage.tsx', "from './NoteEditorWorkspace'");
assertIncludes('src/shared/components/SimpleEntityPage.tsx', 'useCollectionItems');
assertNotIncludes('src/vite-env.d.ts', 'tldraw');

console.log('Notes architecture checks passed.');
