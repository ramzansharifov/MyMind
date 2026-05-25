import { Brush, ChevronDown, Code2, File as FileIcon, Grid3X3, Image as ImageIcon, List, Music, Minus, Quote, Type, Video } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface QuickBlockToolbarProps {
  onAddBlock: (type: string) => void;
}

const blockItems = [
  ['paragraph', <Type size={17} />, 'Text'],
  ['list', <List size={17} />, 'List'],
  ['table', <Grid3X3 size={17} />, 'Table'],
  ['image', <ImageIcon size={17} />, 'Image'],
  ['codeBlock', <Code2 size={17} />, 'Code'],
  ['markdown', <Code2 size={16} />, 'Markdown'],
  ['quote', <Quote size={16} />, 'Quote'],
  ['toggle', <ChevronDown size={16} />, 'Toggle'],
  ['divider', <Minus size={17} />, 'Divider'],
  ['drawing', <Brush size={16} />, 'Drawing'],
  ['video', <Video size={16} />, 'Video'],
  ['audio', <Music size={16} />, 'Audio'],
  ['file', <FileIcon size={16} />, 'File'],
] as const;

export function QuickBlockToolbar({ onAddBlock }: QuickBlockToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const moreMeasureRef = useRef<HTMLButtonElement | null>(null);
  const moreDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(blockItems.length);

  const updateVisibleBlocks = useCallback(() => {
    const toolbar = toolbarRef.current;
    const measure = measureRef.current;
    if (!toolbar || !measure) {
      return;
    }

    const toolbarStyles = window.getComputedStyle(toolbar);
    const gap = Number.parseFloat(toolbarStyles.columnGap || toolbarStyles.gap || '0') || 0;
    const horizontalPadding =
      (Number.parseFloat(toolbarStyles.paddingLeft) || 0) + (Number.parseFloat(toolbarStyles.paddingRight) || 0);
    const availableWidth = Math.max(0, toolbar.clientWidth - horizontalPadding);
    const itemWidths = Array.from(measure.querySelectorAll<HTMLElement>('[data-measure-item]')).map((item) =>
      Math.ceil(item.getBoundingClientRect().width),
    );
    const moreWidth = Math.ceil(moreMeasureRef.current?.getBoundingClientRect().width ?? 0);
    const totalWidth = itemWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, itemWidths.length - 1);

    if (totalWidth <= availableWidth) {
      setVisibleCount(blockItems.length);
      return;
    }

    const availableForItems = Math.max(0, availableWidth - moreWidth - gap);
    let usedWidth = 0;
    let nextVisibleCount = 0;

    for (const width of itemWidths) {
      const nextWidth = usedWidth + (nextVisibleCount > 0 ? gap : 0) + width;
      if (nextWidth > availableForItems) {
        break;
      }
      usedWidth = nextWidth;
      nextVisibleCount += 1;
    }

    setVisibleCount(Math.min(blockItems.length - 1, Math.max(0, nextVisibleCount)));
  }, []);

  useLayoutEffect(() => {
    updateVisibleBlocks();
    const resizeObserver = new ResizeObserver(updateVisibleBlocks);
    if (toolbarRef.current) {
      resizeObserver.observe(toolbarRef.current);
    }
    window.addEventListener('resize', updateVisibleBlocks);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVisibleBlocks);
    };
  }, [updateVisibleBlocks]);

  const visibleItems = blockItems.slice(0, visibleCount);
  const moreItems = blockItems.slice(visibleCount);

  function addBlockAndCloseMenu(type: string) {
    onAddBlock(type);
    moreDetailsRef.current?.removeAttribute('open');
  }

  return (
    <div className="note-quick-toolbar" ref={toolbarRef}>
      {visibleItems.map(([type, icon, label]) => (
        <button className="button ghost" type="button" key={type} onClick={() => addBlockAndCloseMenu(type)}>
          {icon}
          {label}
        </button>
      ))}
      {moreItems.length > 0 ? (
        <details className="note-more-blocks" ref={moreDetailsRef}>
          <summary className="button ghost">
            <ChevronDown size={17} />
            More blocks
          </summary>
          <div className="note-more-blocks-menu">
            {moreItems.map(([type, icon, label]) => (
              <button type="button" key={type} onClick={() => addBlockAndCloseMenu(type)}>
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </details>
      ) : null}
      <div className="note-quick-toolbar-measure" ref={measureRef} aria-hidden="true">
        {blockItems.map(([type, icon, label]) => (
          <button className="button ghost" type="button" tabIndex={-1} data-measure-item key={type}>
            {icon}
            {label}
          </button>
        ))}
        <button className="button ghost" type="button" tabIndex={-1} ref={moreMeasureRef}>
          <ChevronDown size={17} />
          More blocks
        </button>
      </div>
    </div>
  );
}
