import { useEffect, useState } from "react";
import { X } from 'lucide-react';
import {
  APP_NOTICE_EVENT,
  type AppNotice,
} from "../../utils/appNotice";

export function StudyAppNoticeViewport() {
  const [notices, setNotices] = useState<AppNotice[]>([]);

  useEffect(() => {
    function handleNotice(event: Event) {
      const customEvent = event as CustomEvent<AppNotice>;
      const notice = customEvent.detail;
      if (!notice) return;

      setNotices((previous) => [notice, ...previous].slice(0, 5));
      window.setTimeout(() => {
        setNotices((previous) => previous.filter((item) => item.id !== notice.id));
      }, notice.durationMs);
    }

    window.addEventListener(APP_NOTICE_EVENT, handleNotice);
    return () => window.removeEventListener(APP_NOTICE_EVENT, handleNotice);
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="study-notice-viewport">
      {notices.map((notice) => (
        <div key={notice.id} className={`study-notice glass-panel shadow-strong variant-${notice.variant}`}>
          <div className="study-notice-content">
            <strong>{notice.title}</strong>
            {notice.message && <p>{notice.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => setNotices((prev) => prev.filter((item) => item.id !== notice.id))}
            className="icon-button subtle"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
