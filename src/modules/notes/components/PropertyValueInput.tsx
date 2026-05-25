import type { NoteProperty } from '../types';

interface PropertyValueInputProps {
  property: NoteProperty;
  onChange: (property: NoteProperty) => void;
}

export function PropertyValueInput({ property, onChange }: PropertyValueInputProps) {
  if (property.type === 'checkbox') {
    return (
      <button
        className={`note-checkbox-chip${property.value ? ' active' : ''}`}
        type="button"
        onClick={() => onChange({ ...property, value: !property.value })}
      >
        {property.value ? 'Да' : 'Нет'}
      </button>
    );
  }

  return (
    <input
      type={property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : property.type === 'url' ? 'url' : 'text'}
      value={String(property.value ?? '')}
      aria-label={property.name}
      onChange={(event) =>
        onChange({
          ...property,
          value: property.type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value,
        })
      }
    />
  );
}
