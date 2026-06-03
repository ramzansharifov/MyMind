import { getStudyBlockLabel } from '../../studyUtils';
import type { StudyBlock, StudyContentBlock } from '../../types';

interface StudyContentEditorProps {
  block: StudyContentBlock;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
}

export function StudyContentEditor({ block, onChange }: StudyContentEditorProps) {
  if (block.type === 'heading') {
    const HeadingTag = `h${block.settings?.headingStyle ?? 1}` as 'h1' | 'h2' | 'h3';

    return (
      <HeadingTag
        className="study-heading-input"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange((item) => ({ ...(item as StudyContentBlock), content: event.currentTarget.textContent ?? '' }))}
      >
        {block.content}
      </HeadingTag>
    );
  }

  return (
    <textarea
      className={`study-textarea ${block.type}`}
      value={block.content}
      placeholder={getStudyBlockLabel(block.type)}
      onChange={(event) => onChange((item) => ({ ...(item as StudyContentBlock), content: event.target.value }))}
    />
  );
}
