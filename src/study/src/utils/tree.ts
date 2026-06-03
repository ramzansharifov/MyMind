import type { StudyNode } from "../types/study";

export function getChildren(nodes: StudyNode[], parentId: string | null): StudyNode[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function getNodeDepth(nodes: StudyNode[], nodeId: string | null): number {
  if (!nodeId) {
    return 0;
  }

  let depth = 0;
  let current = nodes.find((node) => node.id === nodeId);

  while (current) {
    depth += 1;

    if (!current.parentId) {
      break;
    }

    current = nodes.find((node) => node.id === current?.parentId);

    if (depth > 100) {
      break;
    }
  }

  return depth;
}

export function getNodePath(nodes: StudyNode[], nodeId: string): string {
  const parts: string[] = [];
  let current = nodes.find((node) => node.id === nodeId);

  while (current) {
    parts.unshift(current.title);
    current = nodes.find((node) => node.id === current?.parentId);
  }

  return parts.join(" / ");
}

export function collectDescendantIds(nodes: StudyNode[], nodeId: string): Set<string> {
  const ids = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;

    nodes.forEach((node) => {
      if (node.parentId && (node.parentId === nodeId || ids.has(node.parentId))) {
        if (!ids.has(node.id)) {
          ids.add(node.id);
          changed = true;
        }
      }
    });
  }

  return ids;
}

export function isDescendantNode(
  nodes: StudyNode[],
  possibleDescendantId: string,
  ancestorId: string
): boolean {
  let current = nodes.find((node) => node.id === possibleDescendantId);

  while (current?.parentId) {
    if (current.parentId === ancestorId) {
      return true;
    }

    current = nodes.find((node) => node.id === current?.parentId);
  }

  return false;
}

export function getTargetParentId(
  nodes: StudyNode[],
  selectedNodeId: string | null
): string | null {
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return null;
  }

  if (selectedNode.type === "folder") {
    return selectedNode.id;
  }

  return selectedNode.parentId;
}
