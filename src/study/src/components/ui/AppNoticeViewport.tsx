import { useEffect, useState } from "react";
import {
  APP_NOTICE_EVENT,
  type AppNotice,
} from "../../utils/appNotice";

function getNoticeLabel(variant: AppNotice["variant"]): string {
  if (variant === "success") return "OK";
  if (variant === "warning") return "WARN";
  if (variant === "error") return "ERR";

  return "INFO";
}

function getNoticeClass(variant: AppNotice["variant"]): string {
  if (variant === "error") {
    return "border-black bg-black text-white";
  }

  if (variant === "warning") {
    return "border-black bg-neutral-100 text-black";
  }

  if (variant === "success") {
    return "border-black bg-white text-black";
  }

  return "border-black bg-white text-black";
}

export function AppNoticeViewport() {
  const [notices, setNotices] = useState<AppNotice[]>([]);

  useEffect(() => {
    function handleNotice(event: Event) {
      const customEvent = event as CustomEvent<AppNotice>;
      const notice = customEvent.detail;

      if (!notice) {
        return;
      }

      setNotices((previous) => [notice, ...previous].slice(0, 5));

      window.setTimeout(() => {
        setNotices((previous) =>
          previous.filter((item) => item.id !== notice.id)
        );
      }, notice.durationMs);
    }

    window.addEventListener(APP_NOTICE_EVENT, handleNotice);

    return () => {
      window.removeEventListener(APP_NOTICE_EVENT, handleNotice);
    };
  }, []);

  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex w-[380px] max-w-[calc(100vw-32px)] flex-col gap-2">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={[
            "border p-3 shadow-[4px_4px_0_#000]",
            getNoticeClass(notice.variant),
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="border border-current px-1.5 py-0.5 text-[10px] font-bold">
                  {getNoticeLabel(notice.variant)}
                </span>

                <h3 className="font-bold leading-snug">
                  {notice.title}
                </h3>
              </div>

              {notice.message && (
                <p className="mt-2 break-words text-sm opacity-80">
                  {notice.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setNotices((previous) =>
                  previous.filter((item) => item.id !== notice.id)
                )
              }
              className="border border-current px-2 py-1 text-xs hover:bg-white hover:text-black"
              title="Закрыть"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
