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

const formSectionClass = 'grid gap-3 rounded-panel border border-app-border bg-app-surface-soft p-4';
const stackClass = 'grid gap-3';
const metricValueGridClass = 'grid grid-cols-[2fr_1fr] gap-3 max-[640px]:grid-cols-1';
const actionRowClass = 'flex flex-wrap items-center justify-end gap-2';
const metricListClass = 'mt-4 grid gap-2';
const metricRowClass =
  'flex items-center justify-between gap-3 rounded-control border border-app-border bg-app-surface-soft p-3 text-sm text-app-text max-[560px]:items-start max-[560px]:flex-col';
const dangerButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--danger)_72%,var(--border))] bg-[var(--button-bg-danger)] px-3 py-2 text-sm font-bold text-app-danger transition hover:border-[color-mix(in_srgb,var(--danger)_88%,var(--border))] hover:bg-[var(--button-bg-danger-hover)]';
const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';
const photoPickerClass = 'flex flex-wrap items-center gap-3';
const photoGridClass = 'grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-3';
const photoTileClass = 'group relative overflow-hidden rounded-panel border border-app-border bg-app-surface-soft';
const photoImageClass = 'aspect-square h-full w-full object-cover';
const iconDangerClass =
  'absolute right-2 top-2 grid h-icon min-h-icon w-icon place-items-center rounded-control border border-[color-mix(in_srgb,var(--danger)_72%,var(--border))] bg-[var(--button-bg-danger)] text-app-danger opacity-0 transition group-hover:opacity-100';

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
    if (!newMetricLabel.trim() || !newMetricValue.trim()) {
      return;
    }

    setMetrics((current) => [
      ...current,
      {
        key: createId('metric'),
        label: newMetricLabel.trim(),
        value: newMetricValue.trim(),
        unit: newMetricUnit.trim(),
      },
    ]);
    setNewMetricLabel('');
    setNewMetricValue('');
    setNewMetricUnit('');
  }

  function removeMetric(key: string) {
    setMetrics((current) => current.filter((metric) => metric.key !== key));
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) {
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const result = readerEvent.target?.result as string;
        setImages((current) => [...current, result]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
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

      <div className={formSectionClass}>
        <h3>{t('Progress Metrics')}</h3>
        <div className={stackClass}>
          <label>
            {t('Metric name (e.g. Weight)')}
            <input type="text" value={newMetricLabel} onChange={(event) => setNewMetricLabel(event.target.value)} />
          </label>
          <div className={metricValueGridClass}>
            <label>
              {t('Value')}
              <input type="text" value={newMetricValue} onChange={(event) => setNewMetricValue(event.target.value)} />
            </label>
            <label>
              {t('Unit (e.g. kg)')}
              <input type="text" value={newMetricUnit} onChange={(event) => setNewMetricUnit(event.target.value)} />
            </label>
          </div>
          <div className={actionRowClass}>
            <AddButton label="Add metric" onClick={addMetric} />
          </div>
        </div>

        {metrics.length > 0 ? (
          <div className={metricListClass}>
            {metrics.map((metric) => (
              <div className={metricRowClass} key={metric.key}>
                <span>
                  <strong>{metric.label}:</strong> {metric.value} {metric.unit}
                </span>
                <button type="button" onClick={() => removeMetric(metric.key)} className={dangerButtonClass}>
                  {t('Remove')}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className={formSectionClass}>
        <h3>{t('Photos')}</h3>
        <div className={photoPickerClass}>
          <input ref={imageInputRef} className="sr-only" type="file" accept="image/*" multiple onChange={handleImageUpload} />
          <button className={ghostButtonClass} type="button" onClick={() => imageInputRef.current?.click()}>
            <ImagePlus size={17} aria-hidden="true" />
            <span>{t('Add photos')}</span>
          </button>
          <span className="text-sm text-app-muted">
            {images.length > 0 ? `${images.length} ${t('photo(s) selected')}` : t('No photos selected')}
          </span>
        </div>
        <div className={photoGridClass}>
          {images.map((img, index) => (
            <div className={photoTileClass} key={`${img}-${index}`}>
              <img className={photoImageClass} src={img} alt={t('Uploaded photo')} />
              <Tooltip content={t('Remove photo')} position="top">
                <button className={iconDangerClass} aria-label={t('Remove photo')} type="button" onClick={() => removeImage(index)}>
                  <Trash2 size={15} aria-hidden="true" />
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
