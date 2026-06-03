import type { StudyNode } from "../../types/study";
import { findMaterialNodeByLinkTitle } from "../../utils/internalLinks";

interface TextWithInternalLinksProps {
  text: string;
  nodes: StudyNode[];
  onOpenNode: (nodeId: string) => void;
}

export function TextWithInternalLinks({
  text,
  nodes,
  onOpenNode,
}: TextWithInternalLinksProps) {
  const parts: Array<{
    type: "text" | "link";
    value: string;
    nodeId?: string;
  }> = [];

  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }

    const label = match[1].trim();
    const target = findMaterialNodeByLinkTitle(nodes, label);

    parts.push({
      type: "link",
      value: label,
      nodeId: target?.id,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }

        if (part.nodeId) {
          return (
            <button
              key={index}
              type="button"
              className="mx-1 border border-black bg-black px-1 text-white"
              onClick={() => onOpenNode(part.nodeId!)}
            >
              [[{part.value}]]
            </button>
          );
        }

        return (
          <span
            key={index}
            className="mx-1 border border-black bg-white px-1 text-black line-through"
            title="Материал не найден"
          >
            [[{part.value}]]
          </span>
        );
      })}
    </>
  );
}
