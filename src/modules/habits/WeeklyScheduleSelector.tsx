import { useI18n } from '../../shared/i18n/I18nProvider';

const days = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

interface WeeklyScheduleSelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export function WeeklyScheduleSelector({ selectedDays, onChange }: WeeklyScheduleSelectorProps) {
  const { t } = useI18n();

  function toggle(day: number) {
    onChange(selectedDays.includes(day) ? selectedDays.filter((item) => item !== day) : [...selectedDays, day].sort());
  }

  return (
    <div className="day-selector">
      {days.map((day) => (
        <button
          className={selectedDays.includes(day.value) ? 'active' : ''}
          key={day.value}
          type="button"
          onClick={() => toggle(day.value)}
        >
          {t(day.label)}
        </button>
      ))}
    </div>
  );
}
