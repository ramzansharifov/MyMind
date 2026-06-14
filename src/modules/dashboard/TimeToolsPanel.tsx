import { AlarmClock, Bell, Globe2, Pause, Play, Plus, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { cn } from '../../shared/utils/classNames';

interface AlarmItem {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  lastTriggeredDate?: string;
}

const ALARM_STORAGE_KEY = 'mymind_dashboard_alarms';
const WORLD_CLOCKS = [
  { label: 'Local', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: 'New York', timeZone: 'America/New_York' },
  { label: 'London', timeZone: 'Europe/London' },
  { label: 'Tokyo', timeZone: 'Asia/Tokyo' },
];

export function TimeToolsPanel() {
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const [alarms, setAlarms] = useState<AlarmItem[]>(() => loadAlarms());
  const [alarmTime, setAlarmTime] = useState('08:00');
  const [alarmLabel, setAlarmLabel] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(5 * 60);
  const [timerRemaining, setTimerRemaining] = useState(5 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const todayKey = useMemo(() => now.toISOString().slice(0, 10), [now]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimerRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          notify(t('Timer finished'));
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, t]);

  useEffect(() => {
    const currentTime = formatTime(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
    const triggered = alarms.find((alarm) => alarm.enabled && alarm.time === currentTime && alarm.lastTriggeredDate !== todayKey);
    if (!triggered) {
      return;
    }

    notify(triggered.label.trim() || t('Alarm'));
    setAlarms((current) =>
      current.map((alarm) => (alarm.id === triggered.id ? { ...alarm, lastTriggeredDate: todayKey } : alarm)),
    );
  }, [alarms, now, t, todayKey]);

  function addAlarm() {
    if (!alarmTime) {
      return;
    }

    setAlarms((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        time: alarmTime,
        label: alarmLabel.trim(),
        enabled: true,
      },
    ]);
    setAlarmLabel('');
  }

  function setTimerMinutes(minutes: number) {
    const nextSeconds = Math.max(60, minutes * 60);
    setTimerSeconds(nextSeconds);
    setTimerRemaining(nextSeconds);
    setTimerRunning(false);
  }

  function notify(message: string) {
    setAlertMessage(message);
    window.setTimeout(() => setAlertMessage(''), 6000);
  }

  return (
    <section className="mb-[18px] grid grid-cols-[repeat(3,minmax(0,1fr))] gap-4 max-[1100px]:grid-cols-1">
      {alertMessage ? (
        <div className="col-span-full flex items-center gap-2.5 rounded-panel border border-[color-mix(in_srgb,var(--warning)_34%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface-strong))] p-3 text-app-warning shadow-panel">
          <Bell size={16} />
          <span>{alertMessage}</span>
        </div>
      ) : null}
      <article className={timeToolCardClass}>
        <div className={timeToolHeadingClass}>
          <Globe2 size={18} />
          <h3>{t('World time')}</h3>
        </div>
        <div className="grid gap-2">
          {WORLD_CLOCKS.map((clock) => (
            <div className={worldClockRowClass} key={`${clock.label}-${clock.timeZone}`}>
              <span>{t(clock.label)}</span>
              <strong>{formatTime(now, clock.timeZone)}</strong>
              <small>{clock.timeZone.replace('_', ' ')}</small>
            </div>
          ))}
        </div>
      </article>

      <article className={timeToolCardClass}>
        <div className={timeToolHeadingClass}>
          <AlarmClock size={18} />
          <h3>{t('Alarm')}</h3>
        </div>
        <div className="grid grid-cols-[112px_minmax(0,1fr)_auto] gap-2 max-[520px]:grid-cols-1">
          <input className="min-w-0" type="time" value={alarmTime} onChange={(event) => setAlarmTime(event.target.value)} />
          <input className="min-w-0" value={alarmLabel} placeholder={t('Label')} onChange={(event) => setAlarmLabel(event.target.value)} />
          <button className={iconButtonClass} type="button" onClick={addAlarm} aria-label={t('Add alarm')}>
            <Plus size={16} />
          </button>
        </div>
        <div className="grid gap-2">
          {alarms.length > 0 ? alarms.map((alarm) => (
            <div className={cn(alarmRowClass, !alarm.enabled && 'opacity-55')} key={alarm.id}>
              <button
                className={cn(alarmIconButtonClass, alarm.enabled && 'border-[color-mix(in_srgb,var(--accent)_48%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-app-accent-strong')}
                type="button"
                onClick={() => setAlarms((current) => current.map((item) => (item.id === alarm.id ? { ...item, enabled: !item.enabled } : item)))}
                aria-label={t('Toggle alarm')}
              >
                <Bell size={15} />
              </button>
              <div className="min-w-0">
                <strong className="block text-sm text-app-text">{alarm.time}</strong>
                <span className="block truncate text-xs text-app-muted">{alarm.label || t('Alarm')}</span>
              </div>
              <button
                className={alarmIconButtonClass}
                type="button"
                onClick={() => setAlarms((current) => current.filter((item) => item.id !== alarm.id))}
                aria-label={t('Delete alarm')}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )) : <p className="text-sm text-app-muted">{t('No alarms yet.')}</p>}
        </div>
      </article>

      <article className={timeToolCardClass}>
        <div className={timeToolHeadingClass}>
          <Timer size={18} />
          <h3>{t('Timer')}</h3>
        </div>
        <div className="rounded-panel border border-app-border bg-app-surface-soft p-4 text-center font-mono text-[42px] font-extrabold leading-none text-app-text">
          {formatDuration(timerRemaining)}
        </div>
        <div className="flex flex-wrap gap-2">
          {[5, 15, 25].map((minutes) => (
            <button className={presetButtonClass} type="button" key={minutes} onClick={() => setTimerMinutes(minutes)}>
              {minutes}m
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={primaryButtonClass} type="button" onClick={() => setTimerRunning((current) => !current)} disabled={timerRemaining === 0}>
            {timerRunning ? <Pause size={16} /> : <Play size={16} />}
            {timerRunning ? t('Pause') : t('Start')}
          </button>
          <button className={ghostButtonClass} type="button" onClick={() => { setTimerRunning(false); setTimerRemaining(timerSeconds); }}>
            <RotateCcw size={16} />
            {t('Reset')}
          </button>
        </div>
      </article>
    </section>
  );
}

function loadAlarms() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ALARM_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const timeToolCardClass =
  'grid content-start gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-[18px] text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel';
const timeToolHeadingClass =
  'flex items-center gap-2 text-base font-extrabold text-app-text [&_svg]:text-app-accent-strong [&_h3]:m-0 [&_h3]:text-base [&_h3]:font-extrabold';
const worldClockRowClass =
  'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded-panel border border-app-border bg-app-surface-soft p-3 text-sm [&_small]:col-span-2 [&_small]:truncate [&_small]:text-xs [&_small]:text-app-muted [&_strong]:text-app-text';
const iconButtonClass =
  'inline-flex h-[var(--control-height)] min-h-control w-[var(--control-height)] items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] text-app-accent-strong transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_72%,var(--border))] hover:bg-[var(--control-bg-hover)]';
const alarmRowClass =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-panel border border-app-border bg-app-surface-soft p-2.5';
const alarmIconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-control border border-app-border bg-app-surface-strong text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-accent-strong';
const presetButtonClass =
  'rounded-control border border-app-border bg-app-surface-soft px-3 py-2 text-sm font-bold text-app-muted transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-app-text';
const primaryButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3.5 py-2.5 font-bold text-app-accent-strong transition-colors hover:bg-[var(--button-bg-primary-hover)] disabled:opacity-55';
const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_72%,var(--border))] hover:bg-[var(--control-bg-hover)]';
