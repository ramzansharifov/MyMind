import type { StudyHeadingBlock } from "../../core/blockCore";

export function HeadingBlockEditor({
  block,
  onChange,
}: {
  block: StudyHeadingBlock;
  onChange: (text: string) => void;
}) {
  return (
    <label className={`study-heading-editor level-${block.level}`}>
      <span>H{block.level}</span>
      <input
        type="text"
        value={block.text}
        placeholder="Название раздела"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
