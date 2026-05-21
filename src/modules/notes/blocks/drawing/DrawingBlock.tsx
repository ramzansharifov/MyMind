import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createReactBlockSpec } from '@blocknote/react';

const DRAWING_SAVE_DELAY = 700;
const DEFAULT_STROKE = '#e8edf5';
const DEFAULT_LINE_WIDTH = 3;
const DEFAULT_CANVAS_HEIGHT = 420;
const MAX_HISTORY_LENGTH = 60;
export const DRAWING_BLOCK_DIRTY_EVENT = 'mymind:drawing-block-dirty';
export const DRAWING_BLOCK_SELECTED_EVENT = 'mymind:drawing-block-selected';

type DrawingSession = {
  snapshots: string[];
  index: number;
};

const drawingSessions = new Map<string, DrawingSession>();

export function getCurrentDrawingData(blockId: string, fallback = '') {
  const session = drawingSessions.get(blockId);
  return session?.snapshots[session.index] ?? fallback;
}

export const drawingBlockSpec = createReactBlockSpec(
  {
    type: 'drawing',
    propSchema: {
      drawingData: {
        default: '',
      },
      strokeColor: {
        default: DEFAULT_STROKE,
      },
      strokeWidth: {
        default: DEFAULT_LINE_WIDTH,
      },
      canvasHeight: {
        default: DEFAULT_CANVAS_HEIGHT,
      },
    },
    content: 'none',
  },
  {
    meta: {
      selectable: true,
    },
    render: DrawingBlock,
    toExternalHTML: DrawingBlockPreview,
  },
);

