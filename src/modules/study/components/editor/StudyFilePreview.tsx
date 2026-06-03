import { Download, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StudyFileBlock } from '../../types';
import { formatStudyFileSize, getStudyFile } from '../../utils/fileStore';

type StudyFilePreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'unknown';

function getStudyFilePreviewKind(block: StudyFileBlock): StudyFilePreviewKind {
  const mimeType = (block.mimeType ?? '').toLowerCase();
  const extension = (block.fileName.split('.').pop() ?? '').toLowerCase();

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(extension)) return 'video';
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) return 'audio';
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
  return 'unknown';
}

export function StudyFilePreview({ block, editable = false }: { block: StudyFileBlock; editable?: boolean }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const objectUrlRef = useRef<string | null>(null);
  const previewUrl = objectUrl || block.url || '';
  const kind = getStudyFilePreviewKind(block);

  useEffect(() => {
    let cancelled = false;

    function revokeObjectUrl() {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    }

    async function loadFile() {
      revokeObjectUrl();
      setObjectUrl('');
      setError('');

      if (!block.fileId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const storedFile = await getStudyFile(block.fileId);
        if (cancelled) {
          return;
        }

        if (!storedFile) {
          setError('The file metadata exists, but the local IndexedDB file is missing.');
          return;
        }

        const nextUrl = URL.createObjectURL(storedFile.blob);
        objectUrlRef.current = nextUrl;
        setObjectUrl(nextUrl);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError('Could not load the file from local storage.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFile();

    return () => {
      cancelled = true;
      revokeObjectUrl();
    };
  }, [block.fileId]);

  if (loading) {
    return <div className="study-file-placeholder">Loading file preview...</div>;
  }

  if (error) {
    return <div className="study-file-placeholder danger">{error}</div>;
  }

  if (!previewUrl) {
    return <div className="study-file-placeholder">{editable ? 'Choose a file or add a URL.' : 'File is not attached.'}</div>;
  }

  const actions = (
    <div className="study-file-actions">
      <a className="button ghost icon-text" href={previewUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={16} aria-hidden />
        Open
      </a>
      <a className="button ghost icon-text" href={previewUrl} download={block.fileName || undefined}>
        <Download size={16} aria-hidden />
        Download
      </a>
    </div>
  );

  if (kind === 'image') {
    return (
      <div className="study-file-preview">
        <img src={previewUrl} alt={block.fileName || 'Study image'} loading="lazy" />
        {actions}
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="study-file-preview">
        <video src={previewUrl} controls preload="metadata" />
        {actions}
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="study-file-preview compact">
        <audio src={previewUrl} controls preload="metadata" />
        {actions}
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="study-file-preview">
        <iframe src={previewUrl} title={block.fileName || 'PDF preview'} />
        {actions}
      </div>
    );
  }

  return (
    <div className="study-file-placeholder">
      <strong>{block.fileName || block.url || 'File'}</strong>
      <span>
        {block.mimeType || 'unknown'} - {formatStudyFileSize(block.size)}
      </span>
      {actions}
    </div>
  );
}
