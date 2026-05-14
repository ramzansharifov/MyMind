export function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'No date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No date';
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function isToday(value?: string | null) {
  return Boolean(value && value.slice(0, 10) === todayDateOnly());
}

export function isFuture(value?: string | null) {
  if (!value) {
    return false;
  }
  return new Date(value).getTime() > Date.now();
}

export function isWithinDays(value: string, days: number) {
  const time = new Date(value).getTime();
  const now = Date.now();
  return time >= now && time <= now + days * 24 * 60 * 60 * 1000;
}

export function weekdayNumber(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
