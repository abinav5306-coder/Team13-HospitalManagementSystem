import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  Clock,
  Pill,
  Sparkles,
  Check,
  X,
  AlertCircle,
  FlaskConical,
  Trash2,
  Calendar
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationDropdown({ isOpen, onClose }) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    handleTakeMedicine,
    handleSnooze,
    setTestModeOpen,
    handleClearTestReminders
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'due', 'history', 'test'
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter notifications based on tab
  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'due') {
      return n.status === 'Due' || n.status === 'Upcoming' || n.status === 'Snoozed';
    }
    if (activeTab === 'history') {
      return n.status === 'Confirmed Taken' && !n.is_test;
    }
    if (activeTab === 'test') {
      return n.is_test;
    }
    return true;
  });

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="absolute right-0 top-14 w-96 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white font-['Plus_Jakarta_Sans']">
                Medicine Reminders
              </h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-blue-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200/80 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('due')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              activeTab === 'due'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active & Due
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Taken
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              activeTab === 'test'
                ? 'bg-amber-100 text-amber-900 shadow-xs border border-amber-300'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            <FlaskConical className="w-3 h-3 text-amber-600" />
            Test ({notifications.filter((n) => n.is_test).length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
          {filteredNotifs.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No reminders here</p>
              <p className="text-xs text-slate-600 mt-1">
                {activeTab === 'due'
                  ? 'Great job! You have no pending doses right now.'
                  : 'You have no notifications in this category.'}
              </p>
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const isDue = notif.status === 'Due';
              const isSnoozed = notif.status === 'Snoozed';
              const isTaken = notif.status === 'Confirmed Taken';
              const isTest = notif.is_test;

              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markRead(notif.id)}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !notif.is_read
                      ? isTest
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-blue-50/50 border-blue-200/70 shadow-xs'
                      : 'bg-white border-slate-200/60 hover:bg-slate-50'
                  }`}
                >
                  {/* Top pill bar */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">
                        {notif.medicine_name}
                      </span>
                      {notif.dosage && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          • {notif.dosage}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isTest && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                          TEST
                        </span>
                      )}
                      {isDue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                          Due Now
                        </span>
                      )}
                      {isSnoozed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          Snoozed
                        </span>
                      )}
                      {isTaken && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Taken
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {notif.notification_message}
                  </p>

                  {/* Details row */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 mb-2.5">
                    {notif.scheduled_time && (
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock className="w-3 h-3 text-blue-600" />
                        {notif.scheduled_time}
                      </span>
                    )}
                    {notif.quantity && <span>Qty: {notif.quantity}</span>}
                    {notif.created_at && (
                      <span>
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>

                  {/* Actions for Due or Snoozed reminders */}
                  {(isDue || isSnoozed) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTakeMedicine(notif.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Taken</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSnooze(notif.id, 10);
                        }}
                        className="px-2.5 py-1.5 rounded-lg font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                        title="Snooze 10 minutes"
                      >
                        10m
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSnooze(notif.id, 15);
                        }}
                        className="px-2.5 py-1.5 rounded-lg font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                        title="Snooze 15 minutes"
                      >
                        15m
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              setTestModeOpen(true);
            }}
            className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 font-bold px-2 py-1 rounded-lg hover:bg-amber-100/60 transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
            <span>Open Test Mode</span>
          </button>

          {activeTab === 'test' && notifications.some((n) => n.is_test) && (
            <button
              onClick={handleClearTestReminders}
              className="flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Test Logs</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
