import { AlarmClock, Bell, Globe2, Pause, Play, Plus, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../shared/i18n/I18nProvider';

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
    <section className="time-tools-grid section-block">
      {alertMessage ? (
        <div className="time-tool-alert">
          <Bell size={16} />
          <span>{alertMessage}</span>
        </div>
      ) : null}
      <article className="panel time-tool-card">
        <div className="time-tool-heading">
          <Globe2 size={18} />
          <h3>{t('World time')}</h3>
        </div>
        <div className="world-clock-list">
          {WORLD_CLOCKS.map((clock) => (
            <div className="world-clock-row" key={`${clock.label}-${clock.timeZone}`}>
              <span>{t(clock.label)}</span>
              <strong>{formatTime(now, clock.timeZone)}</strong>
              <small>{clock.timeZone.replace('_', ' ')}</small>
            </div>
          ))}
        </div>
      </article>

      <article className="panel time-tool-card">
        <div className="time-tool-heading">
          <AlarmClock size={18} />
          <h3>{t('Alarm')}</h3>
        </div>
        <div className="alarm-form">
          <input type="time" value={alarmTime} onChange={(event) => setAlarmTime(event.target.value)} />
          <input value={alarmLabel} placeholder={t('Label')} onChange={(event) => setAlarmLabel(event.target.value)} />
          <button className="button ghost icon-only" type="button" onClick={addAlarm} aria-label={t('Add alarm')}>
            <Plus size={16} />
          </button>
        </div>
        <div className="alarm-list">
          {alarms.length > 0 ? alarms.map((alarm) => (
            <div className={`alarm-row${alarm.enabled ? '' : ' muted'}`} key={alarm.id}>
              <button
                className={alarm.enabled ? 'active' : ''}
                type="button"
                onClick={() => setAlarms((current) => current.map((item) => (item.id === alarm.id ? { ...item, enabled: !item.enabled } : item)))}
                aria-label={t('Toggle alarm')}
              >
                <Bell size={15} />
              </button>
              <div>
                <strong>{alarm.time}</strong>
                <span>{alarm.label || t('Alarm')}</span>
              </div>
              <button
                type="button"
                onClick={() => setAlarms((current) => current.filter((item) => item.id !== alarm.id))}
                aria-label={t('Delete alarm')}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )) : <p className="muted-text">{t('No alarms yet.')}</p>}
        </div>
      </article>

      <article className="panel time-tool-card">
        <div className="time-tool-heading">
          <Timer size={18} />
          <h3>{t('Timer')}</h3>
        </div>
        <div className="timer-display">{formatDuration(timerRemaining)}</div>
        <div className="timer-presets">
          {[5, 15, 25].map((minutes) => (
            <button type="button" key={minutes} onClick={() => setTimerMinutes(minutes)}>
              {minutes}m
            </button>
          ))}
        </div>
        <div className="timer-actions">
          <button className="button accent" type="button" onClick={() => setTimerRunning((current) => !current)} disabled={timerRemaining === 0}>
            {timerRunning ? <Pause size={16} /> : <Play size={16} />}
            {timerRunning ? t('Pause') : t('Start')}
          </button>
          <button className="button ghost" type="button" onClick={() => { setTimerRunning(false); setTimerRemaining(timerSeconds); }}>
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
