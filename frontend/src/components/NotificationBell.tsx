import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi, Notification } from '../lib/api';

const POLL_INTERVAL_MS = 30000;

function formatWhen(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Navbar bell with unread badge, a dropdown of recent activity and 30s polling. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const response = await notificationsApi.getAll();
      setItems(response.data.notifications);
      setUnread(response.data.unreadCount);
    } catch {
      // Keep the last known state — the bell is never worth breaking the page over.
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      await load();
    } catch {
      // Ignore — the next poll will resync.
    }
  };

  const handleOpenItem = async (notification: Notification) => {
    setOpen(false);

    if (!notification.read) {
      try {
        await notificationsApi.markRead(notification.id);
        await load();
      } catch {
        // Ignore — opening the link matters more than the read state.
      }
    }

    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative text-gray-700 hover:text-primary-600"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Nothing new yet</p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleOpenItem(notification)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                    notification.read ? '' : 'bg-primary-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                      {notification.body && (
                        <p className="text-xs text-gray-600 break-words">{notification.body}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">{formatWhen(notification.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}