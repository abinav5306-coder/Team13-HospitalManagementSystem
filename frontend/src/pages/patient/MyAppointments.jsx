import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  FileText,
  MapPin,
  PhoneCall,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPatientAppointments } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MyAppointments() {
  const { patientUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | scheduled | completed | cancelled

  const patientId = patientUser?.id || patientUser?.username || '';

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await getPatientAppointments(patientId);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchAppointments();
    }
  }, [patientId]);

  const filteredAppointments = appointments.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading your clinical appointments..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
            My Doctor Consultations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View your upcoming clinical visits, specialist reviews, and past appointment history.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'scheduled', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                filter === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {tab === 'all' ? `All (${appointments.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List or Empty State */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No appointments found</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            There are currently no visits matching this category. Please contact our front desk to schedule an in-person or follow-up doctor consultation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {appt.doctors?.full_name || 'Dr. Specialist'}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600">
                      {appt.doctors?.specialization || 'Clinical Consultant'}
                    </p>
                  </div>
                </div>

                <div>{getStatusBadge(appt.status)}</div>
              </div>

              {/* Time & Date Badges */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Appointment Date</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{appt.appointment_date}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Slot Time</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{appt.appointment_time}</span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {appt.reason && (
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-700">Reason for visit: </span>
                  <span>{appt.reason}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Main Hospital OPD Wing</span>
                </div>
                <span className="font-mono text-[11px]">ID: {appt.id?.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preparation Guidelines Card */}
      <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-950">Patient Consultation Guidelines</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-blue-900/90 list-disc list-inside">
              <li>Please arrive 10-15 minutes before your scheduled appointment slot.</li>
              <li>Carry your previous prescription slips, blood test reports, and government ID card.</li>
              <li>For cancellations or rescheduling, please contact the front desk at least 2 hours in advance.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
