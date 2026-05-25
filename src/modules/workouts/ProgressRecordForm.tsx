import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EntityForm } from '../../shared/components/EntityForm';
import { Tooltip } from '../../shared/components/Tooltip';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { createId } from '../../shared/utils/idGenerator';
import type { ProgressRecord, ProgressRecordMetric } from './types';

interface ProgressRecordFormProps {
    record?: ProgressRecord | null;
    onCancel: () => void;
    onSave: (record: ProgressRecord) => void;
}

export function ProgressRecordForm({ record, onCancel, onSave }: ProgressRecordFormProps) {
    const [date, setDate] = useState(record?.date ?? new Date().toISOString().slice(0, 10));
    const [metrics, setMetrics] = useState<ProgressRecordMetric[]>(record?.metrics ?? []);
    const [images, setImages] = useState<string[]>(record?.images ?? []);
    const [notes, setNotes] = useState(record?.notes ?? '');
    const [newMetricLabel, setNewMetricLabel] = useState('');
    const [newMetricValue, setNewMetricValue] = useState('');
    const [newMetricUnit, setNewMetricUnit] = useState('');
    const imageInputRef = useRef<HTMLInputElement>(null);
    const { t } = useI18n();

    function addMetric() {
        if (newMetricLabel.trim() && newMetricValue.trim()) {
            const newMetric: ProgressRecordMetric = {
                key: createId('metric'),
                label: newMetricLabel.trim(),
                value: newMetricValue.trim(),
                unit: newMetricUnit.trim(),
            };
            setMetrics([...metrics, newMetric]);
            setNewMetricLabel('');
            setNewMetricValue('');
            setNewMetricUnit('');
        }
    }

    function removeMetric(key: string) {
        setMetrics(metrics.filter((m) => m.key !== key));
    }

    function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImages((prev) => [...prev, result]);
            };
            reader.readAsDataURL(file);
        });
        event.target.value = '';
    }

    function removeImage(index: number) {
        setImages((prev) => prev.filter((_, i) => i !== index));
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const timestamp = new Date().toISOString();
        onSave({
            id: record?.id ?? createId('progress-record'),
            date,
            metrics,
            images,
            notes: notes.trim(),
            createdAt: record?.createdAt ?? timestamp,
            updatedAt: timestamp,
        });
    }

    return (
        <EntityForm title={record ? 'Edit progress record' : 'Add progress record'} saveLabel="Save record" onCancel={onCancel} onSubmit={submit} wide>
            <label>
                {t('Date')}
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>

            <div className="form-section">
                <h3>{t('Progress Metrics')}</h3>
                <div className="metric-adder-vertical stack">
                    <label>
                        {t('Metric name (e.g. Weight)')}
                        <input
                            type="text"
                            value={newMetricLabel}
                            onChange={(event) => setNewMetricLabel(event.target.value)}
                        />
                    </label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ flex: 2 }}>
                            {t('Value')}
                            <input
                                type="text"
                                value={newMetricValue}
                                onChange={(event) => setNewMetricValue(event.target.value)}
                            />
                        </label>
                        <label style={{ flex: 1 }}>
                            {t('Unit (e.g. kg)')}
                            <input
                                type="text"
                                value={newMetricUnit}
                                onChange={(event) => setNewMetricUnit(event.target.value)}
                            />
                        </label>
                    </div>
                    <div className="card-actions">
                        <AddButton label="Add metric" onClick={addMetric} />
                    </div>
                </div>

                {metrics.length > 0 && (
                    <div className="metric-list stack" style={{ marginTop: '1rem' }}>
                        {metrics.map((metric) => (
                            <div className="metric-list-row" key={metric.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--surface-soft)', borderRadius: '4px' }}>
                                <span>
                                    <strong>{metric.label}:</strong> {metric.value} {metric.unit}
                                </span>
                                <button type="button" onClick={() => removeMetric(metric.key)} className="button danger small">
                                    {t('Remove')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="form-section">
                <h3>{t('Photos')}</h3>
                <div className="photo-picker-field">
                    <input ref={imageInputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={handleImageUpload} />
                    <button className="button ghost" type="button" onClick={() => imageInputRef.current?.click()}>
                        <ImagePlus size={17} aria-hidden="true" />
                        <span>{t('Add photos')}</span>
                    </button>
                    <span className="muted-text">{images.length > 0 ? `${images.length} ${t('photo(s) selected')}` : t('No photos selected')}</span>
                </div>
                <div className="photo-upload-grid">
                    {images.map((img, i) => (
                        <div className="photo-upload-tile" key={i}>
                            <img src={img} alt={t('Uploaded photo')} />
                            <Tooltip content={t('Remove photo')} position="top">
                            <button className="icon-button danger" aria-label={t('Remove photo')}
                                type="button"
                                onClick={() => removeImage(i)}
                            >
                                <Trash2 size={15} aria-hidden="true" />
                                ×
                            </button>
                            </Tooltip>
                        </div>
                    ))}
                </div>
            </div>

            <label>
                {t('Notes')}
                <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
        </EntityForm>
    );
}
