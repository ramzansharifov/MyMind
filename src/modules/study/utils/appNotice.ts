export type AppNoticeVariant = "success" | "warning" | "error" | "info";

export interface AppNotice {
  id: string;
  title: string;
  message?: string;
  variant: AppNoticeVariant;
  durationMs: number;
}

export interface AppNoticeInput {
  title: string;
  message?: string;
  variant?: AppNoticeVariant;
  durationMs?: number;
}

export const APP_NOTICE_EVENT = "study-app-notice";

function createNoticeId(): string {
  return `notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function showAppNotice(input: AppNoticeInput): void {
  const notice: AppNotice = {
    id: createNoticeId(),
    title: input.title,
    message: input.message,
    variant: input.variant ?? "info",
    durationMs: input.durationMs ?? 4200,
  };

  window.dispatchEvent(
    new CustomEvent<AppNotice>(APP_NOTICE_EVENT, {
      detail: notice,
    })
  );
}

export function showAppSuccess(title: string, message?: string): void {
  showAppNotice({
    title,
    message,
    variant: "success",
    durationMs: 3500,
  });
}

export function showAppWarning(title: string, message?: string): void {
  showAppNotice({
    title,
    message,
    variant: "warning",
    durationMs: 4800,
  });
}

export function showAppError(title: string, message?: string): void {
  showAppNotice({
    title,
    message,
    variant: "error",
    durationMs: 6500,
  });
}
