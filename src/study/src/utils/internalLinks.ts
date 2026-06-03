import type {
  CustomBlockTemplate,
  StudyMaterial,
  StudyNode,
} from "../types/study";
import { getBlockText } from "./blocks";

export interface ResolvedInternalLink {
  raw: string;
  label: string;
  normalized: string;
  node: StudyNode | null;
  found: boolean;
}

export function normalizeLinkTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function extractInternalLinkLabels(text: string): string[] {
  const labels: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const label = match[1].trim();

    if (label) {
      labels.push(label);
    }
  }

  return labels;
}

export function findMaterialNodeByLinkTitle(
  nodes: StudyNode[],
  linkTitle: string
): StudyNode | null {
  const normalizedLink = normalizeLinkTitle(linkTitle);

  return (
    nodes.find((node) => {
      return node.type === "material" && normalizeLinkTitle(node.title) === normalizedLink;
    }) ?? null
  );
}

export function resolveInternalLinks(
  text: string,
  nodes: StudyNode[]
): ResolvedInternalLink[] {
  return extractInternalLinkLabels(text).map((label) => {
    const node = findMaterialNodeByLinkTitle(nodes, label);

    return {
      raw: `[[${label}]]`,
      label,
      normalized: normalizeLinkTitle(label),
      node,
      found: Boolean(node),
    };
  });
}

export function getMaterialOutgoingLinks(
  material: StudyMaterial,
  nodes: StudyNode[],
  templates: CustomBlockTemplate[]
): ResolvedInternalLink[] {
  const allText = material.blocks
    .map((block) => getBlockText(block, templates))
    .join("\n");

  const links = resolveInternalLinks(allText, nodes);
  const unique = new Map<string, ResolvedInternalLink>();

  links.forEach((link) => {
    unique.set(link.normalized, link);
  });

  return Array.from(unique.values());
}

export function getMaterialBrokenLinks(
  material: StudyMaterial,
  nodes: StudyNode[],
  templates: CustomBlockTemplate[]
): ResolvedInternalLink[] {
  return getMaterialOutgoingLinks(material, nodes, templates).filter((link) => !link.found);
}

export function getMaterialBacklinks(
  currentNode: StudyNode,
  materials: StudyMaterial[],
  nodes: StudyNode[],
  templates: CustomBlockTemplate[]
): StudyMaterial[] {
  const currentTitle = normalizeLinkTitle(currentNode.title);

  return materials.filter((material) => {
    if (material.nodeId === currentNode.id) {
      return false;
    }

    const outgoingLinks = getMaterialOutgoingLinks(material, nodes, templates);

    return outgoingLinks.some((link) => link.normalized === currentTitle);
  });
}
