import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Clock, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { format } from 'date-fns';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_request': return <AlertCircle size={16} className="text-blue-500" />;
      case 'assignment': return <UserPlus size={16} className="text-indigo-500" />;
      case 'completion': return <CheckCircle2 size={16} className="text-green-500" />;
      default: return <Clock size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#141414]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-widest"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-white/40">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                      if (notif.requestId) {
                        // Update URL with taskId
                        const url = new URL(window.location.href);
                        url.searchParams.set('taskId', notif.requestId);
                        window.history.pushState({}, '', url);

                        window.dispatchEvent(new CustomEvent('open-task', { detail: { requestId: notif.requestId } }));
                        setIsOpen(false);
                      }
                    }}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group relative cursor-pointer ${!notif.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">{getIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold text-gray-900 dark:text-white ${!notif.read ? 'pr-6' : ''}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-white/30 mt-2 flex items-center">
                          <Clock size={10} className="mr-1" />
                          {notif.createdAt ? format(notif.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                        </p>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {!notif.read && (
                      <div className="absolute top-5 right-4 w-2 h-2 bg-blue-600 rounded-full group-hover:hidden" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
