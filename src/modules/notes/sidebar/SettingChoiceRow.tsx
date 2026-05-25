interface SettingChoiceRowProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SettingChoiceRow({ label, value, options, onChange }: SettingChoiceRowProps) {
  return (
    <div className="note-settings-section">
      <span className="note-settings-label">{label}</span>
      <div className="note-settings-choice-row">
        {options.map((option) => (
          <button className={value === option ? 'active' : ''} type="button" key={option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