function DrawingBlock(props: any) {
  const { block, editor } = props;
  const isEditable = Boolean(editor.isEditable);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const initialData = String(block.props.drawingData ?? '');
  const sessionRef = useRef(getDrawingSession(block.id, initialData));
  const lastSavedData = useRef(initialData);
  const historyRef = useRef<string[]>(sessionRef.current.snapshots);
  const historyIndexRef = useRef(sessionRef.current.index);
  const [historyState, setHistoryState] = useState(() => getHistoryState(sessionRef.current));
  const strokeColor = String(block.props.strokeColor ?? DEFAULT_STROKE);
  const strokeWidth = Number(block.props.strokeWidth ?? DEFAULT_LINE_WIDTH);
  const canvasHeight = clampNumber(Number(block.props.canvasHeight ?? DEFAULT_CANVAS_HEIGHT), 220, 900);
  const drawingData = getCurrentDrawingData(block.id, String(block.props.drawingData ?? ''));
  const drawingStyle = { '--note-drawing-height': `${canvasHeight}px` } as CSSProperties;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const activeCanvas = canvas;

    function renderInitial() {
      resizeCanvas(activeCanvas);
      drawImageData(activeCanvas, getCurrentDrawingData(block.id, String(block.props.drawingData ?? '')));
    }

    renderInitial();
    const observer = new ResizeObserver(renderInitial);
    observer.observe(activeCanvas);
    return () => observer.disconnect();
  }, [block.id]);

  useEffect(() => {
    const value = String(block.props.drawingData ?? '');
    lastSavedData.current = value;
    if (historyRef.current.length <= 1 && historyRef.current[0] !== value) {
      historyRef.current = [value];
      historyIndexRef.current = 0;
      drawingSessions.set(block.id, { snapshots: historyRef.current, index: historyIndexRef.current });
      setHistoryState({ canUndo: false, canRedo: false });
    }
  }, [block.id, block.props.drawingData]);

  useEffect(
    () => () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    },
    [],
  );

  function beginStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (!isEditable || event.button !== 0) {
      return;
    }

    event.preventDefault();
    selectCurrentBlock();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPoint.current = getCanvasPoint(event);
  }

  function selectCurrentBlock() {
    window.dispatchEvent(new CustomEvent(DRAWING_BLOCK_SELECTED_EVENT, { detail: { blockId: block.id } }));
  }

  function continueStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPoint.current) {
      return;
    }

    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const nextPoint = getCanvasPoint(event);
    context.strokeStyle = strokeColor;
    context.lineWidth = Number.isFinite(strokeWidth) ? strokeWidth : DEFAULT_LINE_WIDTH;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    lastPoint.current = nextPoint;
  }

  function endStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();
    drawingRef.current = false;
    lastPoint.current = null;
    pushHistory(captureCanvas());
  }

  function clearDrawing() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    pushHistory('');
  }

  function undoDrawing() {
    if (historyIndexRef.current <= 0) {
      return;
    }

    historyIndexRef.current -= 1;
    applyHistorySnapshot(historyRef.current[historyIndexRef.current]);
  }

  function redoDrawing() {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }

    historyIndexRef.current += 1;
    applyHistorySnapshot(historyRef.current[historyIndexRef.current]);
  }

  function pushHistory(snapshot: string) {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (nextHistory[nextHistory.length - 1] === snapshot) {
      return;
    }

    nextHistory.push(snapshot);
    historyRef.current = nextHistory.slice(-MAX_HISTORY_LENGTH);
    historyIndexRef.current = historyRef.current.length - 1;
    syncHistoryState();
    scheduleSave(snapshot);
  }

  function applyHistorySnapshot(snapshot: string) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    drawImageData(canvas, snapshot);
    syncHistoryState();
    scheduleSave(snapshot);
  }

  function syncHistoryState() {
    const session = {
      snapshots: historyRef.current,
      index: historyIndexRef.current,
    };

    drawingSessions.set(block.id, session);
    setHistoryState(getHistoryState(session));
  }

  function scheduleSave(drawingData: string) {
    if (!isEditable || drawingData === lastSavedData.current) {
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(() => {
      lastSavedData.current = drawingData;
      window.dispatchEvent(new CustomEvent(DRAWING_BLOCK_DIRTY_EVENT, { detail: { blockId: block.id } }));
    }, DRAWING_SAVE_DELAY);
  }

  function captureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || isCanvasBlank(canvas)) {
      return '';
    }
    return canvas.toDataURL('image/png');
  }

  return (
    <div
      className={`note-simple-drawing-block${isEditable ? '' : ' read-only'}`}
      style={drawingStyle}
      onPointerDown={(event) => {
        if (isEditable) {
          selectCurrentBlock();
        }
        event.stopPropagation();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {isEditable ? (
        <div className="note-simple-drawing-toolbar">
          <button type="button" onClick={undoDrawing} disabled={!historyState.canUndo}>
            Undo
          </button>
          <button type="button" onClick={redoDrawing} disabled={!historyState.canRedo}>
            Redo
          </button>
          <button type="button" onClick={clearDrawing}>
            Clear
          </button>
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className="note-simple-drawing-canvas"
        aria-label="Drawing canvas"
        onPointerDown={beginStroke}
        onPointerMove={continueStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
      />
      {!isEditable && !drawingData ? <div className="note-simple-drawing-empty">No drawing yet</div> : null}
    </div>
  );
}

function getDrawingSession(blockId: string, initialData: string): DrawingSession {
  const existing = drawingSessions.get(blockId);
  if (existing) {
    return existing;
  }

  const session = {
    snapshots: [initialData],
    index: 0,
  };

  drawingSessions.set(blockId, session);
  return session;
}

function getHistoryState(session: DrawingSession) {
  return {
    canUndo: session.index > 0,
    canRedo: session.index < session.snapshots.length - 1,
  };
}

function DrawingBlockPreview(props: any) {
  const drawingData = String(props.block.props.drawingData ?? '');

  return (
    <div className="note-drawing-preview">
      <span>{drawingData ? 'Drawing saved' : 'Empty drawing'}</span>
    </div>
  );
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const previousData = canvas.width && canvas.height && !isCanvasBlank(canvas) ? canvas.toDataURL('image/png') : '';
  const nextWidth = Math.max(1, Math.floor(rect.width * ratio));
  const nextHeight = Math.max(1, Math.floor(rect.height * ratio));

  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  canvas.width = nextWidth;
  canvas.height = nextHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (previousData) {
    drawImageData(canvas, previousData);
  }
}

function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawImageData(canvas: HTMLCanvasElement, drawingData: string) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!isValidDrawingData(drawingData)) {
    return;
  }

  const image = new Image();
  image.onload = () => {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.restore();
  };
  image.onerror = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };
  image.src = drawingData;
}

function isValidDrawingData(value: string) {
  return value.startsWith('data:image/png;base64,') || value.startsWith('data:image/webp;base64,') || value.startsWith('data:image/jpeg;base64,');
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function isCanvasBlank(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) {
    return true;
  }

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] !== 0) {
      return false;
    }
  }
  return true;
}
