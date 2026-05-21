import { createBlockConfig, createBlockSpec } from '@blocknote/core';

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

type DrawingPoint = {
  x: number;
  y: number;
};

const drawingSessions = new Map<string, DrawingSession>();

export function getCurrentDrawingData(blockId: string, fallback = '') {
  const session = drawingSessions.get(blockId);
  return session?.snapshots[session.index] ?? fallback;
}

export function setCurrentDrawingData(blockId: string, drawingData: string) {
  const existing = drawingSessions.get(blockId);
  if (existing) {
    existing.snapshots = [drawingData];
    existing.index = 0;
    return;
  }

  drawingSessions.set(blockId, {
    snapshots: [drawingData],
    index: 0,
  });
}

const drawingBlockConfig = createBlockConfig(
  () =>
    ({
      type: 'drawing' as const,
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
    }) as const,
);

export const drawingBlockSpec = createBlockSpec(drawingBlockConfig, () => ({
  meta: {
    selectable: true,
  },
  render(block, editor) {
    const isEditable = Boolean((editor as any).isEditable);
    const canvasHeight = clampNumber(Number(block.props.canvasHeight ?? DEFAULT_CANVAS_HEIGHT), 220, 900);
    const initialData = String(block.props.drawingData ?? '');
    const session = getDrawingSession(block.id, initialData);

    const root = document.createElement('div');
    root.className = `note-simple-drawing-block${isEditable ? '' : ' read-only'}`;
    root.style.setProperty('--note-drawing-height', `${canvasHeight}px`);
    root.contentEditable = 'false';

    let saveTimer: number | null = null;
    let drawing = false;
    let lastPoint: DrawingPoint | null = null;
    let lastSavedData = getCurrentDrawingData(block.id, initialData);

    const canvas = document.createElement('canvas');
    canvas.className = 'note-simple-drawing-canvas';
    canvas.setAttribute('aria-label', 'Drawing canvas');

    let undoButton: HTMLButtonElement | null = null;
    let redoButton: HTMLButtonElement | null = null;

    if (isEditable) {
      const toolbar = document.createElement('div');
      toolbar.className = 'note-simple-drawing-toolbar';

      undoButton = createToolbarButton('Undo', () => {
        if (session.index <= 0) {
          return;
        }

        session.index -= 1;
        applySnapshot(session.snapshots[session.index]);
      });

      redoButton = createToolbarButton('Redo', () => {
        if (session.index >= session.snapshots.length - 1) {
          return;
        }

        session.index += 1;
        applySnapshot(session.snapshots[session.index]);
      });

      const clearButton = createToolbarButton('Clear', () => {
        const context = getCanvasContext(canvas);
        if (!context) {
          return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        pushHistory('');
      });

      toolbar.append(undoButton, redoButton, clearButton);
      root.append(toolbar);
    }

    root.append(canvas);

    const empty = document.createElement('div');
    empty.className = 'note-simple-drawing-empty';
    empty.textContent = 'No drawing yet';

    if (!isEditable && !getCurrentDrawingData(block.id, initialData)) {
      root.append(empty);
    }

    function renderCanvas() {
      resizeCanvas(canvas);
      drawImageData(canvas, getCurrentDrawingData(block.id, initialData));
      syncButtons();
    }

    renderCanvas();
    const observer = new ResizeObserver(renderCanvas);
    observer.observe(canvas);

    root.addEventListener('pointerdown', (event) => {
      if (isEditable) {
        window.dispatchEvent(new CustomEvent(DRAWING_BLOCK_SELECTED_EVENT, { detail: { blockId: block.id } }));
      }
      event.stopPropagation();
    });

    canvas.addEventListener('pointerdown', (event) => {
      if (!isEditable || event.button !== 0) {
        return;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      drawing = true;
      lastPoint = getCanvasPoint(canvas, event);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!drawing || !lastPoint) {
        return;
      }

      event.preventDefault();
      const context = getCanvasContext(canvas);
      if (!context) {
        return;
      }

      const nextPoint = getCanvasPoint(canvas, event);
      context.strokeStyle = String(block.props.strokeColor ?? DEFAULT_STROKE);
      context.lineWidth = Number(block.props.strokeWidth ?? DEFAULT_LINE_WIDTH);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(nextPoint.x, nextPoint.y);
      context.stroke();
      lastPoint = nextPoint;
    });

    function finishStroke(event: PointerEvent) {
      if (!drawing) {
        return;
      }

      event.preventDefault();
      drawing = false;
      lastPoint = null;
      pushHistory(captureCanvas(canvas));
    }

    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
    canvas.addEventListener('pointerleave', finishStroke);

    function pushHistory(snapshot: string) {
      const nextHistory = session.snapshots.slice(0, session.index + 1);
      if (nextHistory[nextHistory.length - 1] === snapshot) {
        return;
      }

      nextHistory.push(snapshot);
      session.snapshots = nextHistory.slice(-MAX_HISTORY_LENGTH);
      session.index = session.snapshots.length - 1;
      drawingSessions.set(block.id, session);
      syncButtons();
      scheduleSave(snapshot);
    }

    function applySnapshot(snapshot: string) {
      drawImageData(canvas, snapshot);
      drawingSessions.set(block.id, session);
      syncButtons();
      scheduleSave(snapshot);
    }

    function syncButtons() {
      if (undoButton) {
        undoButton.disabled = session.index <= 0;
      }

      if (redoButton) {
        redoButton.disabled = session.index >= session.snapshots.length - 1;
      }
    }

    function scheduleSave(drawingData: string) {
      if (!isEditable || drawingData === lastSavedData) {
        return;
      }

      if (saveTimer) {
        window.clearTimeout(saveTimer);
      }

      saveTimer = window.setTimeout(() => {
        lastSavedData = drawingData;
        window.dispatchEvent(new CustomEvent(DRAWING_BLOCK_DIRTY_EVENT, { detail: { blockId: block.id } }));
      }, DRAWING_SAVE_DELAY);
    }

    return {
      dom: root,
      destroy: () => {
        observer.disconnect();
        if (saveTimer) {
          window.clearTimeout(saveTimer);
        }
      },
      stopEvent: (event: Event) => root.contains(event.target as Node),
    };
  },
  toExternalHTML(block) {
    const root = document.createElement('div');
    root.className = 'note-drawing-preview';
    root.textContent = String(block.props.drawingData ?? '') ? 'Drawing saved' : 'Empty drawing';
    return { dom: root };
  },
}));

function createToolbarButton(label: string, onClick: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
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

  const context = getCanvasContext(canvas);
  if (!context) {
    return;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (previousData) {
    drawImageData(canvas, previousData);
  }
}

function getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawImageData(canvas: HTMLCanvasElement, drawingData: string) {
  const context = getCanvasContext(canvas);
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

function captureCanvas(canvas: HTMLCanvasElement) {
  if (isCanvasBlank(canvas)) {
    return '';
  }
  return canvas.toDataURL('image/png');
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

function getCanvasContext(canvas: HTMLCanvasElement) {
  return canvas.getContext('2d', { willReadFrequently: true });
}

function isCanvasBlank(canvas: HTMLCanvasElement) {
  const context = getCanvasContext(canvas);
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
