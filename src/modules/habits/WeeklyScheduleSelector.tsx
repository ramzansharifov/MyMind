import { useI18n } from '../../shared/i18n';
import { cn } from '../../shared/utils/classNames';

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
    <div className="grid grid-cols-7 gap-2 max-[640px]:grid-cols-4">
      {days.map((day) => (
        <button
          className={cn(dayButtonClass, selectedDays.includes(day.value) && dayButtonActiveClass)}
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

const dayButtonClass =
  'min-h-10 rounded-control border border-app-border bg-app-surface px-2 text-sm font-extrabold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong';

const dayButtonActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_68%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';
