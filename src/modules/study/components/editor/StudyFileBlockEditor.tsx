import { FileText, FileUp, Trash2 } from 'lucide-react';
import type { StudyBlock, StudyFileBlock } from '../../types';
import { deleteStudyFile, formatStudyFileSize, saveStudyFile } from '../../utils/fileStore';
import { StudyFilePreview } from './StudyFilePreview';

const MAX_STUDY_FILE_SIZE_MB = 50;
const MAX_STUDY_FILE_SIZE_BYTES = MAX_STUDY_FILE_SIZE_MB * 1024 * 1024;

interface StudyFileBlockEditorProps {
  block: StudyFileBlock;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
}

export function StudyFileBlockEditor({ block, onChange }: StudyFileBlockEditorProps) {
  async function handleFileChange(file: File | undefined) {
    if (!file) {
      return;
    }

    if (file.size > MAX_STUDY_FILE_SIZE_BYTES) {
      window.alert(`File is too large. Maximum size: ${MAX_STUDY_FILE_SIZE_MB} MB.`);
      return;
    }

    try {
      if (block.fileId) {
        await deleteStudyFile(block.fileId);
      }

      const storedFile = await saveStudyFile(file);
      onChange((item) => ({
        ...(item as StudyFileBlock),
        fileId: storedFile.id,
        fileName: storedFile.fileName,
        mimeType: storedFile.mimeType,
        size: storedFile.size,
        url: undefined,
      }));
    } catch (error) {
      console.error(error);
      window.alert('Could not save the file in the local study file store.');
    }
  }

  async function removeStoredFile() {
    try {
      if (block.fileId) {
        await deleteStudyFile(block.fileId);
      }
    } catch (error) {
      console.error(error);
    }

    onChange((item) => ({
      ...(item as StudyFileBlock),
      fileId: '',
      fileName: '',
      mimeType: '',
      size: 0,
      url: undefined,
    }));
  }

  return (
    <div className="study-file-editor">
      <div className="study-file-upload-row">
        <label className="button ghost icon-text">
          <FileUp size={16} aria-hidden />
          Choose file
          <input className="study-hidden-file-input" type="file" onChange={(event) => handleFileChange(event.target.files?.[0])} />
        </label>
        {block.fileId ? (
          <button className="button danger icon-text" type="button" onClick={removeStoredFile}>
            <Trash2 size={16} aria-hidden />
            Remove file
          </button>
        ) : null}
      </div>

      <div className="study-file-meta">
        <FileText size={18} aria-hidden />
        <div>
          <strong>{block.fileName || 'No file selected'}</strong>
          <span>
            {block.mimeType || 'Local IndexedDB file'} - {formatStudyFileSize(block.size)}
          </span>
        </div>
      </div>

      <label className="form-field">
        <span>External URL</span>
        <input value={block.url ?? ''} onChange={(event) => onChange((item) => ({ ...(item as StudyFileBlock), url: event.target.value }))} />
      </label>

      <textarea
        className="study-textarea"
        value={block.note}
        placeholder="File notes"
        onChange={(event) => onChange((item) => ({ ...(item as StudyFileBlock), note: event.target.value }))}
      />

      <StudyFilePreview block={block} editable />
    </div>
  );
}
