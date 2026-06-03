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

export function InternalLinkBackButton({
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

    /*
      Do not clear the stack if the top target equals the current material.
      This can happen for a moment immediately after clicking a link.
      We only hide the button on that exact page.
    */
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

    if (!target) {
      return;
    }

    onOpenNode(target.nodeId);
  }

  function closeButton() {
    clearInternalLinkReturnTarget();
    setReturnTarget(null);
    setDepth(0);
  }

  return (
    <div className="fixed right-4 top-20 z-[9999] flex max-w-[460px] items-stretch border border-black bg-white shadow-[4px_4px_0_#000]">
      <button
        type="button"
        onClick={goBack}
        className="border-r border-black bg-white px-4 py-2 text-sm hover:bg-black hover:text-white"
        title={returnTarget.title}
      >
        ← Вернуться: {returnTarget.title}
        {depth > 1 && (
          <span className="ml-2 border border-black px-1 text-xs">
            {depth}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={closeButton}
        className="bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
        title="Очистить историю возврата"
      >
        ×
      </button>
    </div>
  );
}
