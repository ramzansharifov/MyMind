import { useMemo, useRef, useState, type PointerEvent } from "react";
import type {
  BoardPoint,
  BoardStroke,
  BoardStudyBlock,
} from "../../types/study";
import { createId } from "../../utils/ids";

interface BoardBlockProps {
  block: BoardStudyBlock;
  editable: boolean;
  onChange: (block: BoardStudyBlock) => void;
}

type BoardTool = "draw" | "pan" | "erase";

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

const DEFAULT_VIEW: ViewState = {
  x: 0,
  y: 0,
  scale: 1,
};

const BOARD_HEIGHT = 520;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

function pointsToPath(points: BoardPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      return `L ${point.x} ${point.y}`;
    })
    .join(" ");
}

function distanceToSegment(point: BoardPoint, a: BoardPoint, b: BoardPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy))
  );

  const projection = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function strokeHitTest(stroke: BoardStroke, point: BoardPoint): boolean {
  const points = stroke.points;

  if (points.length === 0) {
    return false;
  }

  if (points.length === 1) {
    return Math.hypot(points[0].x - point.x, points[0].y - point.y) <= stroke.width + 8;
  }

  for (let index = 1; index < points.length; index += 1) {
    const distance = distanceToSegment(point, points[index - 1], points[index]);

    if (distance <= stroke.width + 8) {
      return true;
    }
  }

  return false;
}

