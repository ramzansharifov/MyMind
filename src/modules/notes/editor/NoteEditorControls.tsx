import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

interface NoteSelectOption {
  value: string;
  label: ReactNode;
}

export function NoteSelect({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: string;
  options: NoteSelectOption[];
  onChange: (value: string) => void;
  label?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!selectRef.current?.contains(event.target as Node | null)) {
        setOpen(false);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className={`note-custom-select${open ? ' open' : ''}${className ? ` ${className}` : ''}`} ref={selectRef}>
      {label ? <span className="note-custom-select-label">{label}</span> : null}
      <button className="note-custom-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{selectedOption?.label ?? value}</span>
        <ChevronDown size={15} />
      </button>
      {open ? (
        <div className="note-custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              className={option.value === value ? 'active' : ''}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <span className="note-custom-select-current" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NoteRange({
  value,
  min,
  max,
  step = 1,
  onChange,
  className = '',
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const normalizedMax = Math.max(min, max);
  const safeValue = clampNumber(value, min, normalizedMax);
  const percent = normalizedMax === min ? 0 : ((safeValue - min) / (normalizedMax - min)) * 100;

  const setValueFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) {
        return;
      }

      const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1);
      const rawValue = min + ratio * (normalizedMax - min);
      const steppedValue = min + Math.round((rawValue - min) / step) * step;
      onChange(clampNumber(steppedValue, min, normalizedMax));
    },
    [min, normalizedMax, onChange, step],
  );

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    setValueFromClientX(event.clientX);

    function handlePointerMove(moveEvent: PointerEvent) {
      setValueFromClientX(moveEvent.clientX);
    }

    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta = event.shiftKey ? step * 10 : step;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(clampNumber(safeValue - delta, min, normalizedMax));
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(clampNumber(safeValue + delta, min, normalizedMax));
    }
    if (event.key === 'Home') {
      event.preventDefault();
      onChange(min);
    }
    if (event.key === 'End') {
      event.preventDefault();
      onChange(normalizedMax);
    }
  }

  return (
    <div className={`note-range${className ? ` ${className}` : ''}`}>
      <div
        className="note-range-track"
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={normalizedMax}
        aria-valuenow={safeValue}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        <span className="note-range-fill" style={{ width: `${percent}%` }} />
        <span className="note-range-thumb" style={{ left: `${percent}%` }} />
      </div>
    </div>
  );
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
