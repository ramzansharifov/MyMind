import { useEffect } from 'react';
import type { AppReminder } from '../../shared/app/useAppReminders';
import { useI18n } from '../../shared/i18n';
import { AppButton, SaveButton } from '../../shared/ui/buttons';
import { Modal } from '../../shared/ui/modal';

interface ReminderDialogProps {
  reminder: AppReminder;
  onDismiss: () => void;
  onSnooze: () => void;
}

export function ReminderDialog({ reminder, onDismiss, onSnooze }: ReminderDialogProps) {
  const { t } = useI18n();

  useEffect(() => {
    const audio = new Audio('/audio/reminder.mp3');
    audio.volume = 0.72;
    void audio.play().catch(() => {
      // Some environments block autoplay until the first user interaction.
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [reminder.id]);

  return (
    <Modal
      size="sm"
      panelClassName="confirm-dialog reminder-dialog"
      showClose={false}
      onClose={onDismiss}
      footer={
        <>
          <AppButton label="Snooze 15 min" variant="ghost" type="button" onClick={onSnooze} />
          <SaveButton label="OK" type="button" onClick={onDismiss} />
        </>
      }
    >
      <span className="inline-flex text-xs font-extrabold uppercase tracking-[0.08em] text-app-danger">{t('Reminder')}</span>
      <h2 id="app-reminder-title">{reminder.title}</h2>
      <p className="text-app-muted">{reminder.body}</p>
    </Modal>
  );
}
