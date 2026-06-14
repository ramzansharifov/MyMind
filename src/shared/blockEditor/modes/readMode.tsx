import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../utils/classNames";
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
    <div className="grid gap-3">
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
    <section className="grid gap-2">
      <button
        className="group flex w-full items-center gap-2 rounded-panel border border-transparent px-1 py-1 text-left transition-colors hover:border-app-border hover:bg-app-surface-soft"
        type="button"
        aria-expanded={!isCollapsed}
        onClick={() => onToggleSection(node.heading.id)}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center text-app-muted group-hover:text-app-accent-strong" aria-hidden="true">
          {hasChildren ? isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} /> : null}
        </span>
        <span className={cn("text-app-text", headingTitleClasses[node.heading.level])} role="heading" aria-level={node.heading.level}>
          {node.heading.text.trim() || "Без заголовка"}
        </span>
      </button>

      {!isCollapsed ? (
        <div className={cn("grid gap-3", node.heading.level < 5 && "ml-8 border-l border-app-border pl-4")}>
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
      <section className={readBlockClass}>
        <RichTextViewer value={block.content} />
      </section>
    );
  }

  if (block.type === "markdown") {
    return (
      <section className={readBlockClass}>
        <MarkdownPreview source={block.source} />
      </section>
    );
  }

  if (block.type === "latex") {
    return (
      <section className={readBlockClass}>
        <LatexPreview source={block.source} displayMode={block.displayMode} />
      </section>
    );
  }

  if (block.type === "code") {
    return (
      <section className={readBlockClass}>
        <CodePreview source={block.source} language={block.language} />
      </section>
    );
  }

  return null;
}

function getStudyReadNodeKey(node: StudyReadNode) {
  return node.kind === "section" ? node.heading.id : node.block.id;
}

const readBlockClass =
  "rounded-panel border border-app-border bg-app-surface-soft p-4 text-app-text";
const headingTitleClasses: Record<StudyHeadingBlock["level"], string> = {
  1: "text-[30px] font-extrabold leading-tight",
  2: "text-[26px] font-extrabold leading-tight",
  3: "text-[22px] font-extrabold leading-tight",
  4: "text-[18px] font-extrabold leading-tight",
  5: "text-[16px] font-extrabold leading-tight",
};
