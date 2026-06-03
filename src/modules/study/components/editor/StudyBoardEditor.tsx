import { type PointerEvent, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { createId } from '../../studyUtils';
import type { StudyBlock, StudyBoardBlock, StudyBoardStroke, StudyBoardStrokePoint } from '../../types';

interface StudyBoardEditorProps {
  block: StudyBoardBlock;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

const DEFAULT_VIEW: ViewState = { x: 400, y: 240, scale: 1 };
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export function StudyBoardEditor({ block, onChange }: StudyBoardEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [draft, setDraft] = useState<StudyBoardStroke | null>(null);
  const [tool, setTool] = useState<'draw' | 'pan' | 'erase'>('draw');
  const [panning, setPanning] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    startView: ViewState;
  } | null>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 480 });

  const height = block.settings?.boardHeight ?? 480;

  useEffect(() => {
    if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setDimensions({ width: rect.width, height: rect.height });
        }
    }
  }, [height]);

  const viewBox = useMemo(() => {
    const w = dimensions.width / view.scale;
    const h = dimensions.height / view.scale;
    return `${view.x - w / 2} ${view.y - h / 2} ${w} ${h}`;
  }, [view, dimensions]);

  function getPoint(event: PointerEvent<SVGSVGElement>): StudyBoardStrokePoint {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const transformed = p.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (tool === 'pan' || event.button === 1 || event.altKey || event.ctrlKey) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setPanning({
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startView: view,
      });
      return;
    }

    if (tool === 'draw') {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDraft({
        id: createId('stroke'),
        color: block.settings?.textColor ?? 'currentColor',
        width: 0.8,
        points: [getPoint(event)],
      });
    }

    if (tool === 'erase') {
        const point = getPoint(event);
        removeStrokeAt(point);
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (panning && panning.pointerId === event.pointerId) {
      const dx = (event.clientX - panning.startX) / view.scale;
      const dy = (event.clientY - panning.startY) / view.scale;
      setView({
        ...panning.startView,
        x: panning.startView.x - dx,
        y: panning.startView.y - dy,
      });
      return;
    }

    if (draft) {
      setDraft({ ...draft, points: [...draft.points, getPoint(event)] });
    }

    if (tool === 'erase' && event.buttons === 1) {
        removeStrokeAt(getPoint(event));
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (panning) {
      setPanning(null);
    }
    if (draft) {
      const stroke = draft;
      setDraft(null);
      if (stroke.points.length > 1) {
        onChange((item) => ({
          ...(item as StudyBoardBlock),
          strokes: [...(item as StudyBoardBlock).strokes, stroke],
        }));
      }
    }
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const zoom = event.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.scale * zoom));
    setView({ ...view, scale: nextScale });
  }

  function removeStrokeAt(point: StudyBoardStrokePoint) {
      onChange(item => {
          const board = item as StudyBoardBlock;
          const nextStrokes = board.strokes.filter(s => !isPointNearStroke(point, s));
          return { ...board, strokes: nextStrokes };
      });
  }

  function isPointNearStroke(point: StudyBoardStrokePoint, stroke: StudyBoardStroke): boolean {
      const threshold = 10 / view.scale;
      return stroke.points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < threshold);
  }

  return (
    <div className="study-board">
      <div className="study-board-toolbar">
        <div className="tabs-pill">
            <button className={tool === 'draw' ? 'active' : ''} onClick={() => setTool('draw')}>Draw</button>
            <button className={tool === 'pan' ? 'active' : ''} onClick={() => setTool('pan')}>Pan</button>
            <button className={tool === 'erase' ? 'active' : ''} onClick={() => setTool('erase')}>Eraser</button>
        </div>
        <button className="button ghost subtle" onClick={() => setView(DEFAULT_VIEW)}>Reset View</button>
        <div className="study-inline-actions">
          <button
            className="button ghost"
            type="button"
            onClick={() => onChange((item) => ({ ...(item as StudyBoardBlock), strokes: (item as StudyBoardBlock).strokes.slice(0, -1) }))}
          >
            Undo
          </button>
          <button
            className="button danger"
            type="button"
            onClick={() => { if(window.confirm('Clear board?')) onChange((item) => ({ ...(item as StudyBoardBlock), strokes: [] })); }}
          >
            Clear
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className={`study-board-canvas tool-${tool}`}
        style={{ height }}
        viewBox={viewBox}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--border-soft)" strokeWidth="0.5"/>
            </pattern>
        </defs>
        <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#grid)" />
        {block.strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {draft && (
          <polyline
            points={draft.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={draft.color}
            strokeWidth={draft.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="study-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
        Wheel to zoom. Alt/Ctrl or Pan tool to move. Eraser tool to remove strokes.
      </div>
    </div>
  );
}
