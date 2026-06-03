export interface InternalNavigationNode {
  nodeId: string;
  title: string;
}

const CURRENT_NODE_KEY = "mymind-current-node";
const RETURN_STACK_KEY = "mymind-internal-link-return-stack";

export const INTERNAL_NAVIGATION_RETURN_EVENT = "mymind-internal-link-return-changed";

function emitReturnChanged() {
  window.dispatchEvent(new CustomEvent(INTERNAL_NAVIGATION_RETURN_EVENT));
}

function safeParseNode(value: unknown): InternalNavigationNode | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<InternalNavigationNode>;
  if (!candidate.nodeId) {
    return null;
  }
  return {
    nodeId: candidate.nodeId,
    title: candidate.title || "Previous material",
  };
}

function safeParseNodeFromString(value: string | null): InternalNavigationNode | null {
  if (!value) return null;
  try {
    return safeParseNode(JSON.parse(value));
  } catch {
    return null;
  }
}

function readReturnStack(): InternalNavigationNode[] {
  const raw = sessionStorage.getItem(RETURN_STACK_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(safeParseNode).filter((item): item is InternalNavigationNode => Boolean(item));
  } catch {
    return [];
  }
}

function writeReturnStack(stack: InternalNavigationNode[]): void {
  sessionStorage.setItem(RETURN_STACK_KEY, JSON.stringify(stack));
  emitReturnChanged();
}

function pushReturnTarget(target: InternalNavigationNode, targetNodeId: string): void {
  if (!target.nodeId || !targetNodeId || target.nodeId === targetNodeId) return;
  const stack = readReturnStack();
  const last = stack[stack.length - 1];
  if (last?.nodeId === target.nodeId) return;
  writeReturnStack([...stack, target]);
}

export function setCurrentInternalNavigationNode(nodeId: string, title: string): void {
  if (!nodeId) return;
  sessionStorage.setItem(CURRENT_NODE_KEY, JSON.stringify({ nodeId, title: title || "Current material" }));

  // Also update recent materials for command palette
  const RECENT_KEY = "study-command-palette-recent-v1";
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const next = [nodeId, ...ids.filter(id => id !== nodeId)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch(e) {}
}

export function getCurrentInternalNavigationNode(): InternalNavigationNode | null {
  return safeParseNodeFromString(sessionStorage.getItem(CURRENT_NODE_KEY));
}

export function saveInternalLinkReturnTarget(targetNodeId: string): void {
  const currentNode = getCurrentInternalNavigationNode();
  if (!currentNode) return;
  pushReturnTarget(currentNode, targetNodeId);
}

export function saveExplicitInternalLinkReturnTarget(currentNodeId: string, currentTitle: string, targetNodeId: string): void {
  pushReturnTarget({ nodeId: currentNodeId, title: currentTitle || "Previous material" }, targetNodeId);
}

export function getInternalLinkReturnStack(): InternalNavigationNode[] {
  return readReturnStack();
}

export function getInternalLinkReturnTarget(): InternalNavigationNode | null {
  const stack = readReturnStack();
  return stack[stack.length - 1] ?? null;
}

export function getInternalLinkReturnStackDepth(): number {
  return readReturnStack().length;
}

export function popInternalLinkReturnTarget(): InternalNavigationNode | null {
  const stack = readReturnStack();
  const target = stack[stack.length - 1] ?? null;
  const nextStack = stack.slice(0, -1);
  writeReturnStack(nextStack);
  return target;
}

export function clearInternalLinkReturnTarget(): void {
  sessionStorage.removeItem(RETURN_STACK_KEY);
  emitReturnChanged();
}
