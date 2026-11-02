import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartPulse, 
  Pill, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Activity,
  PhoneCall,
  UserCheck,
  FlaskConical,
  Bell,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getPatientMedications, markMedicationTaken, getPatientAppointments } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PatientOverview() {
  const { patientUser } = useAuth();
  const {
    notifications,
    dueCount,
    setTestModeOpen,
    handleTakeMedicine,
    handleSnooze,
    browserPermission,
    requestBrowserPermission
  } = useNotifications();

  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [historyTab, setHistoryTab] = useState('all'); // 'all', 'clinical', 'test'

  const username = patientUser?.username || '';
  const patientId = patientUser?.id || username;
  const displayName = patientUser?.fullname || patientUser?.name || username || 'Patient';

  const loadData = async () => {
    try {
      setLoading(true);
      const [medsData, apptsData] = await Promise.all([
        getPatientMedications(username).catch(() => []),
        getPatientAppointments(patientId).catch(() => [])
      ]);
      setMedications(Array.isArray(medsData) ? medsData : []);
      setAppointments(Array.isArray(apptsData) ? apptsData : []);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      loadData();
    }
  }, [username, patientId]);

  // Sync when notifications change (e.g. marked taken)
  useEffect(() => {
    if (notifications.some(n => n.status === 'Confirmed Taken')) {
      getPatientMedications(username)
        .then(data => Array.isArray(data) && setMedications(data))
        .catch(() => {});
    }
  }, [notifications, username]);

  const handleMarkTaken = async (medId) => {
    try {
      setActionLoading(medId);
      // Optimistic update
      setMedications(prev => prev.map(m => m.id === medId ? { ...m, taken: true } : m));
      await markMedicationTaken(medId);
      showToast('Medication recorded as taken. Great job keeping up with your health!');
      // Also sync if there was an active notification for this medication
      const matchingNotif = notifications.find(n => n.medication_id === medId && n.status === 'Due');
      if (matchingNotif) {
        handleTakeMedicine(matchingNotif.id).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to mark taken:', err);
      setMedications(prev => prev.map(m => m.id === medId ? { ...m, taken: false } : m));
      showToast('Could not record status. Please try again.', true);
    } finally {
      setActionLoading(null);
    }
  };

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const totalMeds = medications.length;
  const takenMeds = medications.filter(m => m.taken).length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const nextAppointment = appointments.find(a => a.status === 'scheduled');
  const dueNotifications = notifications.filter(n => n.status === 'Due');

  if (loading) {
    return <LoadingSpinner fullScreen={false} text="Loading your health portal..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white transition-all transform animate-bounce ${
            toastMessage.isError ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toastMessage.isError ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="font-medium text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* URGENT: DUE MEDICINE REMINDER CARDS (PHASE 2 & PHASE 8)      */}
      {/* ============================================================ */}
      {dueNotifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <h2 className="text-base sm:text-lg font-black text-rose-700 tracking-tight flex items-center gap-2">
                <span>Medicine Due Right Now</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                  {dueNotifications.length} Action Required
                </span>
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Please take your scheduled dose as prescribed by your doctor.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`relative overflow-hidden rounded-2xl p-5 border-2 shadow-lg transition-all ${
                  notif.is_test
                    ? 'bg-amber-50/90 border-amber-400 text-slate-900 shadow-amber-900/10'
                    : 'bg-gradient-to-br from-white to-rose-50/40 border-rose-400 text-slate-900 shadow-rose-900/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        notif.is_test
                          ? 'bg-amber-500 text-white font-bold'
                          : 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                      }`}
                    >
                      <Pill className="w-6 h-6 animate-pulse" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base text-slate-900 font-['Plus_Jakarta_Sans']">
                          {notif.medicine_name}
                        </h3>
                        {notif.is_test ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                            TEST
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-xs animate-pulse">
                            DUE NOW
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 font-semibold">
                        {notif.dosage && <span>Dosage: {notif.dosage}</span>}
                        {notif.scheduled_time && (
                          <span className="flex items-center gap-1 text-rose-700 font-bold">
                            <Clock className="w-3.5 h-3.5 text-rose-600" />
                            {notif.scheduled_time}
                          </span>
                        )}
                        {notif.quantity && <span>Qty: {notif.quantity}</span>}
                      </div>

                      <p className="text-xs text-slate-700 mt-2 bg-white/70 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
                        {notif.notification_message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Big Elderly-Friendly Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleTakeMedicine(notif.id)}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>MARK AS TAKEN</span>
                  </button>

                  <button
                    onClick={() => handleSnooze(notif.id, 10)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                    title="Remind me in 10 minutes"
                  >
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>Snooze 10m</span>
                  </button>

                  <button
                    onClick={() => handleSnooze(notif.id, 15)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                    title="Remind me in 15 minutes"
                  >
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>Snooze 15m</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TEST MODE & BROWSER NOTIFICATIONS CONTROL BANNER             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Test Mode Card */}
        <div className="md:col-span-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-2 ring-white/30 flex-shrink-0">
              <FlaskConical className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base font-['Plus_Jakarta_Sans']">
                  Reminder Test Mode
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-950/40 text-amber-200">
                  Patient Sandbox
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-1 max-w-lg leading-relaxed">
                Test audio chimes, toasts, and reminders instantly using your actual prescribed medicines without waiting for scheduled times.
              </p>
            </div>
          </div>

          <button
            onClick={() => setTestModeOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-950 bg-white hover:bg-amber-50 active:scale-95 shadow-md shadow-orange-950/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>Launch Test Mode</span>
          </button>
        </div>

        {/* Browser Push Permission Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Desktop Alerts
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                browserPermission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {browserPermission === 'granted' ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="mt-2">
            <p className="text-xs text-slate-600">
              {browserPermission === 'granted'
                ? 'Desktop medicine alerts are enabled and will pop up even when viewing other tabs.'
                : 'Turn on desktop notifications to hear chimes and get timely medicine alerts.'}
            </p>
          </div>

          <div className="mt-3 pt-2">
            {browserPermission !== 'granted' ? (
              <button
                onClick={requestBrowserPermission}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Desktop Alerts</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active on this device</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <HeartPulse className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-100 text-xs font-semibold mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>{todayStr}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 text-blue-100 text-sm sm:text-base leading-relaxed">
            Here is your daily medical care plan. Stay consistent with your prescribed medications for a speedy and healthy recovery.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/patient/today"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 rounded-xl font-bold text-sm shadow-md hover:bg-blue-50 transition-colors"
            >
              <Clock className="w-4 h-4" />
              View Today&apos;s Routine
            </Link>
            <Link
              to="/patient/appointments"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              My Consultations
            </Link>
            <button
              onClick={() => setTestModeOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/40 text-amber-200 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              <FlaskConical className="w-4 h-4 text-amber-300" />
              Test Reminders
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Adherence Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Adherence</span>
            <div className={`p-2 rounded-xl ${adherencePercent === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900">{adherencePercent}%</span>
              <span className="text-xs font-semibold text-slate-500">
                {takenMeds} of {totalMeds} doses
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  adherencePercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${adherencePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Next Dose / Prescriptions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Prescriptions</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Pill className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{totalMeds}</span>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {totalMeds - takenMeds > 0 ? `${totalMeds - takenMeds} doses pending today` : 'All prescribed doses taken today'}
            </p>
          </div>
        </div>

        {/* Next Appointment Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Next Consultation</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {nextAppointment ? (
              <div>
                <p className="text-sm font-bold text-slate-900 line-clamp-1">
                  {nextAppointment.doctors?.full_name || 'Assigned Specialist'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {nextAppointment.appointment_date} at {nextAppointment.appointment_time}
                </p>
              </div>
            ) : (
              <div>
                <span className="text-sm font-bold text-slate-700">No upcoming visits</span>
                <p className="text-xs text-slate-400 mt-0.5">All scheduled checkups clear</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Pharmax Medication Cards & Health Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pharmax Daily Medication Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Today's Prescriptions</h2>
            </div>
            <Link
              to="/patient/medications"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View Full List
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {medications.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Pill className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No active medications scheduled</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Your medical team has not assigned any pending prescriptions to your profile at this moment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map((med) => (
                <div
                  key={med.id}
                  className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    med.taken ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200/90 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        med.taken 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {med.taken ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Pill className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900">
                          {med.medicineName}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            med.taken
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {med.taken ? 'Taken' : 'Scheduled'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 font-medium">
                        Dosage: <span className="text-slate-900 font-semibold">{med.dosage || 'As directed'}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Scheduled: {med.scheduleTime || 'Daily'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mark as Taken Button */}
                  <div className="w-full sm:w-auto flex sm:justify-end">
                    {med.taken ? (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100/80 text-emerald-800 rounded-xl font-bold text-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                        Dose Completed
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMarkTaken(med.id)}
                        disabled={actionLoading === med.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                      >
                        {actionLoading === med.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        )}
                        Mark as Taken
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Next Appointment & Emergency Quick Card */}
        <div className="space-y-6">
          {/* Upcoming Visit Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Doctor Consultation
              </h3>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>

            {nextAppointment ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {nextAppointment.doctors?.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {nextAppointment.doctors?.full_name || 'Dr. Specialist'}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        {nextAppointment.doctors?.specialization || 'Consultant'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Date:</span>
                      <p className="font-bold text-slate-800">{nextAppointment.appointment_date}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Time:</span>
                      <p className="font-bold text-slate-800">{nextAppointment.appointment_time}</p>
                    </div>
                  </div>

                  {nextAppointment.reason && (
                    <div className="mt-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Reason: </span>
                      {nextAppointment.reason}
                    </div>
                  )}
                </div>

                <Link
                  to="/patient/appointments"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
                >
                  Manage Appointments
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No pending appointments scheduled.</p>
                <Link
                  to="/patient/appointments"
                  className="mt-3 inline-block text-xs font-bold text-blue-600 hover:underline"
                >
                  View appointment history
                </Link>
              </div>
            )}
          </div>

          {/* Quick Health Tips / Support Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Need Medical Support?</h4>
                <p className="text-[11px] text-slate-400">Hospital Desk Available 24/7</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              If you experience unexpected side effects or miss multiple doses, notify our nursing desk immediately.
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/80">
              <span className="text-xs font-medium text-slate-400">Emergency Line:</span>
              <span className="text-sm font-extrabold text-blue-400 font-mono">1800-419-MED</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* NOTIFICATION & REMINDER ADHERENCE HISTORY (PHASE 2 & PHASE 8) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 font-['Plus_Jakarta_Sans']">
                Medicine Reminder History & Logs
              </h3>
              <p className="text-xs text-slate-500">
                Review automated alerts, confirmed dosage logs, and simulated tests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setHistoryTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  historyTab === 'all' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setHistoryTab('clinical')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  historyTab === 'clinical' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Clinical ({notifications.filter(n => !n.is_test).length})
              </button>
              <button
                onClick={() => setHistoryTab('test')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  historyTab === 'test' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Test Logs ({notifications.filter(n => n.is_test).length})
              </button>
            </div>

            <button
              onClick={() => setTestModeOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              <span>Test Mode</span>
            </button>
          </div>
        </div>

        {/* History items */}
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No medicine reminder logs recorded yet today. Reminders will generate automatically at your scheduled times.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications
              .filter((n) => {
                if (historyTab === 'clinical') return !n.is_test;
                if (historyTab === 'test') return n.is_test;
                return true;
              })
              .slice(0, 8)
              .map((n) => (
                <div key={n.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        n.is_test
                          ? 'bg-amber-100 text-amber-800'
                          : n.status === 'Confirmed Taken'
                          ? 'bg-emerald-100 text-emerald-800'
                          : n.status === 'Due'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <Pill className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{n.medicine_name}</span>
                        {n.dosage && <span className="text-slate-500 font-medium">({n.dosage})</span>}
                        {n.is_test && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                            TEST
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            n.status === 'Confirmed Taken'
                              ? 'bg-emerald-100 text-emerald-800'
                              : n.status === 'Due'
                              ? 'bg-rose-100 text-rose-800'
                              : n.status === 'Snoozed'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {n.status}
                        </span>
                      </div>

                      <p className="text-slate-600 mt-1 line-clamp-1">{n.notification_message}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Scheduled: {n.scheduled_time}
                        </span>
                        {n.taken_at && (
                          <span className="text-emerald-700 font-semibold">
                            Taken at: {new Date(n.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {n.snooze_until && n.status === 'Snoozed' && (
                          <span className="text-purple-700 font-semibold">
                            Snoozed until: {new Date(n.snooze_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions if Due or Snoozed */}
                  {(n.status === 'Due' || n.status === 'Snoozed') && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleTakeMedicine(n.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        Mark Taken
                      </button>
                      <button
                        onClick={() => handleSnooze(n.id, 10)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        10m
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
