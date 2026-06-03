import { useEffect, useState, useMemo } from 'react';
import type {
  StudyBlock,
  StudyBlockSettings,
  StudyCustomBlockTemplate,
  StudyMaterial,
  StudyNode,
  StudyBlockTextAlign,
} from '../../types';
import {
  emitTableCommand,
  listenTableSelectionChanged,
  type TableCellSelection,
} from '../../utils/tableEvents';
import { getStudyBlockLabel } from '../../studyUtils';
import type {
  RichTextActiveMarks,
  RichTextCommandType,
} from './StudyRichTextEditor';

interface StudySettingsPanelProps {
  block: StudyBlock | null;
  nodes?: StudyNode[];
  richTextMarks?: RichTextActiveMarks;
  onRichTextCommand?: (command: RichTextCommandType, value?: string) => void;
  onChangeSettings: (settings: StudyBlockSettings) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function getToolButtonClass(active: boolean): string {
  return active ? 'active' : '';
}

export function StudySettingsPanel({
  block,
  nodes = [],
  richTextMarks,
  onRichTextCommand,
  onChangeSettings,
  onDuplicate,
  onDelete,
}: StudySettingsPanelProps) {
  const [inlineFontSize, setInlineFontSize] = useState(16);
  const [tableSelection, setTableSelection] = useState<TableCellSelection | null>(null);

  useEffect(() => {
    setTableSelection(null);
  }, [block?.id]);

  useEffect(() => {
    return listenTableSelectionChanged((selection) => {
      if (!block || block.type !== 'table') {
        setTableSelection(null);
        return;
      }
      if (!selection) {
        return;
      }
      if (selection.blockId === block.id) {
        setTableSelection(selection);
      }
    });
  }, [block?.id, block?.type]);

  if (!block) {
    return (
      <aside className="study-side-panel glass-panel">
        <h3>Block settings</h3>
        <p className="study-muted">Select a block to edit its settings.</p>
      </aside>
    );
  }

  const settings = block.settings ?? {};

  function updateSetting<K extends keyof StudyBlockSettings>(
    key: K,
    value: StudyBlockSettings[K]
  ) {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  }

  function runRichCommand(command: RichTextCommandType, value?: string) {
    onRichTextCommand?.(command, value);
  }

  function runTableCommand(type: Parameters<typeof emitTableCommand>[1], value?: number | string) {
    if (!block) {
      return;
    }
    emitTableCommand(block.id, type, value);
  }

  const marks = richTextMarks ?? {
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    unorderedList: false,
    orderedList: false,
    quote: false,
    link: false,
    linkHref: "",
    listStyle: "disc",
    textColor: "",
    backgroundColor: "",
    textAlign: "left",
    fontSize: "",
  };

  const isTable = block.type === 'table';
  const showRichTools = block.type === 'text' || isTable;
  const hasSelectedTableCell = Boolean(isTable && tableSelection);

  return (
    <aside className="study-side-panel glass-panel">
      <h3>Block settings</h3>
      <div className="study-setting-info">
        <span>Type</span>
        <strong>{getStudyBlockLabel(block.type)}</strong>
      </div>

      <div className="study-settings-content">
        {isTable && (
          <div className="study-table-settings">
             <div className="study-choice-row">
                <button
                    type="button"
                    onClick={() => runTableCommand("toggleHeader")}
                    className={`button ghost ${getToolButtonClass(block.hasHeader)}`}
                >
                    Header
                </button>
                <button
                    type="button"
                    onClick={() => runTableCommand("exportCsv")}
                    className="button ghost"
                >
                    Export CSV
                </button>
             </div>

             <div className="study-grid-actions">
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addRowAbove")} className="button ghost">Row above</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addRowBelow")} className="button ghost">Row below</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("deleteRow")} className="button ghost">Delete row</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("moveRowUp")} className="button ghost">Row up</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("moveRowDown")} className="button ghost">Row down</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addColumnLeft")} className="button ghost">Col left</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addColumnRight")} className="button ghost">Col right</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("deleteColumn")} className="button ghost">Delete col</button>
             </div>

             {tableSelection && (
                <div className="study-cell-settings">
                   <label className="study-range-field">
                      <span>Col Width</span>
                      <input type="range" min={80} max={600} value={tableSelection.columnWidth} onChange={(e) => runTableCommand("setColumnWidth", Number(e.target.value))} />
                   </label>

                   <div className="study-choice-row">
                      <button type="button" onClick={() => runTableCommand("mergeSelectedCells")} className="button ghost">Merge</button>
                      <button type="button" onClick={() => runTableCommand("splitSelectedCells")} className="button ghost">Split</button>
                   </div>

                   <div className="study-color-row">
                      <span>Cell BG</span>
                      <input type="color" defaultValue={tableSelection.cellStyle?.backgroundColor ?? "#ffffff"} onChange={(e) => runTableCommand("setCellBackgroundColor", e.target.value)} />
                   </div>
                   <div className="study-color-row">
                      <span>Cell Text</span>
                      <input type="color" defaultValue={tableSelection.cellStyle?.textColor ?? "#000000"} onChange={(e) => runTableCommand("setCellTextColor", e.target.value)} />
                   </div>

                   <div className="study-choice-row">
                      {(['left', 'center', 'right'] as const).map(align => (
                        <button key={align} type="button" onClick={() => runTableCommand("setCellTextAlign", align)} className={`button ghost ${getToolButtonClass((tableSelection.cellStyle?.textAlign ?? 'left') === align)}`}>{align}</button>
                      ))}
                   </div>
                </div>
             )}
          </div>
        )}

        {showRichTools && (
          <div className="study-rich-formatting">
            <div className="study-choice-row">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("bold")} className={`button ghost ${getToolButtonClass(marks.bold)}`}>B</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("italic")} className={`button ghost ${getToolButtonClass(marks.italic)}`}>I</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("underline")} className={`button ghost ${getToolButtonClass(marks.underline)}`}>U</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("strikeThrough")} className={`button ghost ${getToolButtonClass(marks.strikeThrough)}`}>S</button>
            </div>

            <div className="study-font-size-tool">
               <input type="number" min={8} max={72} value={inlineFontSize} onChange={(e) => setInlineFontSize(Number(e.target.value))} />
               <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("fontSize", String(inlineFontSize))} className="button ghost">Apply Size</button>
            </div>

            <div className="study-choice-row">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("unorderedList", "disc")} className="button ghost">UL</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("orderedList", "decimal")} className="button ghost">OL</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("unorderedList", "checkbox-list")} className="button ghost">Check</button>
            </div>
          </div>
        )}

        {block.type === 'heading' && (
           <div className="study-choice-row">
              {(['h1', 'h2', 'h3'] as const).map(style => (
                <button key={style} type="button" onClick={() => updateSetting("headingStyle", style)} className={`button ghost ${getToolButtonClass(settings.headingStyle === style)}`}>{style.toUpperCase()}</button>
              ))}
           </div>
        )}

        <label className="study-range-field">
          <span>Font size</span>
          <input type="range" min={12} max={64} value={settings.fontSize ?? 16} onChange={(e) => updateSetting("fontSize", Number(e.target.value))} />
        </label>

        <div className="study-color-row">
          <span>Text color</span>
          <input type="color" value={settings.textColor ?? "#000000"} onChange={(e) => updateSetting("textColor", e.target.value)} />
        </div>

        <div className="study-color-row">
           <span>Background</span>
           <input type="color" value={settings.backgroundColor ?? "#ffffff"} onChange={(e) => updateSetting("backgroundColor", e.target.value)} />
        </div>

        <label className="study-range-field">
          <span>Padding</span>
          <input type="range" min={0} max={48} value={settings.padding ?? 18} onChange={(e) => updateSetting("padding", Number(e.target.value))} />
        </label>

        <div className="study-choice-row">
          {(['left', 'center', 'right'] as const).map(align => (
            <button key={align} type="button" onClick={() => updateSetting("textAlign", align)} className={`button ghost ${getToolButtonClass(settings.textAlign === align)}`}>{align}</button>
          ))}
        </div>

        {block.type === 'divider' && (
           <div className="study-color-row">
              <span>Divider color</span>
              <input type="color" value={settings.dividerColor ?? "#000000"} onChange={(e) => updateSetting("dividerColor", e.target.value)} />
           </div>
        )}

        <div className="study-panel-actions">
          <button className="button ghost icon-text" type="button" onClick={onDuplicate}>Duplicate</button>
          <button className="button danger icon-text" type="button" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </aside>
  );
}
