import { Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Tooltip } from '../../../shared/components/Tooltip';
import { createId, createStudyTemplate, nowIso } from '../studyUtils';
import type { StudyCustomBlockField, StudyCustomBlockTemplate, StudyCustomFieldType } from '../types';

interface StudyTemplateManagerProps {
  templates: StudyCustomBlockTemplate[];
  onChange: (templates: StudyCustomBlockTemplate[]) => void;
  onClose: () => void;
}

const fieldTypes: StudyCustomFieldType[] = ['text', 'long_text', 'latex', 'number', 'checkbox', 'select', 'date', 'link'];

export function StudyTemplateManager({ templates, onChange, onClose }: StudyTemplateManagerProps) {
  const [activeId, setActiveId] = useState(templates[0]?.id ?? '');
  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === activeId) ?? templates[0] ?? null,
    [activeId, templates],
  );

  function updateTemplate(template: StudyCustomBlockTemplate) {
    const next = templates.map((item) => (item.id === template.id ? { ...template, updatedAt: nowIso() } : item));
    onChange(next);
  }

  function createTemplate() {
    const template = createStudyTemplate();
    onChange([template, ...templates]);
    setActiveId(template.id);
  }

  function deleteTemplate(templateId: string) {
    const next = templates.filter((template) => template.id !== templateId);
    onChange(next);
    setActiveId(next[0]?.id ?? '');
  }

  function updateField(fieldId: string, patch: Partial<StudyCustomBlockField>) {
    if (!activeTemplate) {
      return;
    }
    updateTemplate({
      ...activeTemplate,
      fields: activeTemplate.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    });
  }

  function addField() {
    if (!activeTemplate) {
      return;
    }
    updateTemplate({
      ...activeTemplate,
      fields: [
        ...activeTemplate.fields,
        {
          id: createId('study-field'),
          label: 'Field',
          type: 'text',
          placeholder: '',
        },
      ],
    });
  }

  return (
    <div className="study-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="study-template-modal glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="study-template-header">
          <div>
            <h2>Block templates</h2>
            <p>Create reusable custom blocks for your study materials.</p>
          </div>
          <Tooltip content="Close">
            <button className="icon-button" type="button" onClick={onClose}>
              <X size={18} aria-hidden />
            </button>
          </Tooltip>
        </div>

        <div className="study-template-layout">
          <aside className="study-template-list">
            <button className="button ghost icon-text" type="button" onClick={createTemplate}>
              <Plus size={18} aria-hidden />
              Template
            </button>
            {templates.map((template) => (
              <button
                className={`study-template-list-item${template.id === activeTemplate?.id ? ' active' : ''}`}
                type="button"
                key={template.id}
                onClick={() => setActiveId(template.id)}
              >
                <strong>{template.title}</strong>
                <span>{template.fields.length} fields</span>
              </button>
            ))}
          </aside>

          {activeTemplate ? (
            <div className="study-template-form">
              <label className="form-field">
                <span>Title</span>
                <input value={activeTemplate.title} onChange={(event) => updateTemplate({ ...activeTemplate, title: event.target.value })} />
              </label>
              <label className="form-field">
                <span>Description</span>
                <textarea
                  value={activeTemplate.description ?? ''}
                  onChange={(event) => updateTemplate({ ...activeTemplate, description: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span>Accent color</span>
                <input
                  type="color"
                  value={colorToInputValue(activeTemplate.accentColor)}
                  onChange={(event) => updateTemplate({ ...activeTemplate, accentColor: event.target.value })}
                />
              </label>

              <div className="study-section-heading compact">
                <h3>Fields</h3>
                <button className="button ghost icon-text" type="button" onClick={addField}>
                  <Plus size={16} aria-hidden />
                  Add field
                </button>
              </div>

              <div className="study-template-fields">
                {activeTemplate.fields.map((field) => (
                  <div className="study-template-field glass-card" key={field.id}>
                    <input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} />
                    <select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as StudyCustomFieldType })}>
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <input
                      value={field.placeholder ?? ''}
                      placeholder="Placeholder"
                      onChange={(event) => updateField(field.id, { placeholder: event.target.value })}
                    />
                    {field.type === 'select' ? (
                      <input
                        value={(field.options ?? []).join(', ')}
                        placeholder="Options, separated by comma"
                        onChange={(event) => updateField(field.id, { options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                      />
                    ) : null}
                    <Tooltip content="Delete field">
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => updateTemplate({ ...activeTemplate, fields: activeTemplate.fields.filter((item) => item.id !== field.id) })}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>

              <div className="study-modal-actions">
                <button className="button danger" type="button" onClick={() => deleteTemplate(activeTemplate.id)}>
                  Delete template
                </button>
                <button className="button primary" type="button" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="study-template-empty">
              <p>No templates yet.</p>
              <button className="button primary icon-text" type="button" onClick={createTemplate}>
                <Plus size={18} aria-hidden />
                Create template
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function colorToInputValue(value: string | undefined) {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }
  return '#4bb7a8';
}
