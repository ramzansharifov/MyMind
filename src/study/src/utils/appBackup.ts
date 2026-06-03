import type { StudyState } from "../types/study";
import { normalizeStudyState } from "./studyStateValidation";

const LAST_BACKUP_KEY = "mymind-study-last-json-backup-v1";

export type StudyBackupReason =
  | "before-import"
  | "before-clear"
  | "manual";

export interface StudyBackup {
  version: 1;
  reason: StudyBackupReason;
  createdAt: string;
  state: StudyState;
}

export function createStudyBackup(
  state: StudyState,
  reason: StudyBackupReason
): StudyBackup {
  const backup: StudyBackup = {
    version: 1,
    reason,
    createdAt: new Date().toISOString(),
    state: normalizeStudyState(state),
  };

  localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(backup));

  return backup;
}

export function getLastStudyBackup(): StudyBackup | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StudyBackup>;

    if (!parsed || parsed.version !== 1 || !parsed.state || !parsed.createdAt) {
      return null;
    }

    return {
      version: 1,
      reason: parsed.reason ?? "manual",
      createdAt: parsed.createdAt,
      state: normalizeStudyState(parsed.state),
    };
  } catch {
    return null;
  }
}

export function hasStudyBackup(): boolean {
  return Boolean(getLastStudyBackup());
}

export function formatStudyBackupLabel(backup: StudyBackup | null): string {
  if (!backup) {
    return "Backup не найден";
  }

  const date = new Date(backup.createdAt);

  if (Number.isNaN(date.getTime())) {
    return backup.createdAt;
  }

  const reasonLabel =
    backup.reason === "before-import"
      ? "перед импортом"
      : backup.reason === "before-clear"
        ? "перед очисткой"
        : "ручной backup";

  return `${reasonLabel} · ${date.toLocaleString("ru-RU")}`;
}
