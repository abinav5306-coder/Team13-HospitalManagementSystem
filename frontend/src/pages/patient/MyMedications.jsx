import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Search, 
  Clock, 
  CheckCircle2, 
  Check, 
  AlertCircle, 
  Filter,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPatientMedications, markMedicationTaken } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MyMedications() {
  const { patientUser } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | taken
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const username = patientUser?.username || '';

  const fetchMeds = async () => {
    try {
      setLoading(true);
      const data = await getPatientMedications(username);
      setMedications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load medications:', err);
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
      // Optimistic update
      setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: true } : m));
      await markMedicationTaken(id);
      showToast('Medication marked as taken!');
    } catch (err) {
      console.error('Failed to mark taken:', err);
      setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: false } : m));
      showToast('Failed to update status', true);
    } finally {
      setActionLoading(null);
    }
  };

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredMeds = medications.filter(m => {
    const matchesSearch = (m.medicineName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.dosage || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'pending') return matchesSearch && !m.taken;
    if (statusFilter === 'taken') return matchesSearch && m.taken;
    return matchesSearch;
  });

  const pendingCount = medications.filter(m => !m.taken).length;
  const takenCount = medications.filter(m => m.taken).length;

  if (loading) {
    return <LoadingSpinner text="Loading prescriptions..." />;
  }

  return (
    <div className="space-y-6">
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

      {/* Header and Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
            Prescriptions & Medications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your current prescription schedule and record doses taken in real time.
          </p>
        </div>

        {/* Quick status counters */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            {pendingCount} Pending
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            {takenCount} Taken
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine or dosage..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({medications.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('taken')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'taken'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed ({takenCount})
          </button>
        </div>
      </div>

      {/* Medication Cards Grid */}
      {filteredMeds.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Pill className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No prescriptions found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? 'No medications match your search criteria. Try a different query.' 
              : 'There are no medications recorded in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map((med) => (
            <div
              key={med.id}
              className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm flex flex-col justify-between gap-4 ${
                med.taken ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200/90 hover:border-blue-400'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    med.taken ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {med.taken ? <CheckCircle2 className="w-6 h-6" /> : <Pill className="w-6 h-6" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-base text-slate-900 truncate">
                      {med.medicineName}
                    </h3>
                    <span
                      className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                        med.taken
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {med.taken ? 'Taken' : 'Pending'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    Dosage: <span className="text-slate-900 font-bold">{med.dosage || 'Standard dose'}</span>
                  </p>

                  <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Scheduled Time: <strong className="text-slate-700">{med.scheduleTime || 'Daily'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Area */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {med.taken ? 'Recorded in health log' : 'Awaiting confirmation'}
                </span>

                {med.taken ? (
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-lg">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Taken
                  </div>
                ) : (
                  <button
                    onClick={() => handleMarkTaken(med.id)}
                    disabled={actionLoading === med.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
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
          ))}
        </div>
      )}
    </div>
  );
}
