import { AlignCenter, AlignLeft, AlignRight, Bold, IndentDecrease, IndentIncrease, Italic, Link, Strikethrough, Underline } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Tooltip } from '../../../shared/components/Tooltip';
import { LIST_BLOCK_TYPES, TOGGLE_HEADING_LEVELS } from '../editor/constants';
import { NoteSelect } from '../editor/NoteEditorControls';
import type { AnyBlock } from '../editor/types';

interface FormattingSectionProps {
  block: AnyBlock;
  blockTypeValue: string;
  listMarkerValue: string;
  togglePresentationValue: string;
  currentTextAlignment: string;
  activeStyles: Record<string, unknown>;
  linkTarget: { from: number; to: number; text: string } | null;
  linkUrl: string;
  onLinkUrlChange: (value: string) => void;
  onApplyLink: () => void;
  onCaptureLinkTarget: () => void;
  onPreventToolbarBlur: (event: MouseEvent) => void;
  onSetBlockType: (value: string) => void;
  onSetListMarkerType: (value: string) => void;
  onSetTogglePresentation: (value: string) => void;
  onToggleTextStyle: (style: 'bold' | 'italic' | 'underline' | 'strike') => void;
  onSetTextAlignment: (alignment: 'left' | 'center' | 'right') => void;
  onIndent: () => void;
  onOutdent: () => void;
}

export function FormattingSection({
  block,
  blockTypeValue,
  listMarkerValue,
  togglePresentationValue,
  currentTextAlignment,
  activeStyles,
  linkTarget,
  linkUrl,
  onLinkUrlChange,
  onApplyLink,
  onCaptureLinkTarget,
  onPreventToolbarBlur,
  onSetBlockType,
  onSetListMarkerType,
  onSetTogglePresentation,
  onToggleTextStyle,
  onSetTextAlignment,
  onIndent,
  onOutdent,
}: FormattingSectionProps) {
  return (
    <div className="note-settings-section note-drag-menu-section">
      <h4>Форматирование</h4>
      <label className="note-settings-input">
        Тип блока
        <NoteSelect
          value={blockTypeValue}
          options={[
            { value: 'paragraph', label: 'Paragraph' },
            { value: 'list', label: 'List' },
            { value: 'toggle', label: 'Toggle' },
            { value: 'heading-1', label: 'Heading 1' },
            { value: 'heading-2', label: 'Heading 2' },
            { value: 'heading-3', label: 'Heading 3' },
            { value: 'quote', label: 'Quote' },
            { value: 'codeBlock', label: 'Code' },
            { value: 'markdown', label: 'Markdown' },
          ]}
          onChange={onSetBlockType}
        />
      </label>
      {LIST_BLOCK_TYPES.has(block.type) ? (
        <label className="note-settings-input">
          Marker type
          <NoteSelect
            value={listMarkerValue}
            options={[
              { value: 'bulletListItem', label: 'Bullet' },
              { value: 'numberedListItem', label: 'Numbered' },
              { value: 'checkListItem', label: 'Checkbox' },
            ]}
            onChange={onSetListMarkerType}
          />
        </label>
      ) : null}
      {block.type === 'toggleListItem' || (block.type === 'heading' && (block.props as Record<string, unknown>).isToggleable) ? (
        <label className="note-settings-input">
          Toggle type
          <NoteSelect
            value={togglePresentationValue}
            options={[
              { value: 'toggleListItem', label: 'List toggle' },
              ...TOGGLE_HEADING_LEVELS.map((level) => ({ value: `heading-${level}`, label: `Heading toggle ${level}` })),
            ]}
            onChange={onSetTogglePresentation}
          />
        </label>
      ) : null}
      <div className="note-sidebar-tool-grid">
        <Tooltip content="Bold" position="top">
          <button className={activeStyles.bold ? 'active' : ''} type="button" aria-label="Bold" onMouseDown={onPreventToolbarBlur} onClick={() => onToggleTextStyle('bold')}>
            <Bold size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Italic" position="top">
          <button className={activeStyles.italic ? 'active' : ''} type="button" aria-label="Italic" onMouseDown={onPreventToolbarBlur} onClick={() => onToggleTextStyle('italic')}>
            <Italic size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Underline" position="top">
          <button className={activeStyles.underline ? 'active' : ''} type="button" aria-label="Underline" onMouseDown={onPreventToolbarBlur} onClick={() => onToggleTextStyle('underline')}>
            <Underline size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Strike" position="top">
          <button className={activeStyles.strike ? 'active' : ''} type="button" aria-label="Strike" onMouseDown={onPreventToolbarBlur} onClick={() => onToggleTextStyle('strike')}>
            <Strikethrough size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Align left" position="top">
          <button className={currentTextAlignment === 'left' ? 'active' : ''} type="button" aria-label="Align left" onMouseDown={onPreventToolbarBlur} onClick={() => onSetTextAlignment('left')}>
            <AlignLeft size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Align center" position="top">
          <button className={currentTextAlignment === 'center' ? 'active' : ''} type="button" aria-label="Align center" onMouseDown={onPreventToolbarBlur} onClick={() => onSetTextAlignment('center')}>
            <AlignCenter size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Align right" position="top">
          <button className={currentTextAlignment === 'right' ? 'active' : ''} type="button" aria-label="Align right" onMouseDown={onPreventToolbarBlur} onClick={() => onSetTextAlignment('right')}>
            <AlignRight size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Indent" position="top">
          <button type="button" aria-label="Indent" onMouseDown={onPreventToolbarBlur} onClick={onIndent}>
            <IndentIncrease size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Outdent" position="top">
          <button type="button" aria-label="Outdent" onMouseDown={onPreventToolbarBlur} onClick={onOutdent}>
            <IndentDecrease size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Link" position="top">
          <button type="button" aria-label="Link" onMouseDown={onPreventToolbarBlur} onClick={onCaptureLinkTarget}>
            <Link size={16} />
          </button>
        </Tooltip>
      </div>
      {linkTarget ? (
        <div className="note-link-field">
          <input value={linkUrl} placeholder="https://example.com" onChange={(event) => onLinkUrlChange(event.target.value)} />
          <button className="button ghost" type="button" onClick={onApplyLink}>
            Применить
          </button>
        </div>
      ) : null}
    </div>
  );
}
