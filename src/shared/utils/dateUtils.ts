export function todayDateOnly() {
  return localDateOnly();
}

export function localDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function millisecondsUntilNextLocalDay(date = new Date()) {
  const nextDay = new Date(date);
  nextDay.setHours(24, 0, 1, 0);
  return Math.max(1000, nextDay.getTime() - date.getTime());
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'No date';
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
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
