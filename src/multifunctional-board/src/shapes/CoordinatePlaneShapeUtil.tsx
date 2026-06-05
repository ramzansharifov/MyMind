import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  resizeBox,
} from 'tldraw'
import type {
  Geometry2d,
  RecordProps,
  TLResizeInfo,
  TLShape,
} from 'tldraw'

export const COORDINATE_PLANE_SHAPE_TYPE = 'coordinate-plane' as const

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [COORDINATE_PLANE_SHAPE_TYPE]: {
      w: number
      h: number
      xMin: number
      xMax: number
      yMin: number
      yMax: number
      xStep: number
      yStep: number
      showGrid: boolean
      showAxes: boolean
      showLabels: boolean
    }
  }
}

export type CoordinatePlaneShape = TLShape<typeof COORDINATE_PLANE_SHAPE_TYPE>
export type CoordinatePlaneShapeProps = CoordinatePlaneShape['props']

function safeRange(min: number, max: number) {
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
    return { min, max }
  }

  return { min: -10, max: 10 }
}

function safeStep(step: number) {
  if (!Number.isFinite(step) || step <= 0) return 1
  return step
}

function buildTicks(min: number, max: number, step: number) {
  const ticks: number[] = []
  const normalizedStep = safeStep(step)
  const start = Math.ceil(min / normalizedStep) * normalizedStep
  const maxTickCount = 300

  for (
    let value = start, index = 0;
    value <= max + normalizedStep / 2 && index < maxTickCount;
    value += normalizedStep, index += 1
  ) {
    ticks.push(Number(value.toFixed(8)))
  }

  return ticks
}

function formatTick(value: number) {
  if (Math.abs(value) < 0.0000001) return '0'
  return Number(value.toFixed(4)).toString()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function CoordinatePlaneSvg({ shape }: { shape: CoordinatePlaneShape }) {
  const {
    w,
    h,
    xMin,
    xMax,
    yMin,
    yMax,
    xStep,
    yStep,
    showGrid,
    showAxes,
    showLabels,
  } = shape.props

  const width = Math.max(120, w)
  const height = Math.max(120, h)

  const xRange = safeRange(xMin, xMax)
  const yRange = safeRange(yMin, yMax)

  const xTicks = buildTicks(xRange.min, xRange.max, xStep)
  const yTicks = buildTicks(yRange.min, yRange.max, yStep)

  const xToPx = (x: number) =>
    ((x - xRange.min) / (xRange.max - xRange.min)) * width

  const yToPx = (y: number) =>
    height - ((y - yRange.min) / (yRange.max - yRange.min)) * height

  const hasXAxis = yRange.min <= 0 && yRange.max >= 0
  const hasYAxis = xRange.min <= 0 && xRange.max >= 0

  const xAxisY = hasXAxis ? yToPx(0) : height - 22
  const yAxisX = hasYAxis ? xToPx(0) : 28

  const xLabelY = clamp(xAxisY + 16, 14, height - 6)
  const yLabelX = clamp(yAxisX + 6, 6, width - 26)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="coordinate-plane-svg"
      role="img"
      aria-label="Coordinate plane"
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#ffffff"
        stroke="#94a3b8"
        strokeWidth={1.5}
      />

      {showGrid &&
        xTicks.map((x) => {
          const px = xToPx(x)

          return (
            <line
              key={`x-grid-${x}`}
              x1={px}
              y1={0}
              x2={px}
              y2={height}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          )
        })}

      {showGrid &&
        yTicks.map((y) => {
          const py = yToPx(y)

          return (
            <line
              key={`y-grid-${y}`}
              x1={0}
              y1={py}
              x2={width}
              y2={py}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          )
        })}

      {showAxes && hasXAxis && (
        <line
          x1={0}
          y1={xAxisY}
          x2={width}
          y2={xAxisY}
          stroke="#0f172a"
          strokeWidth={2}
        />
      )}

      {showAxes && hasYAxis && (
        <line
          x1={yAxisX}
          y1={0}
          x2={yAxisX}
          y2={height}
          stroke="#0f172a"
          strokeWidth={2}
        />
      )}

      {showAxes && hasXAxis && (
        <>
          <path
            d={`M ${width - 10} ${xAxisY - 5} L ${width - 2} ${xAxisY} L ${width - 10} ${xAxisY + 5}`}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x={width - 14}
            y={clamp(xAxisY - 8, 12, height - 12)}
            fill="#0f172a"
            fontSize={14}
            fontWeight={700}
            textAnchor="end"
          >
            x
          </text>
        </>
      )}

      {showAxes && hasYAxis && (
        <>
          <path
            d={`M ${yAxisX - 5} 10 L ${yAxisX} 2 L ${yAxisX + 5} 10`}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x={clamp(yAxisX + 10, 12, width - 12)}
            y={16}
            fill="#0f172a"
            fontSize={14}
            fontWeight={700}
          >
            y
          </text>
        </>
      )}

      {showLabels &&
        xTicks.map((x) => {
          if (Math.abs(x) < 0.0000001) return null

          return (
            <text
              key={`x-label-${x}`}
              x={xToPx(x)}
              y={xLabelY}
              fill="#334155"
              fontSize={11}
              textAnchor="middle"
            >
              {formatTick(x)}
            </text>
          )
        })}

      {showLabels &&
        yTicks.map((y) => {
          if (Math.abs(y) < 0.0000001) return null

          return (
            <text
              key={`y-label-${y}`}
              x={yLabelX}
              y={yToPx(y) - 4}
              fill="#334155"
              fontSize={11}
            >
              {formatTick(y)}
            </text>
          )
        })}

      {showLabels && hasXAxis && hasYAxis && (
        <text
          x={yAxisX + 6}
          y={xAxisY + 14}
          fill="#334155"
          fontSize={11}
        >
          0
        </text>
      )}
    </svg>
  )
}

export class CoordinatePlaneShapeUtil extends ShapeUtil<CoordinatePlaneShape> {
  static override type = COORDINATE_PLANE_SHAPE_TYPE

  static override props: RecordProps<CoordinatePlaneShape> = {
    w: T.number,
    h: T.number,
    xMin: T.number,
    xMax: T.number,
    yMin: T.number,
    yMax: T.number,
    xStep: T.number,
    yStep: T.number,
    showGrid: T.boolean,
    showAxes: T.boolean,
    showLabels: T.boolean,
  }

  override getDefaultProps(): CoordinatePlaneShape['props'] {
    return {
      w: 720,
      h: 480,
      xMin: -10,
      xMax: 10,
      yMin: -6,
      yMax: 6,
      xStep: 1,
      yStep: 1,
      showGrid: true,
      showAxes: true,
      showLabels: true,
    }
  }

  override canEdit() {
    return false
  }

  override canResize() {
    return true
  }

  override isAspectRatioLocked() {
    return false
  }

  override getGeometry(shape: CoordinatePlaneShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override onResize(shape: any, info: TLResizeInfo<any>) {
    return resizeBox(shape, info)
  }

  override component(shape: CoordinatePlaneShape) {
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          background: '#ffffff',
          overflow: 'hidden',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
        }}
      >
        <CoordinatePlaneSvg shape={shape} />
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: CoordinatePlaneShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}
