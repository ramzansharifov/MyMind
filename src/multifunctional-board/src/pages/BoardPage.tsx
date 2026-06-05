import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  Tldraw,
  createShapeId,
  getSnapshot,
  loadSnapshot,
} from 'tldraw'
import type { Editor, TLShapeId } from 'tldraw'
import 'tldraw/tldraw.css'
import '../App.css'
import {
  COORDINATE_PLANE_SHAPE_TYPE,
  CoordinatePlaneShapeUtil,
} from '../shapes/CoordinatePlaneShapeUtil'
import type {
  CoordinatePlaneShape,
  CoordinatePlaneShapeProps,
} from '../shapes/CoordinatePlaneShapeUtil'

const customShapeUtils = [CoordinatePlaneShapeUtil]

type NumberPlaneProp =
  | 'w'
  | 'h'
  | 'xMin'
  | 'xMax'
  | 'yMin'
  | 'yMax'
  | 'xStep'
  | 'yStep'

type BooleanPlaneProp = 'showGrid' | 'showAxes' | 'showLabels'

function isCoordinatePlaneShape(shape: unknown): shape is CoordinatePlaneShape {
  return Boolean(
    shape &&
      typeof shape === 'object' &&
      'type' in shape &&
      shape.type === COORDINATE_PLANE_SHAPE_TYPE
  )
}

