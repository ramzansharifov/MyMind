import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface TooltipProps {
  content?: ReactNode;
  children: ReactNode;
  className?: string;
  position?: TooltipPosition;
  disabled?: boolean;
}

type TooltipPosition = 'top' | 'bottom' | 'bottom-end';

interface TooltipCoordinates {
  left: number;
  top: number;
  placement: TooltipPosition;
  ready: boolean;
}

const EDGE_PADDING = 8;
const GAP = 10;

export function Tooltip({ content, children, className = '', position = 'bottom', disabled = false }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coordinates, setCoordinates] = useState<TooltipCoordinates>({
    left: 0,
    top: 0,
    placement: position,
    ready: false,
  });

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    let animationFrame = 0;

    function updatePosition() {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let placement = position;
      let top =
        placement === 'top'
          ? triggerRect.top - tooltipRect.height - GAP
          : triggerRect.bottom + GAP;

      if (placement === 'top' && top < EDGE_PADDING) {
        placement = position === 'bottom-end' ? 'bottom-end' : 'bottom';
        top = triggerRect.bottom + GAP;
      }

      if (placement !== 'top' && top + tooltipRect.height > viewportHeight - EDGE_PADDING) {
        placement = 'top';
        top = triggerRect.top - tooltipRect.height - GAP;
      }

      let left =
        placement === 'bottom-end'
          ? triggerRect.right - tooltipRect.width
          : triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

      left = Math.min(Math.max(left, EDGE_PADDING), viewportWidth - tooltipRect.width - EDGE_PADDING);
      top = Math.min(Math.max(top, EDGE_PADDING), viewportHeight - tooltipRect.height - EDGE_PADDING);

      setCoordinates({ left, top, placement, ready: true });
    }

    function scheduleUpdate() {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updatePosition);
    }

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [isOpen, position]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <span
      ref={triggerRef}
      className={['ui-tooltip', `ui-tooltip-${position}`, className].filter(Boolean).join(' ')}
      onBlur={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen
        ? createPortal(
            <span
              ref={tooltipRef}
              className={`ui-tooltip-content ui-tooltip-content-${coordinates.placement}${
                coordinates.ready ? ' visible' : ''
              }`}
              role="tooltip"
              style={{
                left: coordinates.left,
                top: coordinates.top,
                visibility: coordinates.ready ? 'visible' : 'hidden',
              }}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
