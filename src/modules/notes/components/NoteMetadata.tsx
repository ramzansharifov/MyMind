import { Tags, X } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/I18nProvider';
import type { ContentGroup } from '../../../shared/types/common';
import type { NoteProperty } from '../types';
import { NoteSelect } from '../editor/NoteEditorControls';
import { PropertyValueInput } from './PropertyValueInput';

interface NoteMetadataProps {
  tags: string[];
  groups: ContentGroup[];
  groupId: string | null;
  tagInput: string;
  properties: NoteProperty[];
  onGroupChange: (value: string | null) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: (value?: string) => void;
  onRemoveTag: (value: string) => void;
  onChangeProperty: (property: NoteProperty) => void;
  onRemoveProperty: (id: string) => void;
}

export function NoteMetadata({
  tags,
  groups,
  groupId,
  tagInput,
  properties,
  onGroupChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onChangeProperty,
  onRemoveProperty,
}: NoteMetadataProps) {
  const { t } = useI18n();

  return (
    <div className="note-metadata">
      {groups.length > 0 ? (
        <div className="note-group-select">
          <span>{t('Group')}</span>
          <NoteSelect
            value={groupId ?? ''}
            options={[{ value: '', label: t('No group') }, ...groups.map((group) => ({ value: group.id, label: group.title }))]}
            onChange={(value) => onGroupChange(value || null)}
          />
        </div>
      ) : null}
      <div className="note-tag-row">
        <Tags size={17} />
        {tags.map((tag) => (
          <button className="note-chip removable" type="button" key={tag} onClick={() => onRemoveTag(tag)}>
            {tag}
            <X size={14} />
          </button>
        ))}
        <input
          className="note-tag-input"
          value={tagInput}
          placeholder="+ Добавить тег"
          onChange={(event) => onTagInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              onAddTag();
            }
          }}
          onBlur={() => onAddTag()}
        />
      </div>
      {properties.length > 0 ? (
        <div className="note-properties-row">
          {properties.map((property) => (
            <div className="note-property-chip" key={property.id}>
              <input
                value={property.name}
                aria-label="Название поля"
                onChange={(event) => onChangeProperty({ ...property, name: event.target.value })}
              />
              <PropertyValueInput property={property} onChange={onChangeProperty} />
              <button type="button" onClick={() => onRemoveProperty(property.id)} aria-label="Удалить поле">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
