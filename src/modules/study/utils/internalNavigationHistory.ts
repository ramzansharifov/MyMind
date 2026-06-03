let currentInternalNavigationNodeId: string | null = null;
let currentInternalNavigationNodeTitle = "";

export function setCurrentInternalNavigationNode(
  nodeId: string,
  title: string
) {
  currentInternalNavigationNodeId = nodeId;
  currentInternalNavigationNodeTitle = title;
}

export function saveInternalLinkReturnTarget(targetNodeId: string) {
  if (!currentInternalNavigationNodeId || currentInternalNavigationNodeId === targetNodeId) {
    return;
  }

  sessionStorage.setItem(
    `study_return_target_${targetNodeId}`,
    JSON.stringify({
      id: currentInternalNavigationNodeId,
      title: currentInternalNavigationNodeTitle,
    })
  );
}

export function saveExplicitInternalLinkReturnTarget(
  sourceNodeId: string,
  sourceTitle: string,
  targetNodeId: string
) {
  if (sourceNodeId === targetNodeId) {
    return;
  }

  sessionStorage.setItem(
    `study_return_target_${targetNodeId}`,
    JSON.stringify({
      id: sourceNodeId,
      title: sourceTitle,
    })
  );
}

export function getInternalLinkReturnTarget(nodeId: string): {
  id: string;
  title: string;
} | null {
  const data = sessionStorage.getItem(`study_return_target_${nodeId}`);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearInternalLinkReturnTarget(nodeId: string) {
  sessionStorage.removeItem(`study_return_target_${nodeId}`);
}
