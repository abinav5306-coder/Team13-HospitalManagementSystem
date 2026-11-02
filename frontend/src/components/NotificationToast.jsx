import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Clock, CheckCircle2, X, Bell, AlertTriangle, Sparkles } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationToast() {
  const { activeToast, dismissToast, handleTakeMedicine, handleSnooze } = useNotifications();

  if (!activeToast) return null;

  const isTest = activeToast.is_test;

  const onTake = async () => {
    try {
      await handleTakeMedicine(activeToast.id);
    } catch (e) {
      console.error(e);
    }
  };

  const onSnooze = async (mins) => {
    try {
      await handleSnooze(activeToast.id, mins);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`relative overflow-hidden rounded-2xl shadow-2xl border ${
            isTest
              ? 'bg-amber-950 text-amber-50 border-amber-500/50 shadow-amber-950/40'
              : 'bg-slate-900 text-white border-blue-500/40 shadow-blue-950/40'
          } p-5 backdrop-blur-xl`}
        >
          {/* Top pulse accent */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              isTest
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 animate-pulse'
                : 'bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500 animate-pulse'
            }`}
          />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isTest
                    ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-400/30'
                    : 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-400/30'
                }`}
              >
                <Pill className="w-5 h-5 animate-bounce" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">
                    {activeToast.medicine_name || 'Medication Reminder'}
                  </h4>
                  {isTest ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                      TEST
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Due Now
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  {activeToast.dosage && <span>{activeToast.dosage}</span>}
                  {activeToast.scheduled_time && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {activeToast.scheduled_time}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={dismissToast}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reminder Body */}
          <div className="mt-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/10">
            {activeToast.notification_message}
          </div>

          {/* Action Buttons: Elderly-Friendly & High Contrast */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={onTake}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Taken</span>
            </button>

            <button
              onClick={() => onSnooze(10)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
              title="Remind in 10 minutes"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>10m</span>
            </button>

            <button
              onClick={() => onSnooze(15)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
              title="Remind in 15 minutes"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>15m</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
