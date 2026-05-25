import { PanelRight, Settings2 } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { LIST_BLOCK_TYPES } from '../editor/constants';
import { findBlockById, getContiguousListGroup, getCurrentBlock, stripBlockIds } from '../editor/blockActions';
import type { AnyBlock, AnyEditor } from '../editor/types';
import { getCommonBlockProps, getSidebarBlockTypeValue, clampNumber } from '../utils/noteEditorFormatting';
import { getImageBlockMaxWidth, IMAGE_FALLBACK_MAX_WIDTH, IMAGE_MIN_WIDTH } from '../utils/noteEditorDom';
import { BlockActionsSection } from './BlockActionsSection';
import { ColorSection } from './ColorSection';
import { DrawingSettingsSection } from './DrawingSettingsSection';
import { FormattingSection } from './FormattingSection';
import { ImageSettingsSection } from './ImageSettingsSection';
import { TableSettingsSection } from './TableSettingsSection';

interface NotePropertiesPanelProps {
  editor: AnyEditor;
  block: AnyBlock | null;
  onBlockChange: (block: AnyBlock | null) => void;
  onInteract: () => void;
  onDirty: () => void;
}

export function NotePropertiesPanel({ editor, block, onBlockChange, onInteract, onDirty }: NotePropertiesPanelProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState<{ from: number; to: number; text: string } | null>(null);

  if (!block) {
    return (
      <aside className="note-settings-panel">
        <div className="note-settings-header">
          <h3>Настройки блока</h3>
          <Settings2 size={18} />
        </div>
        <p className="muted-text">Выберите блок, чтобы настроить его внешний вид.</p>
      </aside>
    );
  }

  const currentBlock = block;
  const tableContent = (block as any).content ?? {};
  const tableHeadersEnabled = Boolean((editor as any).settings?.tables?.headers);
  const hasHeaderRow = Boolean(tableContent.headerRows);
  const hasHeaderColumn = Boolean(tableContent.headerCols);
  const activeStyles = editor.getActiveStyles() as Record<string, unknown>;
  const rawSelectedBlocks = editor.getSelection()?.blocks;
  const selectedBlocks = rawSelectedBlocks?.some((item) => item.id === currentBlock.id) ? rawSelectedBlocks : [currentBlock];
  const selectedListGroup =
    LIST_BLOCK_TYPES.has(currentBlock.type) && selectedBlocks.length <= 1
      ? getContiguousListGroup(editor.document as AnyBlock[], currentBlock.id)
      : selectedBlocks.filter((item) => LIST_BLOCK_TYPES.has(item.type));
  const selectedBlocksHaveContent = selectedBlocks.some((item) => item.content !== undefined);
  const currentTextAlignment = String((currentBlock.props as Record<string, unknown>).textAlignment ?? 'left');
  const blockTypeValue = getSidebarBlockTypeValue(block);
  const listMarkerValue = LIST_BLOCK_TYPES.has(block.type) ? block.type : 'bulletListItem';
  const togglePresentationValue =
    block.type === 'heading' && (block.props as Record<string, unknown>).isToggleable
      ? `heading-${String((block.props as Record<string, unknown>).level ?? 1)}`
      : 'toggleListItem';
  const imageMaxWidth = block.type === 'image' ? getImageBlockMaxWidth(block.id) : IMAGE_FALLBACK_MAX_WIDTH;
  const rawImageWidth = Number((block.props as Record<string, unknown>).previewWidth);
  const imageWidthValue = clampNumber(Number.isFinite(rawImageWidth) ? rawImageWidth : imageMaxWidth, IMAGE_MIN_WIDTH, imageMaxWidth);

  function updateBlock(patch: Record<string, unknown>) {
    onInteract();
    const currentProps = { ...(currentBlock.props as Record<string, unknown>) };
    if (currentBlock.type === 'drawing') {
      delete currentProps.drawingData;
    }

    editor.updateBlock(currentBlock, {
      props: {
        ...currentProps,
        ...patch,
      } as any,
    });

    const updated = findBlockById(editor.document as AnyBlock[], currentBlock.id);
    onBlockChange(updated ?? currentBlock);
    onDirty();
  }

  function duplicateBlock() {
    const cloned = stripBlockIds(JSON.parse(JSON.stringify(currentBlock)));

    editor.insertBlocks([cloned], currentBlock, 'after');
    onDirty();
  }

  function deleteBlock() {
    const selectedBlocks = editor.getSelection()?.blocks;
    const blocksToRemove = selectedBlocks && selectedBlocks.some((item) => item.id === currentBlock.id) ? selectedBlocks : [currentBlock];

    editor.removeBlocks(blocksToRemove);
    onBlockChange(getCurrentBlock(editor));
    onDirty();
  }

  function updateTableHeaders(patch: Record<string, unknown>) {
    editor.updateBlock(currentBlock, {
      content: {
        ...((currentBlock as any).content ?? {}),
        ...patch,
      },
    } as any);

    const updated = findBlockById(editor.document as AnyBlock[], currentBlock.id);
    onBlockChange(updated ?? currentBlock);
    onDirty();
  }

  function preventToolbarBlur(event: MouseEvent) {
    event.preventDefault();
  }

  function toggleTextStyle(style: 'bold' | 'italic' | 'underline' | 'strike') {
    editor.focus();
    editor.toggleStyles({ [style]: true } as any);
    onDirty();
  }

  function setTextAlignment(textAlignment: 'left' | 'center' | 'right') {
    editor.focus();
    for (const item of selectedBlocks) {
      if ('textAlignment' in (item.props as Record<string, unknown>)) {
        editor.updateBlock(item, { props: { textAlignment } } as any);
      }
    }
    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? currentBlock);
    onDirty();
  }

  function setBlockType(value: string) {
    const [type, level] = value.split('-');
    editor.focus();
    editor.transact(() => {
      for (const item of selectedBlocks) {
        const patch =
          value === 'list'
            ? { type: 'bulletListItem', props: getCommonBlockProps(item) }
            : value === 'toggle'
              ? { type: 'toggleListItem', props: getCommonBlockProps(item) }
              : value === 'markdown'
                ? { type: 'codeBlock', props: { ...getCommonBlockProps(item), language: 'markdown' } }
                : type === 'heading'
                  ? { type: 'heading', props: { ...getCommonBlockProps(item), level: Number(level || 1), isToggleable: false } }
                  : { type, props: getCommonBlockProps(item) };
        editor.updateBlock(item, patch as any);
      }
    });

    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? getCurrentBlock(editor));
    onDirty();
  }

  function setListMarkerType(value: string) {
    const blocksToUpdate = selectedListGroup.length > 0 ? selectedListGroup : selectedBlocks;

    editor.focus();
    editor.transact(() => {
      for (const item of blocksToUpdate) {
        if (LIST_BLOCK_TYPES.has(item.type)) {
          editor.updateBlock(item, { type: value, props: getCommonBlockProps(item) } as any);
        }
      }
    });

    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? getCurrentBlock(editor));
    onDirty();
  }

  function setTogglePresentation(value: string) {
    editor.focus();
    editor.transact(() => {
      for (const item of selectedBlocks) {
        if (item.type !== 'toggleListItem' && !(item.type === 'heading' && (item.props as Record<string, unknown>).isToggleable)) {
          continue;
        }

        if (value === 'toggleListItem') {
          editor.updateBlock(item, { type: 'toggleListItem', props: getCommonBlockProps(item) } as any);
          continue;
        }

        const [, level] = value.split('-');
        editor.updateBlock(item, {
          type: 'heading',
          props: {
            ...getCommonBlockProps(item),
            level: Number(level || 1),
            isToggleable: true,
          },
        } as any);
      }
    });

    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? getCurrentBlock(editor));
    onDirty();
  }

  function captureLinkTarget() {
    const target = editor.transact((tr) => ({
      from: tr.selection.from,
      to: tr.selection.to,
      text: tr.doc.textBetween(tr.selection.from, tr.selection.to).trim(),
    }));

    setLinkTarget(target);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!url || !linkTarget) {
      return;
    }

    editor.transact((tr) => {
      const linkMark = (editor as any).pmSchema.mark('link', { href: url });

      if (linkTarget.from === linkTarget.to || !linkTarget.text) {
        tr.insertText(url, linkTarget.from, linkTarget.to).addMark(linkTarget.from, linkTarget.from + url.length, linkMark);
        return;
      }

      tr.addMark(linkTarget.from, linkTarget.to, linkMark);
    });

    setLinkUrl('');
    setLinkTarget(null);
    onDirty();
  }

  function setImageWidth(value: number) {
    updateBlock({
      previewWidth: clampNumber(Math.round(value), IMAGE_MIN_WIDTH, getImageBlockMaxWidth(currentBlock.id)),
    });
  }

  return (
    <aside className="note-settings-panel" onPointerDownCapture={onInteract}>
      <div className="note-settings-header">
        <h3>Настройки блока</h3>
        <PanelRight size={18} />
      </div>

      {selectedBlocksHaveContent ? (
        <FormattingSection
          block={block}
          blockTypeValue={blockTypeValue}
          listMarkerValue={listMarkerValue}
          togglePresentationValue={togglePresentationValue}
          currentTextAlignment={currentTextAlignment}
          activeStyles={activeStyles}
          linkTarget={linkTarget}
          linkUrl={linkUrl}
          onLinkUrlChange={setLinkUrl}
          onApplyLink={applyLink}
          onCaptureLinkTarget={captureLinkTarget}
          onPreventToolbarBlur={preventToolbarBlur}
          onSetBlockType={setBlockType}
          onSetListMarkerType={setListMarkerType}
          onSetTogglePresentation={setTogglePresentation}
          onToggleTextStyle={toggleTextStyle}
          onSetTextAlignment={setTextAlignment}
          onIndent={() => {
            editor.focus();
            editor.nestBlock();
            onDirty();
          }}
          onOutdent={() => {
            editor.focus();
            editor.unnestBlock();
            onDirty();
          }}
        />
      ) : null}

      <ColorSection block={block} onUpdateBlock={updateBlock} />
      {block.type === 'drawing' ? <DrawingSettingsSection block={block} onUpdateBlock={updateBlock} /> : null}
      {block.type === 'codeBlock' ? (
        <label className="note-settings-input">
          Язык
          <input value={String((block.props as Record<string, unknown>).language ?? '')} onChange={(event) => updateBlock({ language: event.target.value })} />
        </label>
      ) : null}
      {block.type === 'image' ? (
        <ImageSettingsSection block={block} imageWidthValue={imageWidthValue} imageMaxWidth={imageMaxWidth} onSetImageWidth={setImageWidth} onUpdateBlock={updateBlock} />
      ) : null}
      {block.type === 'table' && tableHeadersEnabled ? (
        <TableSettingsSection hasHeaderRow={hasHeaderRow} hasHeaderColumn={hasHeaderColumn} onUpdateTableHeaders={updateTableHeaders} />
      ) : null}
      <BlockActionsSection onDuplicate={duplicateBlock} onDelete={deleteBlock} />
    </aside>
  );
}
