import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Check, 
  Sun, 
  Sunset, 
  Moon, 
  Calendar, 
  AlertCircle,
  Pill,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPatientMedications, markMedicationTaken } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function TodaySchedule() {
  const { patientUser } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const username = patientUser?.username || '';

  const fetchMeds = async () => {
    try {
      setLoading(true);
      const data = await getPatientMedications(username);
      setMedications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load medications schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      fetchMeds();
    }
  }, [username]);

  const handleMarkTaken = async (id) => {
    try {
      setActionLoading(id);
      setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: true } : m));
      await markMedicationTaken(id);
      showToast('Dose confirmed as taken for today!');
    } catch (err) {
      console.error('Failed to mark taken:', err);
      setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: false } : m));
      showToast('Error recording dose. Please retry.', true);
    } finally {
      setActionLoading(null);
    }
  };

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const total = medications.length;
  const taken = medications.filter(m => m.taken).length;
  const percent = total > 0 ? Math.round((taken / total) * 100) : 100;

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (loading) {
    return <LoadingSpinner text="Building today's schedule..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white transition-all transform animate-bounce ${
            toastMessage.isError ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toastMessage.isError ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* Header and Adherence Progress */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayStr}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Today's Medication Schedule
            </h1>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-2xl font-black text-slate-900">{percent}%</span>
            <span className="text-xs font-semibold text-slate-500 block">Adherence Rate</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>Doses Progress</span>
            <span>{taken} of {total} doses completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Medication Timeline */}
      {medications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Pill className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No doses scheduled for today</h3>
          <p className="text-xs text-slate-500 mt-1">Enjoy your day! There are no pending medications on your checklist.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Chronological Timeline
            </h2>
          </div>

          <div className="relative pl-6 space-y-4 border-l-2 border-slate-200">
            {medications.map((med, idx) => (
              <div key={med.id || idx} className="relative">
                {/* Timeline Dot */}
                <div 
                  className={`absolute -left-[31px] top-4 w-4 h-4 rounded-full border-2 bg-white ${
                    med.taken 
                      ? 'border-emerald-500 bg-emerald-500' 
                      : 'border-blue-600 bg-white'
                  }`}
                />

                {/* Medication Card */}
                <div
                  className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    med.taken ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200/90 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        med.taken ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {med.taken ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          {med.scheduleTime || 'Daily'}
                        </span>
                        <h3 className="font-bold text-base text-slate-900">
                          {med.medicineName}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-1">
                        Instructions: <span className="text-slate-800 font-medium">{med.dosage || 'Take as prescribed'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="w-full sm:w-auto flex sm:justify-end">
                    {med.taken ? (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Dose Taken
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMarkTaken(med.id)}
                        disabled={actionLoading === med.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        {actionLoading === med.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        Mark as Taken
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
