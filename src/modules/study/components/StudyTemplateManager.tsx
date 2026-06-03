import { Plus, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Tooltip } from '../../../shared/components/Tooltip';
import { createId, nowIso } from '../studyUtils';
import type { StudyCustomBlockField, StudyCustomBlockTemplate, StudyCustomFieldType } from '../types';

interface StudyTemplateManagerProps {
  templates: StudyCustomBlockTemplate[];
  onChange: (templates: StudyCustomBlockTemplate[]) => void;
  onClose: () => void;
}

const fieldTypes: Array<{ value: StudyCustomFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'latex', label: 'LaTeX' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
  { value: 'date', label: 'Date' },
  { value: 'link', label: 'Internal link' },
];

function createEmptyField(): StudyCustomBlockField {
  return {
    id: createId('field'),
    label: 'New field',
    type: 'text',
    required: false,
    placeholder: '',
  };
}

export function StudyTemplateManager({ templates, onChange, onClose }: StudyTemplateManagerProps) {
  const [activeId, setActiveId] = useState(templates[0]?.id ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('#4bb7a8');
  const [fields, setFields] = useState<StudyCustomBlockField[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeId) ?? null,
    [activeId, templates],
  );

  const startEdit = (template: StudyCustomBlockTemplate) => {
    setActiveId(template.id);
    setName(template.title);
    setDescription(template.description ?? '');
    setAccentColor(template.accentColor || '#4bb7a8');
    setFields(template.fields);
  };

  const resetForm = () => {
    setActiveId('');
    setName('New template');
    setDescription('');
    setAccentColor('#4bb7a8');
    setFields([createEmptyField()]);
  };

  const saveTemplate = () => {
    if (!name.trim()) return;
    const cleanFields = fields.filter(f => f.label.trim());
    if (cleanFields.length === 0) return;

    if (activeId) {
        onChange(templates.map(t => t.id === activeId ? { ...t, title: name, description, accentColor, fields: cleanFields, updatedAt: nowIso() } : t));
    } else {
        const newT: StudyCustomBlockTemplate = {
            id: createId('template'),
            title: name,
            description,
            accentColor,
            fields: cleanFields,
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        onChange([newT, ...templates]);
        setActiveId(newT.id);
    }
  };

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex(f => f.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next);
  };

  return (
    <div className="study-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="study-template-modal glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="study-template-header">
          <div>
            <h2>Custom Block Templates</h2>
            <p>Design your own specialized blocks.</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="study-template-layout">
          <aside className="study-template-list">
            <button className="button ghost full-width" onClick={resetForm}><Plus size={16} /> New Template</button>
            {templates.map((t) => (
              <button
                key={t.id}
                className={`study-template-list-item${t.id === activeId ? ' active' : ''}`}
                onClick={() => startEdit(t)}
              >
                <strong>{t.title}</strong>
                <span>{t.fields.length} fields</span>
              </button>
            ))}
          </aside>

          <main className="study-template-form">
            <div className="study-template-main-info glass-panel">
                <label className="form-field">
                  <span>Name</span>
                  <input value={name} onChange={e => setName(e.target.value)} />
                </label>
                <label className="form-field">
                   <span>Description</span>
                   <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                </label>
                <label className="form-field">
                   <span>Accent Color</span>
                   <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} />
                </label>
            </div>

            <div className="study-section-heading">
                <h3>Fields</h3>
                <button className="button ghost" onClick={() => setFields([...fields, createEmptyField()])}><Plus size={16} /> Add Field</button>
            </div>

            <div className="study-template-fields">
                {fields.map((field, index) => (
                    <div key={field.id} className="study-template-field-editor glass-panel">
                        <div className="study-field-header">
                            <strong>Field #{index + 1}</strong>
                            <div className="study-field-actions">
                                <button className="icon-button subtle" onClick={() => moveField(field.id, -1)}><ArrowUp size={14} /></button>
                                <button className="icon-button subtle" onClick={() => moveField(field.id, 1)}><ArrowDown size={14} /></button>
                                <button className="icon-button danger" onClick={() => setFields(fields.filter(f => f.id !== field.id))}><Trash2 size={14} /></button>
                            </div>
                        </div>
                        <div className="study-field-grid">
                            <label className="form-field">
                                <span>Label</span>
                                <input value={field.label} onChange={e => setFields(fields.map(f => f.id === field.id ? {...f, label: e.target.value} : f))} />
                            </label>
                            <label className="form-field">
                                <span>Type</span>
                                <select value={field.type} onChange={e => setFields(fields.map(f => f.id === field.id ? {...f, type: e.target.value as StudyCustomFieldType} : f))}>
                                    {fieldTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                </select>
                            </label>
                            <label className="form-field">
                                <span>Placeholder</span>
                                <input value={field.placeholder || ''} onChange={e => setFields(fields.map(f => f.id === field.id ? {...f, placeholder: e.target.value} : f))} />
                            </label>
                        </div>
                        {field.type === 'select' && (
                            <label className="form-field">
                                <span>Options (one per line)</span>
                                <textarea value={(field.options || []).join('\n')} onChange={e => setFields(fields.map(f => f.id === field.id ? {...f, options: e.target.value.split('\n')} : f))} />
                            </label>
                        )}
                    </div>
                ))}
            </div>

            <div className="study-modal-actions">
                {activeId && <button className="button danger" onClick={() => setPendingDeleteId(activeId)}>Delete Template</button>}
                <button className="button primary" onClick={saveTemplate}>Save Changes</button>
            </div>
          </main>
        </div>
      </div>

      {pendingDeleteId && (
        <div className="study-modal-backdrop" onMouseDown={() => setPendingDeleteId(null)}>
            <div className="study-modal-panel glass-panel" onMouseDown={e => e.stopPropagation()}>
                <h2>Delete Template?</h2>
                <p>This will permanently remove this template. Existing blocks of this type will remain as generic blocks.</p>
                <div className="study-modal-actions">
                    <button className="button ghost" onClick={() => setPendingDeleteId(null)}>Cancel</button>
                    <button className="button danger" onClick={() => {
                        onChange(templates.filter(t => t.id !== pendingDeleteId));
                        setPendingDeleteId(null);
                        resetForm();
                    }}>Delete Forever</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
