import React, { useState, useEffect } from 'react';
import { 
  History, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Pill, 
  ShieldCheck, 
  Award,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPatientMedications } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MedicationHistory() {
  const { patientUser } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  const username = patientUser?.username || '';

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getPatientMedications(username);
        setMedications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load medication history:', err);
      } finally {
        setLoading(false);
      }
    }
    if (username) {
      loadData();
    }
  }, [username]);

  const takenMedications = medications.filter(m => m.taken);
  const total = medications.length;
  const takenCount = takenMedications.length;
  const adherenceRate = total > 0 ? Math.round((takenCount / total) * 100) : 100;

  if (loading) {
    return <LoadingSpinner text="Loading adherence history..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
          Medication Adherence History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your completed dosage logs and track your ongoing clinical adherence.
        </p>
      </div>

      {/* Adherence Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Doses Taken</span>
            <span className="text-2xl font-black text-slate-900">{takenCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Adherence Rate</span>
            <span className="text-2xl font-black text-slate-900">{adherenceRate}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Compliance</span>
            <span className="text-sm font-bold text-slate-900">
              {adherenceRate >= 80 ? 'Excellent' : adherenceRate >= 50 ? 'Moderate' : 'Needs Attention'}
            </span>
          </div>
        </div>
      </div>

      {/* History Log List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Completed Dosages</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {takenCount} record{takenCount === 1 ? '' : 's'}
          </span>
        </div>

        {takenMedications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No completed doses logged yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When you mark your medications as taken from your daily schedule, they will appear here as confirmed logs.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {takenMedications.map((med) => (
              <div key={med.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{med.medicineName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dosage: <span className="font-semibold text-slate-700">{med.dosage}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{med.scheduleTime || 'Today'}</span>
                  </div>
                  <span className="block text-[11px] text-slate-400 mt-1">Confirmed Taken</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
