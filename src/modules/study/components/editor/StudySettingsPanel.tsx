import { useEffect, useState, useMemo, type MouseEvent, type ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Check,
  CheckSquare,
  Columns3,
  Copy,
  Download,
  Italic,
  List,
  ListOrdered,
  RotateCcw,
  Rows3,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
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
import { Tooltip } from '../../../../shared/components/Tooltip';

const SETTING_COLORS = [
  '#e7eef8',
  '#f5b7b8',
  '#ffd99f',
  '#f5e68f',
  '#a9e4c8',
  '#9fd5d1',
  '#b6c4ff',
  '#d6a8f1',
];

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

function IconToolButton({
  label,
  active = false,
  danger = false,
  disabled = false,
  onClick,
  onMouseDown,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        className={`study-tool-button${active ? ' active' : ''}${danger ? ' danger' : ''}`}
        disabled={disabled}
        aria-label={label}
        onMouseDown={onMouseDown}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  );
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

  const materialNodes = useMemo(() => {
    const q = internalLinkQuery.trim().toLowerCase();
    return nodes
      .filter((node) => node.type === 'material')
      .filter((node) => !q || node.title.toLowerCase().includes(q))
      .slice(0, 10);
  }, [nodes, internalLinkQuery]);

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
                <IconToolButton label="Toggle header row" active={block.hasHeader} onClick={() => runTableCommand("toggleHeader")}>
                  <Rows3 size={18} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Export CSV" onClick={() => runTableCommand("exportCsv")}>
                  <Download size={18} aria-hidden />
                </IconToolButton>
             </div>

             <div className="study-grid-actions">
                <IconToolButton label="Add row above" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addRowAbove")}>
                  <ArrowUp size={17} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Add row below" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addRowBelow")}>
                  <ArrowDown size={17} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Delete row" danger disabled={!hasSelectedTableCell} onClick={() => runTableCommand("deleteRow")}>
                  <Rows3 size={17} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Add column left" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addColumnLeft")}>
                  <ArrowLeft size={17} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Add column right" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("addColumnRight")}>
                  <ArrowRight size={17} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Delete column" danger disabled={!hasSelectedTableCell} onClick={() => runTableCommand("deleteColumn")}>
                  <Columns3 size={17} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Move row up" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("moveRowUp")}>
                  <ArrowUp size={17} aria-hidden />
                </IconToolButton>
                <IconToolButton label="Move row down" disabled={!hasSelectedTableCell} onClick={() => runTableCommand("moveRowDown")}>
                  <ArrowDown size={17} aria-hidden />
                </IconToolButton>
             </div>

             {tableSelection && (
                <div className="study-cell-settings">
                   <h4 className="study-settings-group-title">Cell Settings</h4>
                   <RangeField label={`Col Width (${tableSelection.columnWidth}px)`} min={80} max={600} value={tableSelection.columnWidth} onChange={(v) => runTableCommand("setColumnWidth", v)} />

                   <div className="study-choice-row">
                      <button type="button" onClick={() => runTableCommand("mergeSelectedCells")} className="button ghost compact-button">Merge</button>
                      <button type="button" onClick={() => runTableCommand("splitSelectedCells")} className="button ghost compact-button">Split</button>
                   </div>

                   <ColorRow label="Cell BG" value={tableSelection.cellStyle?.backgroundColor} onChange={(v) => runTableCommand("setCellBackgroundColor", v)} />
                   <ColorRow label="Cell Text" value={tableSelection.cellStyle?.textColor} onChange={(v) => runTableCommand("setCellTextColor", v)} />

                   <div className="study-choice-row">
                      <IconToolButton label="Align left" active={(tableSelection.cellStyle?.textAlign ?? 'left') === 'left'} onClick={() => runTableCommand("setCellTextAlign", 'left')}>
                        <AlignLeft size={17} aria-hidden />
                      </IconToolButton>
                      <IconToolButton label="Align center" active={(tableSelection.cellStyle?.textAlign ?? 'left') === 'center'} onClick={() => runTableCommand("setCellTextAlign", 'center')}>
                        <AlignCenter size={17} aria-hidden />
                      </IconToolButton>
                      <IconToolButton label="Align right" active={(tableSelection.cellStyle?.textAlign ?? 'left') === 'right'} onClick={() => runTableCommand("setCellTextAlign", 'right')}>
                        <AlignRight size={17} aria-hidden />
                      </IconToolButton>
                   </div>
                   <div className="study-choice-row">
                      {(['top', 'middle', 'bottom'] as const).map(vAlign => (
                        <button key={vAlign} type="button" onClick={() => runTableCommand("setCellVerticalAlign", vAlign)} className={`button ghost compact-button ${getToolButtonClass((tableSelection.cellStyle?.verticalAlign ?? 'top') === vAlign)}`}>{vAlign}</button>
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
              <IconToolButton label="Bold" active={marks.bold} onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("bold")}>
                <Bold size={17} aria-hidden />
              </IconToolButton>
              <IconToolButton label="Italic" active={marks.italic} onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("italic")}>
                <Italic size={17} aria-hidden />
              </IconToolButton>
              <IconToolButton label="Underline" active={marks.underline} onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("underline")}>
                <Underline size={17} aria-hidden />
              </IconToolButton>
              <IconToolButton label="Strikethrough" active={marks.strikeThrough} onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("strikeThrough")}>
                <Strikethrough size={17} aria-hidden />
              </IconToolButton>
            </div>

            <div className="study-font-size-tool">
               <input type="number" min={8} max={72} value={inlineFontSize} onChange={(e) => setInlineFontSize(Number(e.target.value))} />
               <IconToolButton label="Apply text size" onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("fontSize", String(inlineFontSize))}>
                <Check size={17} aria-hidden />
               </IconToolButton>
            </div>

            <div className="study-choice-row">
              <IconToolButton label="Bullet list" active={marks.unorderedList && marks.listStyle === 'disc'} onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("unorderedList", "disc")}>
                <List size={17} aria-hidden />
              </IconToolButton>
              <IconToolButton label="Numbered list" active={marks.orderedList} onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("orderedList", "decimal")}>
                <ListOrdered size={17} aria-hidden />
              </IconToolButton>
              <IconToolButton label="Checklist" active={marks.listStyle === 'checkbox-list'} onMouseDown={(e) => e.preventDefault()} onClick={() => runRichCommand("unorderedList", "checkbox-list")}>
                <CheckSquare size={17} aria-hidden />
              </IconToolButton>
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

        <div className="study-choice-row">
          <IconToolButton label="Align left" active={settings.textAlign === 'left'} onClick={() => updateSetting("textAlign", 'left')}>
            <AlignLeft size={17} aria-hidden />
          </IconToolButton>
          <IconToolButton label="Align center" active={settings.textAlign === 'center'} onClick={() => updateSetting("textAlign", 'center')}>
            <AlignCenter size={17} aria-hidden />
          </IconToolButton>
          <IconToolButton label="Align right" active={settings.textAlign === 'right'} onClick={() => updateSetting("textAlign", 'right')}>
            <AlignRight size={17} aria-hidden />
          </IconToolButton>
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
          <RotateCcw size={16} aria-hidden />
          Reset settings
        </button>

        <div className="study-panel-actions">
          <button className="button ghost icon-text" type="button" onClick={onDuplicate}>
            <Copy size={16} aria-hidden />
            Duplicate
          </button>
          <button className="button danger icon-text" type="button" onClick={onDelete}>
            <Trash2 size={16} aria-hidden />
            Delete
          </button>
        </div>
      </div>
    </aside>
  );
}

function RangeField({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
    return (
        <label className="study-range-field">
            <span className="study-range-field-head">
              <span>{label}</span>
              <strong>{value}</strong>
            </span>
            <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        </label>
    );
}

function ColorRow({ label, value, onChange }: { label: string; value?: string; onChange: (v: string | undefined) => void }) {
    return (
        <div className="study-color-row">
            <span>{label}</span>
            <div className="study-color-swatch-row">
                {SETTING_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`study-color-dot${value === color ? ' active' : ''}`}
                    style={{ backgroundColor: color }}
                    aria-label={`${label} ${color}`}
                    onClick={() => onChange(color)}
                  />
                ))}
                <Tooltip content="Reset color">
                  <button type="button" className="study-color-reset" onClick={() => onChange(undefined)} aria-label="Reset color">
                    <X size={14} aria-hidden />
                  </button>
                </Tooltip>
            </div>
        </div>
    );
}
