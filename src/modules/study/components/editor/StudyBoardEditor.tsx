import type { PointerEvent } from 'react';
import { useState } from 'react';
import type { StudyBlock, StudyBoardBlock, StudyBoardStroke } from '../../types';

interface StudyBoardEditorProps {
  block: StudyBoardBlock;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
}

export function StudyBoardEditor({ block, onChange }: StudyBoardEditorProps) {
  const [draft, setDraft] = useState<StudyBoardStroke | null>(null);
  const height = block.settings?.boardHeight ?? 360;

  function getPoint(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  return (
    <div className="study-board">
      <svg
        className="study-board-canvas"
        style={{ height }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDraft({ id: `stroke-${Date.now()}`, color: block.settings?.textColor ?? '#e5eef8', width: 0.8, points: [getPoint(event)] });
        }}
        onPointerMove={(event) => {
          if (!draft) {
            return;
          }
          setDraft({ ...draft, points: [...draft.points, getPoint(event)] });
        }}
        onPointerUp={() => {
          if (!draft) {
            return;
          }
          const stroke = draft;
          setDraft(null);
          onChange((item) => ({ ...(item as StudyBoardBlock), strokes: [...(item as StudyBoardBlock).strokes, stroke] }));
        }}
      >
        {[...block.strokes, ...(draft ? [draft] : [])].map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="study-board-toolbar">
        <button className="button ghost" type="button" onClick={() => onChange((item) => ({ ...(item as StudyBoardBlock), strokes: (item as StudyBoardBlock).strokes.slice(0, -1) }))}>
          Undo
        </button>
        <button className="button danger" type="button" onClick={() => onChange((item) => ({ ...(item as StudyBoardBlock), strokes: [] }))}>
          Clear
        </button>
      </div>
    </div>
  );
}
