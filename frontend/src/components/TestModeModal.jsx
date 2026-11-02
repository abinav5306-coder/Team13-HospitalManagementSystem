import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  X,
  Pill,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldAlert,
  Send,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getPatientMedications } from '../services/api';

export default function TestModeModal({ isOpen, onClose }) {
  const { patientUser } = useAuth();
  const username = patientUser?.username || '';
  const displayName = patientUser?.fullname || patientUser?.name || username || 'Patient';

  const {
    notifications,
    handleSendTestReminder,
    handleClearTestReminders,
    handleTakeMedicine,
    handleSnooze
  } = useNotifications();

  const [medications, setMedications] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [simulationType, setSimulationType] = useState('due'); // 'due' or 'upcoming'
  const [submitting, setSubmitting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState(null);

  // Load patient's actual medications
  useEffect(() => {
    async function loadMeds() {
      if (!username || !isOpen) return;
      try {
        setLoadingMeds(true);
        const data = await getPatientMedications(username);
        const list = Array.isArray(data) ? data : [];
        setMedications(list);
        if (list.length > 0 && !selectedMedId) {
          setSelectedMedId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load medications for test mode:', err);
      } finally {
        setLoadingMeds(false);
      }
    }
    loadMeds();
  }, [username, isOpen]);

  if (!isOpen) return null;

  // Selected medication details
  const selectedMed =
    medications.find((m) => m.id === selectedMedId) ||
    (medications.length > 0
      ? medications[0]
      : {
          id: 'sample-paracetamol',
          medicineName: 'Paracetamol',
          dosage: '500 mg',
          scheduleTime: '08:00 AM',
          instructions: 'Take 1 tablet after meals with water',
          quantity: '1 tablet'
        });

  const testNotifs = notifications.filter((n) => n.is_test);

  const handleTriggerTest = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const result = await handleSendTestReminder({
        medicationId: selectedMed.id,
        medicineName: selectedMed.medicineName,
        dosage: selectedMed.dosage,
        scheduleTime: selectedMed.scheduleTime,
        instructions: selectedMed.instructions || 'Take as prescribed with water.',
        quantity: selectedMed.quantity || '1 tablet',
        simulationType
      });
      setLastTestResult(result);
    } catch (err) {
      console.error('Failed to trigger test reminder:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-3xl shadow-2xl border border-amber-200/80 max-w-2xl w-full overflow-hidden z-10 my-8"
      >
        {/* Amber Testing Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-2 ring-white/30">
                <FlaskConical className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black font-['Plus_Jakarta_Sans']">
                    Reminder Test Mode
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950/40 text-amber-200 border border-amber-300/30">
                    SIMULATION ONLY
                  </span>
                </div>
                <p className="text-xs text-amber-100 mt-1">
                  Test live alerts, chimes, and reminders immediately without waiting for actual medicine schedules.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Test Safety Notice */}
          <div className="mt-4 p-3 rounded-xl bg-slate-950/30 border border-white/20 text-xs text-amber-100 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Data Safeguard:</strong> Test reminders will <strong>NEVER</strong> mark real medicines as taken, alter your doctor&apos;s prescriptions, or affect your clinical adherence records.
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-200px)] overflow-y-auto">
          {/* Step 1: Select Prescription */}
          <form onSubmit={handleTriggerTest} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                1. Select Prescribed Medication
              </label>

              {loadingMeds ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 animate-pulse">
                  Loading your prescribed medications...
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedMedId}
                    onChange={(e) => setSelectedMedId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-xs"
                  >
                    {medications.length > 0 ? (
                      medications.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.medicineName} ({m.dosage || 'No dosage'}) — Scheduled: {m.scheduleTime || 'Not set'}
                        </option>
                      ))
                    ) : (
                      <option value="sample-paracetamol">
                        Paracetamol (500 mg) — Scheduled: 08:00 AM (Sample)
                      </option>
                    )}
                  </select>

                  {/* Selected Prescription Details Card */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-amber-800 font-bold block uppercase tracking-wide">
                          Prescription Details
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {selectedMed.medicineName} {selectedMed.dosage && `(${selectedMed.dosage})`}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            {selectedMed.scheduleTime}
                          </span>
                          {selectedMed.quantity && <span>Qty: {selectedMed.quantity}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Choose Simulation Alert Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                2. Choose Simulation Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimulationType('due')}
                  className={`p-3.5 rounded-xl border text-left font-semibold text-xs transition-all ${
                    simulationType === 'due'
                      ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-400/30 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold block text-sm mb-1 text-rose-700">
                    🔴 Medicine Due Now
                  </span>
                  Triggers an immediate high-priority alert as if the medicine time has arrived right now.
                </button>

                <button
                  type="button"
                  onClick={() => setSimulationType('upcoming')}
                  className={`p-3.5 rounded-xl border text-left font-semibold text-xs transition-all ${
                    simulationType === 'upcoming'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-400/30 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold block text-sm mb-1 text-blue-700">
                    🔵 Upcoming Reminder
                  </span>
                  Triggers an upcoming advance notification informing you that a dose is scheduled soon.
                </button>
              </div>
            </div>

            {/* Step 3: Trigger Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-[0.99] shadow-lg shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                <span>{submitting ? 'Generating Test Alert...' : 'Send Test Reminder Now'}</span>
              </button>
            </div>
          </form>

          {/* Test Result Message Box */}
          {lastTestResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-slate-900 text-white border border-amber-500/40 shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500 text-slate-950">
                  TEST REMINDER POPUP TRIGGERED
                </span>
                <span className="text-[11px] text-slate-400">Audio Chime & Toast Dispatched</span>
              </div>
              <p className="text-xs text-slate-200 font-mono bg-white/10 p-2.5 rounded-xl">
                &ldquo;{lastTestResult.notification_message}&rdquo;
              </p>
              <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Alert popup is currently floating on your screen. You can practice marking as taken or snoozing.
              </p>
            </motion.div>
          )}

          {/* Test Notifications History */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Simulated Test History ({testNotifs.length})
                </h4>
              </div>

              {testNotifs.length > 0 && (
                <button
                  onClick={handleClearTestReminders}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Test Logs</span>
                </button>
              )}
            </div>

            {testNotifs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No simulated test reminders logged yet. Click &ldquo;Send Test Reminder Now&rdquo; above to generate one.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {testNotifs.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                          TEST
                        </span>
                        <span className="font-bold text-slate-900">{t.medicine_name}</span>
                        <span className="text-slate-500">{t.dosage}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                        {t.notification_message}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'Confirmed Taken'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'Snoozed'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Close Test Mode
          </button>
        </div>
      </motion.div>
    </div>
  );
}
