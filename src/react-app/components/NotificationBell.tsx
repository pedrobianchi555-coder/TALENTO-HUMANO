import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useNotifications } from '@/react-app/hooks/useNotifications';
import type { AppNotification } from '@/react-app/hooks/useNotifications';

const TYPE_COLORS: Record<string, string> = {
  REQUEST_APPROVED: 'bg-green-100 text-green-700',
  REQUEST_REJECTED: 'bg-red-100 text-red-700',
  REQUEST_CREATED: 'bg-blue-100 text-blue-700',
  LOAN_APPROVED: 'bg-emerald-100 text-emerald-700',
  LOAN_PAYMENT_RECORDED: 'bg-teal-100 text-teal-700',
  EVALUATION_ASSIGNED: 'bg-purple-100 text-purple-700',
  EVALUATION_COMPLETED: 'bg-indigo-100 text-indigo-700',
  ATTENDANCE_REGISTERED: 'bg-yellow-100 text-yellow-700',
  ASSET_ASSIGNED: 'bg-orange-100 text-orange-700',
  COMPLAINT_RESOLVED: 'bg-pink-100 text-pink-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function NotificationItem({ n, onRead, onNavigate }: {
  n: AppNotification;
  onRead: (id: number) => void;
  onNavigate: (link?: string) => void;
}) {
  const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL;

  return (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0 ${!n.is_read ? 'bg-blue-50/40' : ''}`}
      onClick={() => { if (!n.is_read) onRead(n.id); onNavigate(n.link); }}
    >
      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-transparent'}`} style={{ marginTop: 6 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold px-1.5 py-0.5 rounded-full w-fit ${colorClass}`}>
            {n.type.replace(/_/g, ' ')}
          </p>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
        </div>
        <p className="text-sm font-medium text-gray-900 mt-1 truncate">{n.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
      </div>
      {!n.is_read && (
        <button
          onClick={e => { e.stopPropagation(); onRead(n.id); }}
          className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full"
          title="Marcar como leída"
        >
          <Check className="w-3.5 h-3.5 text-gray-400" />
        </button>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNavigate = (link?: string) => {
    setOpen(false);
    if (link) navigate(link);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Notificaciones {unreadCount > 0 && <span className="text-blue-600">({unreadCount})</span>}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Leer todo
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onRead={markAsRead}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
