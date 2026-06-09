const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const studyPagePath = path.join(root, 'src', 'modules', 'study', 'StudyPage.tsx');
const studyStylesPath = path.join(root, 'src', 'styles', 'modules', 'study.css');

const studyPage = fs.readFileSync(studyPagePath, 'utf8');
const studyStyles = fs.readFileSync(studyStylesPath, 'utf8');

const checks = [
  {
    label: 'Study lists are stored as text-block props',
    pass: studyPage.includes('studyList') && studyPage.includes('studyChecked') && studyPage.includes('STUDY_TEXT_BLOCK_PROP_SCHEMA'),
  },
  {
    label: 'Study list formatting keeps native list block types out of new actions',
    pass: !studyPage.includes("type: 'bulletListItem'") && !studyPage.includes("type: 'numberedListItem'") && !studyPage.includes("type: 'checkListItem'"),
  },
  {
    label: 'Enter no longer inserts textual list markers',
    pass: !studyPage.includes("return '\\\\u2022 '") && !studyPage.includes("return '\\\\u2610 '") && !studyPage.includes('insertInitialStudyListMarker'),
  },
  {
    label: 'Double Enter can clear list formatting on empty items',
    pass: studyPage.includes('handleStudyListEnter') && studyPage.includes("updateStudyListBlock(editor, currentBlock, 'none')"),
  },
  {
    label: 'Checkbox list state is toggled through block props',
    pass: studyPage.includes('toggleStudyCheckboxBlock') && studyPage.includes('studyChecked: !Boolean'),
  },
  {
    label: 'Numbered lists are calculated via editor decorations',
    pass: studyPage.includes('study-list-numbering') && studyPage.includes('data-study-list-index'),
  },
  {
    label: 'Study list CSS renders markers from data attributes',
    pass: studyStyles.includes('data-study-list="bullet"') && studyStyles.includes('data-study-list="numbered"') && studyStyles.includes('data-study-list="check"'),
  },
];

const failed = checks.filter((check) => !check.pass);

if (failed.length > 0) {
  console.error('Study list formatting checks failed:');
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log('Study list formatting checks passed.');
