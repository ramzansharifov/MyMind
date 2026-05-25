import { useEffect, useState } from 'react';
import type { AnyBlock, AnyEditor } from './types';
import { calculateEditorStats, type EditorStats } from '../utils/noteEditorStats';

interface EditorStatusBarProps {
  editor: AnyEditor;
  revision: number;
  lastSavedLabel: string;
}

export function EditorStatusBar({ editor, revision, lastSavedLabel }: EditorStatusBarProps) {
  const [stats, setStats] = useState<EditorStats>(() => calculateEditorStats(editor.document as AnyBlock[]));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setStats(calculateEditorStats(editor.document as AnyBlock[]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [editor, revision]);

  return (
    <div className="note-editor-statusbar">
      <span>Слов: {stats.words}</span>
      <span>Символов: {stats.characters}</span>
      <span>Блоков: {stats.visualBlocks}</span>
      <span>Последнее сохранение: {lastSavedLabel}</span>
    </div>
  );
}
