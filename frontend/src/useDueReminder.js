import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import i18n from './i18n';

const ENABLED_KEY = 'pte-notify-enabled';
const LAST_NOTIFIED_KEY = 'pte-notify-last-at';
const COOLDOWN_MS = 30 * 60 * 1000; // don't re-notify more than once per 30 min
const POLL_MS = 60 * 1000;

const supported = typeof window !== 'undefined' && 'Notification' in window;

function notify(title, body, tag) {
  const n = new Notification(title, { body, tag });
  n.onclick = () => { window.focus(); n.close(); };
  return n;
}

// Polls due-review count and, when enabled, fires a desktop notification
// while the tab is backgrounded — so review reminders reach the user even
// if PTE GO isn't the focused tab, as long as the browser stays open.
export function useDueReminder() {
  const [dueCount, setDueCount] = useState(0);
  const [enabled, setEnabled] = useState(() => supported && localStorage.getItem(ENABLED_KEY) === '1');
  const [permission, setPermission] = useState(() => (supported ? Notification.permission : 'unsupported'));

  const maybeNotify = useCallback((count) => {
    if (!supported || !enabled || permission !== 'granted') return;
    if (count <= 0) return;
    if (document.visibilityState === 'visible') return; // already looking at the badge

    const last = Number(localStorage.getItem(LAST_NOTIFIED_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) return;

    notify(i18n.t('dueReminder.notifyTitle'), i18n.t('dueReminder.notifyBody', { count }), 'pte-review-due');
    localStorage.setItem(LAST_NOTIFIED_KEY, String(Date.now()));
  }, [enabled, permission]);

  useEffect(() => {
    const poll = () => api.getReviewStats().then(s => {
      const count = s.due_today || 0;
      setDueCount(count);
      maybeNotify(count);
    }).catch(() => {});
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [maybeNotify]);

  const enable = useCallback(async () => {
    if (!supported) return;
    let result = Notification.permission;
    if (result !== 'granted') {
      result = await Notification.requestPermission();
      setPermission(result);
    }
    if (result === 'granted') {
      setEnabled(true);
      localStorage.setItem(ENABLED_KEY, '1');
      notify(i18n.t('dueReminder.confirmTitle'), i18n.t('dueReminder.confirmBody'), 'pte-notify-confirm');
    }
  }, []);

  const disable = useCallback(() => {
    setEnabled(false);
    localStorage.setItem(ENABLED_KEY, '0');
  }, []);

  const toggle = useCallback(() => {
    if (enabled) disable(); else enable();
  }, [enabled, disable, enable]);

  return { dueCount, supported, enabled, permission, toggle };
}
