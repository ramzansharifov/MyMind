import { isContentBlock } from '../../studyUtils';
import type { StudyBlock, StudyCustomBlockTemplate, StudyNode } from '../../types';
import type { RichTextActiveMarks, RichTextCommand } from './StudyRichTextEditor';
import { StudyBoardEditor } from './StudyBoardEditor';
import { StudyContentEditor } from './StudyContentEditor';
import { StudyCustomBlockEditor } from './StudyCustomBlockEditor';
import { StudyFileBlockEditor } from './StudyFileBlockEditor';
import { StudyTableEditor } from './StudyTableEditor';

export { StudyFilePreview } from './StudyFilePreview';

interface BlockEditorContentProps {
  block: StudyBlock;
  nodes: StudyNode[];
  templates: StudyCustomBlockTemplate[];
  formatCommand?: RichTextCommand | null;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
  onOpenNode: (nodeId: string) => void;
  onRichTextMarksChange?: (marks: RichTextActiveMarks) => void;
  onActiveRichTextEditorChange?: (editorId: string) => void;
}

export function BlockEditorContent({
  block,
  nodes,
  templates,
  formatCommand,
  onChange,
  onOpenNode,
  onRichTextMarksChange,
  onActiveRichTextEditorChange,
}: BlockEditorContentProps) {
  if (isContentBlock(block)) {
    return (
      <StudyContentEditor
        block={block}
        nodes={nodes}
        formatCommand={formatCommand}
        onChange={onChange}
        onOpenNode={onOpenNode}
        onRichTextMarksChange={onRichTextMarksChange}
        onActiveRichTextEditorChange={onActiveRichTextEditorChange}
      />
    );
  }

  if (block.type === 'table') {
    return (
      <StudyTableEditor
        block={block}
        nodes={nodes}
        editable
        formatCommand={formatCommand}
        onChange={onChange}
        onOpenNode={onOpenNode}
        onRichTextMarksChange={onRichTextMarksChange}
        onActiveRichTextEditorChange={onActiveRichTextEditorChange}
      />
    );
  }

  if (block.type === 'board') {
    return <StudyBoardEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'file') {
    return <StudyFileBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'divider') {
    return (
      <hr
        className="study-divider"
        style={{ borderColor: block.settings?.dividerColor ?? 'var(--border)' }}
      />
    );
  }

  const template = templates.find((item) => item.id === block.templateId);
  return (
    <StudyCustomBlockEditor
      block={block}
      template={template}
      onChange={onChange}
    />
  );
}
