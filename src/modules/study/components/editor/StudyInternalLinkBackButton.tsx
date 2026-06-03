import { useEffect, useState } from "react";
import {
  clearInternalLinkReturnTarget,
  getInternalLinkReturnStackDepth,
  getInternalLinkReturnTarget,
  INTERNAL_NAVIGATION_RETURN_EVENT,
  popInternalLinkReturnTarget,
  type InternalNavigationNode,
} from "../../utils/internalNavigationHistory";

interface InternalLinkBackButtonProps {
  currentNodeId?: string;
  onOpenNode: (nodeId: string) => void;
}

export function StudyInternalLinkBackButton({
  currentNodeId = "",
  onOpenNode,
}: InternalLinkBackButtonProps) {
  const [returnTarget, setReturnTarget] = useState<InternalNavigationNode | null>(() =>
    getInternalLinkReturnTarget()
  );

  const [depth, setDepth] = useState(() => getInternalLinkReturnStackDepth());

  function syncReturnTarget() {
    const nextTarget = getInternalLinkReturnTarget();
    const nextDepth = getInternalLinkReturnStackDepth();

    if (currentNodeId && nextTarget?.nodeId === currentNodeId) {
      setReturnTarget(null);
      setDepth(nextDepth);
      return;
    }

    setReturnTarget(nextTarget);
    setDepth(nextDepth);
  }

  useEffect(() => {
    syncReturnTarget();

    window.addEventListener(INTERNAL_NAVIGATION_RETURN_EVENT, syncReturnTarget);
    window.addEventListener("storage", syncReturnTarget);

    return () => {
      window.removeEventListener(INTERNAL_NAVIGATION_RETURN_EVENT, syncReturnTarget);
      window.removeEventListener("storage", syncReturnTarget);
    };
  }, [currentNodeId]);

  if (!returnTarget) {
    return null;
  }

  function goBack() {
    const target = popInternalLinkReturnTarget();
    if (target) onOpenNode(target.nodeId);
  }

  return (
    <div className="study-back-button-overlay glass-panel shadow-strong">
      <button
        type="button"
        onClick={goBack}
        className="button primary"
        title={returnTarget.title}
      >
        ← Back to {returnTarget.title}
        {depth > 1 && (
          <span className="study-back-stack-badge">
            {depth}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
            clearInternalLinkReturnTarget();
            setReturnTarget(null);
            setDepth(0);
        }}
        className="button ghost icon-only"
        title="Clear navigation history"
      >
        ×
      </button>
    </div>
  );
}
