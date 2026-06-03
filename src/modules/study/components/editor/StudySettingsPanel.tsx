import { useEffect, useState, useMemo } from 'react';
import type {
  StudyBlock,
  StudyBlockSettings,
  StudyCustomBlockTemplate,
  StudyNode,
  StudyBlockTextAlign,
  StudyHeadingStyle,
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
import { CodeLanguageInput } from './CodeLanguageInput';
import { StudyInternalLinkInput } from './StudyInternalLinkInput';

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
  const [internalLinkQuery, setInternalLinkQuery] = useState("");

  useEffect(() => {
    setTableSelection(null);
  }, [block?.id]);

  useEffect(() => {
    return listenTableSelectionChanged((selection) => {
      if (!block || block.type !== 'table') {
        setTableSelection(null);
        return;
      }
      if (!selection) return;
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
    if (!block) return;
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

  const materialNodes = useMemo(() => {
    const q = internalLinkQuery.trim().toLowerCase();
    return nodes.filter(n => n.type === 'material')
      .filter(n => !q || n.title.toLowerCase().indexOf(q) !== -1)
      .slice(0, 10);
  }, [nodes, internalLinkQuery]);

  function insertInternalLink(title: string) {
    runRichCommand("internalLink", title);
    setInternalLinkQuery("");
  }

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
             <h4 className="study-settings-group-title">Table Actions</h4>
             <div className="study-choice-row">
                <button type="button" onClick={() => runTableCommand("toggleHeader")} className={`button ghost ${getToolButtonClass(block.hasHeader)}`}>Header</button>
                <button type="button" onClick={() => runTableCommand("exportCsv")} className="button ghost">CSV</button>
             </div>

             <div className="study-grid-actions">
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addRowAbove")} className="button ghost">Row ↑</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addRowBelow")} className="button ghost">Row ↓</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("deleteRow")} className="button ghost danger">Del Row</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addColumnLeft")} className="button ghost">Col ←</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addColumnRight")} className="button ghost">Col →</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("deleteColumn")} className="button ghost danger">Del Col</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("moveRowUp")} className="button ghost">Move ↑</button>
                <button type="button" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("moveRowDown")} className="button ghost">Move ↓</button>
             </div>

             {tableSelection && (
                <div className="study-cell-settings">
                   <h4 className="study-settings-group-title">Cell Settings</h4>
                   <RangeField label={`Col Width (${tableSelection.columnWidth}px)`} min={80} max={600} value={tableSelection.columnWidth} onChange={(v) => runTableCommand("setColumnWidth", v)} />

                   <div className="study-choice-row">
                      <button type="button" onClick={() => runTableCommand("mergeSelectedCells")} className="button ghost">Merge</button>
                      <button type="button" onClick={() => runTableCommand("splitSelectedCells")} className="button ghost">Split</button>
                   </div>

                   <ColorRow label="Cell BG" value={tableSelection.cellStyle?.backgroundColor} onChange={(v) => runTableCommand("setCellBackgroundColor", v)} />
                   <ColorRow label="Cell Text" value={tableSelection.cellStyle?.textColor} onChange={(v) => runTableCommand("setCellTextColor", v)} />

                   <div className="study-choice-row">
                      {(['left', 'center', 'right'] as const).map(align => (
                        <button key={align} type="button" onClick={() => runTableCommand("setCellTextAlign", align)} className={`button ghost ${getToolButtonClass((tableSelection.cellStyle?.textAlign ?? 'left') === align)}`}>{align}</button>
                      ))}
                   </div>
                   <div className="study-choice-row">
                      {(['top', 'middle', 'bottom'] as const).map(vAlign => (
                        <button key={vAlign} type="button" onClick={() => runTableCommand("setCellVerticalAlign", vAlign)} className={`button ghost ${getToolButtonClass((tableSelection.cellStyle?.verticalAlign ?? 'top') === vAlign)}`}>{vAlign}</button>
                      ))}
                   </div>
                   <button type="button" onClick={() => runTableCommand("clearCellStyle")} className="button ghost full-width">Clear Cell Style</button>
                </div>
             )}
          </div>
        )}

        {showRichTools && (
          <div className="study-rich-formatting">
            <h4 className="study-settings-group-title">Text Formatting</h4>
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
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("unorderedList", "disc")} className={`button ghost ${getToolButtonClass(marks.unorderedList && marks.listStyle === 'disc')}`}>UL</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("orderedList", "decimal")} className={`button ghost ${getToolButtonClass(marks.orderedList)}`}>OL</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("unorderedList", "checkbox-list")} className={`button ghost ${getToolButtonClass(marks.listStyle === 'checkbox-list')}`}>Check</button>
            </div>

            <h4 className="study-settings-group-title">Internal Link</h4>
            <StudyInternalLinkInput
                inputId={`settings-link-${block.id}`}
                query={internalLinkQuery}
                suggestions={materialNodes}
                onQueryChange={setInternalLinkQuery}
                onInsert={insertInternalLink}
            />
          </div>
        )}

        <h4 className="study-settings-group-title">Block Visuals</h4>
        {block.type === 'heading' && (
           <div className="study-choice-row">
              {(['h1', 'h2', 'h3'] as const).map(style => (
                <button key={style} type="button" onClick={() => updateSetting("headingStyle", style)} className={`button ghost ${getToolButtonClass(settings.headingStyle === style)}`}>{style.toUpperCase()}</button>
              ))}
           </div>
        )}

        {block.type === 'code' && (
            <CodeLanguageInput value={settings.codeLanguage} onChange={(v) => updateSetting("codeLanguage", v)} />
        )}

        <RangeField label="Font size" min={8} max={72} value={settings.fontSize ?? (block.type === 'heading' ? 24 : 16)} onChange={(v) => updateSetting("fontSize", v)} />
        <ColorRow label="Text color" value={settings.textColor} onChange={(v) => updateSetting("textColor", v)} />
        <ColorRow label="Block BG" value={settings.backgroundColor} onChange={(v) => updateSetting("backgroundColor", v)} />
        <RangeField label="Padding" min={0} max={64} value={settings.padding ?? 16} onChange={(v) => updateSetting("padding", v)} />

        <div className="study-choice-row">
          {(['left', 'center', 'right'] as const).map(align => (
            <button key={align} type="button" onClick={() => updateSetting("textAlign", align)} className={`button ghost ${getToolButtonClass(settings.textAlign === align)}`}>{align}</button>
          ))}
        </div>

        {block.type === 'board' && (
            <RangeField label="Board Height" min={200} max={1200} value={settings.boardHeight ?? 400} onChange={(v) => updateSetting("boardHeight", v)} />
        )}

        {block.type === 'divider' && (
           <ColorRow label="Divider color" value={settings.dividerColor} onChange={(v) => updateSetting("dividerColor", v)} />
        )}

        <button
          type="button"
          onClick={() => onChangeSettings({})}
          className="button ghost full-width study-reset-settings"
        >
          Reset Block Settings
        </button>

        <div className="study-panel-actions">
          <button className="button ghost icon-text" type="button" onClick={onDuplicate}>Duplicate</button>
          <button className="button danger icon-text" type="button" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </aside>
  );
}

function RangeField({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
    return (
        <label className="study-range-field">
            <span>{label}</span>
            <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        </label>
    );
}

function ColorRow({ label, value, onChange }: { label: string; value?: string; onChange: (v: string | undefined) => void }) {
    return (
        <div className="study-color-row">
            <span>{label}</span>
            <div className="study-color-input-wrap">
                <input type="color" value={value ?? "#ffffff"} onChange={(e) => onChange(e.target.value)} />
                <button type="button" className="study-color-reset" onClick={() => onChange(undefined)}>×</button>
            </div>
        </div>
    );
}
