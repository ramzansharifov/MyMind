import { isContentBlock } from '../../studyUtils';
import type { StudyBlock, StudyCustomBlockTemplate } from '../../types';
import { StudyBoardEditor } from './StudyBoardEditor';
import { StudyContentEditor } from './StudyContentEditor';
import { StudyCustomBlockEditor } from './StudyCustomBlockEditor';
import { StudyFileBlockEditor } from './StudyFileBlockEditor';
import { StudyTableEditor } from './StudyTableEditor';

export { StudyFilePreview } from './StudyFilePreview';

interface BlockEditorContentProps {
  block: StudyBlock;
  templates: StudyCustomBlockTemplate[];
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
}

export function BlockEditorContent({ block, templates, onChange }: BlockEditorContentProps) {
  if (isContentBlock(block)) {
    return <StudyContentEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'table') {
    return <StudyTableEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'board') {
    return <StudyBoardEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'file') {
    return <StudyFileBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'divider') {
    return <hr className="study-divider" style={{ borderColor: block.settings?.dividerColor ?? 'var(--border)' }} />;
  }

  const template = templates.find((item) => item.id === block.templateId);
  return <StudyCustomBlockEditor block={block} template={template} onChange={onChange} />;
}