function getBounds(strokes: BoardStroke[]) {
  const allPoints = strokes.flatMap((stroke) => stroke.points);

  if (allPoints.length === 0) {
    return {
      minX: -500,
      minY: -350,
      maxX: 500,
      maxY: 350,
    };
  }

  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);

  return {
    minX: Math.min(...xs) - 80,
    minY: Math.min(...ys) - 80,
    maxX: Math.max(...xs) + 80,
    maxY: Math.max(...ys) + 80,
  };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export function BoardBlock({
  block,
  editable,
  onChange,
}: BoardBlockProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tool, setTool] = useState<BoardTool>("draw");
  const [lineWidth, setLineWidth] = useState(3);
  const [lineColor, setLineColor] = useState("#000000");
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [drawingStroke, setDrawingStroke] = useState<BoardStroke | null>(null);
  const [panning, setPanning] = useState<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startView: ViewState;
  } | null>(null);

  const viewBox = useMemo(() => {
    const width = 1200 / view.scale;
    const height = BOARD_HEIGHT / view.scale;

    return `${view.x - width / 2} ${view.y - height / 2} ${width} ${height}`;
  }, [view]);

  function getBoardPoint(event: PointerEvent<SVGSVGElement>): BoardPoint {
    const svg = svgRef.current;

    if (!svg) {
      return {
        x: 0,
        y: 0,
      };
    }

    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());

    return {
      x: transformed.x,
      y: transformed.y,
    };
  }

  function updateTitle(title: string) {
    onChange({
      ...block,
      title,
    });
  }

  function clearBoard() {
    if (!window.confirm("Очистить всю доску?")) {
      return;
    }

    onChange({
      ...block,
      strokes: [],
    });
  }

  function removeStrokeAt(point: BoardPoint) {
    const nextStrokes = block.strokes.filter((stroke) => !strokeHitTest(stroke, point));

    if (nextStrokes.length !== block.strokes.length) {
      onChange({
        ...block,
        strokes: nextStrokes,
      });
    }
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!editable) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "pan" || event.button === 1 || event.altKey || event.ctrlKey) {
      setPanning({
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startView: view,
      });

      return;
    }

    const point = getBoardPoint(event);

    if (tool === "erase") {
      removeStrokeAt(point);
      return;
    }

    const nextStroke: BoardStroke = {
      id: createId("stroke"),
      width: lineWidth,
      color: lineColor,
      points: [point],
    };

    setDrawingStroke(nextStroke);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (panning && panning.pointerId === event.pointerId) {
      const deltaX = (event.clientX - panning.startClientX) / view.scale;
      const deltaY = (event.clientY - panning.startClientY) / view.scale;

      setView({
        ...panning.startView,
        x: panning.startView.x - deltaX,
        y: panning.startView.y - deltaY,
      });

      return;
    }

    const point = getBoardPoint(event);

    if (tool === "erase" && event.buttons === 1) {
      removeStrokeAt(point);
      return;
    }

    if (!drawingStroke) {
      return;
    }

    const previousPoint = drawingStroke.points[drawingStroke.points.length - 1];

    if (previousPoint && Math.hypot(previousPoint.x - point.x, previousPoint.y - point.y) < 2) {
      return;
    }

    setDrawingStroke({
      ...drawingStroke,
      points: [...drawingStroke.points, point],
    });
  }

  function commitDrawingStroke() {
    if (!drawingStroke) {
      return;
    }

    if (drawingStroke.points.length > 0) {
      onChange({
        ...block,
        strokes: [...block.strokes, drawingStroke],
      });
    }

    setDrawingStroke(null);
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(null);
    commitDrawingStroke();
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.scale * zoomFactor));

    setView({
      ...view,
      scale: nextScale,
    });
  }

  function resetView() {
    setView(DEFAULT_VIEW);
  }

  async function exportPng() {
    const bounds = getBounds(block.strokes);
    const width = Math.max(400, bounds.maxX - bounds.minX);
    const height = Math.max(300, bounds.maxY - bounds.minY);

    const strokePaths = block.strokes
      .map((stroke) => {
        return `<path d="${pointsToPath(stroke.points)}" fill="none" stroke="${stroke.color || "#000000"}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />`;
      })
      .join("");

    const svgMarkup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.minX} ${bounds.minY} ${width} ${height}">
        <rect x="${bounds.minX}" y="${bounds.minY}" width="${width}" height="${height}" fill="white" />
        ${strokePaths}
      </svg>
    `;

    const svgBlob = new Blob([svgMarkup], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        window.alert("Не удалось создать PNG.");
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0);

      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(url);

        if (!pngBlob) {
          window.alert("Не удалось экспортировать PNG.");
          return;
        }

        downloadBlob(pngBlob, `${block.title || "board"}.png`);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      window.alert("Не удалось подготовить изображение.");
    };

    image.src = url;
  }

  const visibleStrokes = drawingStroke
    ? [...block.strokes, drawingStroke]
    : block.strokes;

  return (
    <div className="border border-black bg-white">
      <div className="border-b border-black bg-neutral-100 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editable ? (
            <input
              value={block.title}
              onChange={(event) => updateTitle(event.target.value)}
              className="min-w-[220px] flex-1 border border-black bg-white px-3 py-2 text-sm font-bold outline-none"
              placeholder="Название доски"
            />
          ) : (
            <h3 className="font-bold">{block.title}</h3>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetView}
              className="border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
            >
              Reset view
            </button>

            <button
              type="button"
              onClick={exportPng}
              className="border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
            >
              Export PNG
            </button>
          </div>
        </div>

        {editable && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTool("draw")}
              className={
                tool === "draw"
                  ? "border border-black bg-black px-3 py-2 text-sm text-white"
                  : "border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
              }
            >
              Draw
            </button>

            <button
              type="button"
              onClick={() => setTool("pan")}
              className={
                tool === "pan"
                  ? "border border-black bg-black px-3 py-2 text-sm text-white"
                  : "border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
              }
            >
              Pan
            </button>

            <button
              type="button"
              onClick={() => setTool("erase")}
              className={
                tool === "erase"
                  ? "border border-black bg-black px-3 py-2 text-sm text-white"
                  : "border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
              }
            >
              Eraser
            </button>

            <label className="flex items-center gap-2 border border-black bg-white px-3 py-2 text-sm">
              Width
              <input
                type="range"
                min={1}
                max={24}
                value={lineWidth}
                onChange={(event) => setLineWidth(Number(event.target.value))}
              />
              <span className="w-6 text-right">{lineWidth}</span>
            </label>

            <label className="flex items-center gap-2 border border-black bg-white px-3 py-2 text-sm">
              Color
              <input
                type="color"
                value={lineColor}
                onChange={(event) => setLineColor(event.target.value)}
                className="h-6 w-10"
              />
            </label>

            <button
              type="button"
              onClick={clearBoard}
              className="border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
            >
              Clear
            </button>

            <span className="text-xs text-neutral-600">
              Wheel — zoom. Pan tool / Alt / Ctrl — move.
            </span>
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className={[
          "block w-full touch-none bg-white",
          editable && tool === "draw" ? "cursor-crosshair" : "",
          editable && tool === "erase" ? "cursor-not-allowed" : "",
          editable && tool === "pan" ? "cursor-grab" : "",
        ].join(" ")}
        style={{
          height: BOARD_HEIGHT,
        }}
      >
        <defs>
          <pattern
            id={`grid-small-${block.id}`}
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 25 0 L 0 0 0 25"
              fill="none"
              stroke="#e5e5e5"
              strokeWidth="1"
            />
          </pattern>

          <pattern
            id={`grid-large-${block.id}`}
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="100"
              height="100"
              fill={`url(#grid-small-${block.id})`}
            />
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="#cfcfcf"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect
          x="-100000"
          y="-100000"
          width="200000"
          height="200000"
          fill={`url(#grid-large-${block.id})`}
        />

        {visibleStrokes.map((stroke) => (
          <path
            key={stroke.id}
            d={pointsToPath(stroke.points)}
            fill="none"
            stroke={stroke.color || "#000000"}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
