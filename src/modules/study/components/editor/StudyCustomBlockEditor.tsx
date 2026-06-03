import type { StudyBlock, StudyCustomBlock, StudyCustomBlockTemplate } from '../../types';
import { StudyLatexView } from './StudyLatexView';

interface StudyCustomBlockEditorProps {
  block: StudyCustomBlock;
  template?: StudyCustomBlockTemplate;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
}

export function StudyCustomBlockEditor({ block, template, onChange }: StudyCustomBlockEditorProps) {
  if (!template) {
    return <p className="study-muted">Template was removed.</p>;
  }

  return (
    <div className="study-custom-block" style={{ borderColor: template.accentColor }}>
      <strong>{template.title}</strong>
      {template.fields.map((field) => {
        const value = block.values[field.id] ?? '';
        const updateValue = (nextValue: string | number | boolean) => {
          onChange((item) => ({ ...(item as StudyCustomBlock), values: { ...(item as StudyCustomBlock).values, [field.id]: nextValue } }));
        };

        if (field.type === 'checkbox') {
          return (
            <label className="study-custom-checkbox" key={field.id}>
              <input type="checkbox" checked={Boolean(value)} onChange={(event) => updateValue(event.target.checked)} />
              {field.label}
            </label>
          );
        }

        if (field.type === 'select') {
          return (
            <label className="form-field" key={field.id}>
              <span>{field.label}</span>
              <select value={String(value)} onChange={(event) => updateValue(event.target.value)}>
                <option value="">Select</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <label className="form-field" key={field.id}>
            <span>{field.label}</span>
            {field.type === 'latex' ? (
              <div className="study-custom-field-latex">
                <textarea value={String(value)} placeholder={field.placeholder} onChange={(event) => updateValue(event.target.value)} />
                {value && <StudyLatexView code={String(value)} displayMode={false} />}
              </div>
            ) : field.type === 'long_text' ? (
              <textarea value={String(value)} placeholder={field.placeholder} onChange={(event) => updateValue(event.target.value)} />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={String(value)}
                placeholder={field.placeholder}
                onChange={(event) => updateValue(field.type === 'number' ? Number(event.target.value) : event.target.value)}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
