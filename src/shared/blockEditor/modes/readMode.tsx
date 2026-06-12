import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CodePreview } from "../blocks/code/CodeBlockEditor";
import { LatexPreview, MarkdownPreview } from "../blocks/markup/MarkupBlock";
import { RichTextViewer } from "../blocks/richText/RichTextEditor";
import type { StudyContentBlock, StudyHeadingBlock } from "../core/blockCore";

export type StudyReadNode =
  | {
      kind: "block";
      block: Exclude<StudyContentBlock, StudyHeadingBlock>;
    }
  | {
      kind: "section";
      heading: StudyHeadingBlock;
      children: StudyReadNode[];
};

interface StudyReadTreeProps {
  blocks: StudyContentBlock[];
}

export function StudyReadTree({ blocks }: StudyReadTreeProps) {
  const tree = useMemo(() => buildStudyReadTree(blocks), [blocks]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  function toggleSection(sectionId: string) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  return (
    <div className="study-block-reader">
      {tree.map((node) => (
        <StudyReadNodeView
          node={node}
          collapsedSections={collapsedSections}
          onToggleSection={toggleSection}
          key={getStudyReadNodeKey(node)}
        />
      ))}
    </div>
  );
}

export function buildStudyReadTree(blocks: StudyContentBlock[]) {
  const root: StudyReadNode[] = [];
  const stack: Array<{ level: number; children: StudyReadNode[] }> = [{ level: 0, children: root }];

  blocks.forEach((block) => {
    if (block.type !== "heading") {
      stack[stack.length - 1].children.push({
        kind: "block",
        block,
      });
      return;
    }

    while (stack.length > 1 && stack[stack.length - 1].level >= block.level) {
      stack.pop();
    }

    const section: StudyReadNode = {
      kind: "section",
      heading: block,
      children: [],
    };

    stack[stack.length - 1].children.push(section);
    stack.push({
      level: block.level,
      children: section.children,
    });
  });

  return root;
}

function StudyReadNodeView({
  node,
  collapsedSections,
  onToggleSection,
}: {
  node: StudyReadNode;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}) {
  if (node.kind === "block") {
    return <BlockReader block={node.block} />;
  }

  const isCollapsed = Boolean(collapsedSections[node.heading.id]);
  const hasChildren = node.children.length > 0;

  return (
    <section className={`study-read-heading-section level-${node.heading.level} ${isCollapsed ? "collapsed" : ""}`}>
      <button
        className={`study-read-heading-button level-${node.heading.level}`}
        type="button"
        aria-expanded={!isCollapsed}
        onClick={() => onToggleSection(node.heading.id)}
      >
        <span className="study-read-heading-toggle" aria-hidden="true">
          {hasChildren ? isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} /> : null}
        </span>
        <span className={`study-read-heading-title level-${node.heading.level}`} role="heading" aria-level={node.heading.level}>
          {node.heading.text.trim() || "Без заголовка"}
        </span>
      </button>

      {!isCollapsed ? (
        <div className="study-read-heading-children">
          {node.children.map((child) => (
            <StudyReadNodeView
              node={child}
              collapsedSections={collapsedSections}
              onToggleSection={onToggleSection}
              key={getStudyReadNodeKey(child)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BlockReader({ block }: { block: Exclude<StudyContentBlock, StudyHeadingBlock> }) {
  if (block.type === "text") {
    return (
      <section className="study-read-block">
        <RichTextViewer value={block.content} />
      </section>
    );
  }

  if (block.type === "markdown") {
    return (
      <section className="study-read-block">
        <MarkdownPreview source={block.source} />
      </section>
    );
  }

  if (block.type === "latex") {
    return (
      <section className="study-read-block">
        <LatexPreview source={block.source} displayMode={block.displayMode} />
      </section>
    );
  }

  if (block.type === "code") {
    return (
      <section className="study-read-block">
        <CodePreview source={block.source} language={block.language} />
      </section>
    );
  }

  return null;
}

function getStudyReadNodeKey(node: StudyReadNode) {
  return node.kind === "section" ? node.heading.id : node.block.id;
}