function NumberSetting({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-xs text-slate-300">
      <span>{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
      />
    </label>
  )
}

function ToggleSetting({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-violet-500"
      />
    </label>
  )
}

export function BoardPage() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [activePlaneId, setActivePlaneId] = useState<TLShapeId | null>(null)
  const [, forceRender] = useState(0)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activePlane =
    editor && activePlaneId
      ? editor.getShape(activePlaneId)
      : null

  const selectedPlane = isCoordinatePlaneShape(activePlane)
    ? activePlane
    : null

  function refreshUi() {
    forceRender((value) => value + 1)
  }

  function createFileName() {
    const date = new Date()
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-')

    return `board-${date}.json`
  }

  function saveBoardAsJson() {
    if (!editor) {
      alert('Доска ещё не готова')
      return
    }

    const snapshot = getSnapshot(editor.store)

    const exportData = {
      app: 'multifunctional-board',
      type: 'tldraw-board',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      snapshot,
    }

    const json = JSON.stringify(exportData, null, 2)

    const blob = new Blob([json], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = createFileName()
    link.click()

    URL.revokeObjectURL(url)
  }

  function openJsonFilePicker() {
    fileInputRef.current?.click()
  }

  async function loadBoardFromJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) return

    if (!editor) {
      alert('Доска ещё не готова')
      return
    }

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const snapshot = data.snapshot ?? data

      loadSnapshot(editor.store, snapshot)
      setActivePlaneId(null)
      refreshUi()

      requestAnimationFrame(() => {
        editor.focus()
      })
    } catch (error) {
      console.error(error)
      alert('Не получилось загрузить JSON-файл. Возможно, файл повреждён или имеет неправильный формат.')
    }
  }

  function addCoordinatePlane() {
    if (!editor) return

    const id = createShapeId()

    editor.createShape({
      id,
      type: COORDINATE_PLANE_SHAPE_TYPE,
      x: 120,
      y: 120,
    } as any)

    editor.select(id)
    setActivePlaneId(id)
    refreshUi()
  }

  function useSelectedPlaneForSettings() {
    if (!editor) return

    const shape = editor.getOnlySelectedShape()

    if (!isCoordinatePlaneShape(shape)) {
      alert('Выбери одну координатную плоскость на доске')
      return
    }

    setActivePlaneId(shape.id)
    refreshUi()
  }

  function updatePlaneProps(patch: Partial<CoordinatePlaneShapeProps>) {
    if (!editor || !selectedPlane) return

    const nextProps = {
      ...selectedPlane.props,
      ...patch,
    }

    editor.updateShape({
      id: selectedPlane.id,
      type: COORDINATE_PLANE_SHAPE_TYPE,
      props: nextProps,
    } as any)

    refreshUi()
  }

  function updateNumberProp(prop: NumberPlaneProp, rawValue: string) {
    const value = Number(rawValue)

    if (!Number.isFinite(value)) return

    let normalizedValue = value

    if (prop === 'w') normalizedValue = Math.max(120, value)
    if (prop === 'h') normalizedValue = Math.max(120, value)
    if (prop === 'xStep') normalizedValue = Math.max(0.1, Math.abs(value))
    if (prop === 'yStep') normalizedValue = Math.max(0.1, Math.abs(value))

    updatePlaneProps({
      [prop]: normalizedValue,
    } as Partial<CoordinatePlaneShapeProps>)
  }

  function updateBooleanProp(prop: BooleanPlaneProp, checked: boolean) {
    updatePlaneProps({
      [prop]: checked,
    } as Partial<CoordinatePlaneShapeProps>)
  }

  return (
    <section className="relative h-[calc(100vh-56px)] w-full">
      <div className="absolute left-4 top-4 z-50 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
        <button
          onClick={addCoordinatePlane}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!editor}
        >
          Add Plane
        </button>

        <button
          onClick={useSelectedPlaneForSettings}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!editor}
        >
          Edit Selected Plane
        </button>

        <button
          onClick={saveBoardAsJson}
          className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!editor}
        >
          Save JSON
        </button>

        <button
          onClick={openJsonFilePicker}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!editor}
        >
          Load JSON
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={loadBoardFromJson}
          className="hidden"
        />
      </div>

      <Tldraw
        shapeUtils={customShapeUtils}
        persistenceKey="multifunctional-board-main"
        onMount={(editorInstance) => {
          setEditor(editorInstance)
        }}
      />

      {selectedPlane && (
        <aside className="absolute right-4 top-4 z-50 w-80 rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">
              Coordinate Plane Settings
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Настройки выбранной координатной плоскости.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberSetting
              label="Width"
              value={selectedPlane.props.w}
              onChange={(value) => updateNumberProp('w', value)}
            />

            <NumberSetting
              label="Height"
              value={selectedPlane.props.h}
              onChange={(value) => updateNumberProp('h', value)}
            />

            <NumberSetting
              label="X min"
              value={selectedPlane.props.xMin}
              onChange={(value) => updateNumberProp('xMin', value)}
            />

            <NumberSetting
              label="X max"
              value={selectedPlane.props.xMax}
              onChange={(value) => updateNumberProp('xMax', value)}
            />

            <NumberSetting
              label="Y min"
              value={selectedPlane.props.yMin}
              onChange={(value) => updateNumberProp('yMin', value)}
            />

            <NumberSetting
              label="Y max"
              value={selectedPlane.props.yMax}
              onChange={(value) => updateNumberProp('yMax', value)}
            />

            <NumberSetting
              label="X step"
              value={selectedPlane.props.xStep}
              onChange={(value) => updateNumberProp('xStep', value)}
            />

            <NumberSetting
              label="Y step"
              value={selectedPlane.props.yStep}
              onChange={(value) => updateNumberProp('yStep', value)}
            />
          </div>

          <div className="mt-4 grid gap-2">
            <ToggleSetting
              label="Show grid"
              checked={selectedPlane.props.showGrid}
              onChange={(checked) => updateBooleanProp('showGrid', checked)}
            />

            <ToggleSetting
              label="Show axes"
              checked={selectedPlane.props.showAxes}
              onChange={(checked) => updateBooleanProp('showAxes', checked)}
            />

            <ToggleSetting
              label="Show labels"
              checked={selectedPlane.props.showLabels}
              onChange={(checked) => updateBooleanProp('showLabels', checked)}
            />
          </div>
        </aside>
      )}
    </section>
  )
}
