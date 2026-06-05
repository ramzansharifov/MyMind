import type { Value } from 'platejs'
import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react'
import {
  Plate,
  PlateContent,
  PlateElement,
  usePlateEditor,
  type PlateElementProps,
} from 'platejs/react'

const NOTES_STORAGE_KEY = 'multifunctional-board-plate-note'

const initialValue: Value = [
  {
    type: 'h2',
    children: [{ text: 'Новая заметка' }],
  },
  {
    type: 'p',
    children: [
      {
        text: 'Здесь можно писать полноценные заметки прямо рядом с доской.',
      },
    ],
  },
  {
    type: 'p',
    children: [
      {
        text: 'Пока это отдельная панель. Потом мы сможем превратить заметку в отдельную фигуру внутри tldraw.',
      },
    ],
  },
]

function H1Element(props: PlateElementProps) {
  return (
    <PlateElement
      as="h1"
      className="mb-3 mt-4 text-3xl font-bold tracking-tight text-slate-950"
      {...props}
    />
  )
}

function H2Element(props: PlateElementProps) {
  return (
    <PlateElement
      as="h2"
      className="mb-2 mt-4 text-2xl font-bold tracking-tight text-slate-950"
      {...props}
    />
  )
}

function H3Element(props: PlateElementProps) {
  return (
    <PlateElement
      as="h3"
      className="mb-2 mt-3 text-xl font-semibold tracking-tight text-slate-950"
      {...props}
    />
  )
}

function BlockquoteElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="blockquote"
      className="my-3 border-l-4 border-violet-400 bg-violet-50 px-4 py-2 text-slate-700"
      {...props}
    />
  )
}

function ToolbarButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
    >
      {children}
    </button>
  )
}

export function NotesPanel({ onClose }: { onClose: () => void }) {
  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      H1Plugin.withComponent(H1Element),
      H2Plugin.withComponent(H2Element),
      H3Plugin.withComponent(H3Element),
      BlockquotePlugin.withComponent(BlockquoteElement),
    ],
    value: () => {
      const savedValue = localStorage.getItem(NOTES_STORAGE_KEY)
      return savedValue ? JSON.parse(savedValue) : initialValue
    },
  })

  function resetNote() {
    editor.tf.setValue(initialValue)
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(initialValue))
  }

  function exportNoteJson() {
    const value = editor.children

    const exportData = {
      app: 'multifunctional-board',
      type: 'plate-note',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      value,
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `note-${new Date()
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-')}.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <aside
      className="absolute left-4 top-4 z-50 flex h-[calc(100vh-88px)] w-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-950">
            Plate Notes
          </h2>
          <p className="text-xs text-slate-500">
            Rich-text заметка рядом с доской
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <Plate
        editor={editor}
        onChange={({ value }) => {
          localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(value))
        }}
      >
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <ToolbarButton onClick={() => editor.tf.h1.toggle()}>
            H1
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.tf.h2.toggle()}>
            H2
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.tf.h3.toggle()}>
            H3
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.tf.blockquote.toggle()}>
            Quote
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.tf.bold.toggle()}>
            Bold
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.tf.italic.toggle()}>
            Italic
          </ToolbarButton>

          <ToolbarButton onClick={() => editor.tf.underline.toggle()}>
            Underline
          </ToolbarButton>

          <ToolbarButton onClick={resetNote}>
            Reset
          </ToolbarButton>

          <ToolbarButton onClick={exportNoteJson}>
            Export JSON
          </ToolbarButton>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <PlateContent
            className="min-h-full px-6 py-5 text-base leading-7 text-slate-800 outline-none"
            placeholder="Напиши заметку..."
          />
        </div>
      </Plate>
    </aside>
  )
}
