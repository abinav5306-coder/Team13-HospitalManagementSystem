import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Pill,
  Calendar,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  ExternalLink
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAdminPatients,
  getAdminDoctors,
  getAdminMedications,
  getAdminAppointments,
  testBackendConnection
} from '../../services/api';

export default function AdminOverview() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    activePrescriptions: 0,
    todayAppointments: 0,
  });

  const [recentPatients, setRecentPatients] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    async function loadOverviewData() {
      try {
        setLoading(true);
        const [patients, doctors, medications, appointments, dbRes] = await Promise.all([
          getAdminPatients().catch(() => []),
          getAdminDoctors().catch(() => []),
          getAdminMedications().catch(() => []),
          getAdminAppointments().catch(() => []),
          testBackendConnection().catch(() => null)
        ]);

        const todayDateStr = new Date().toISOString().split('T')[0];

        // Today's appointments count
        const todayCount = appointments.filter(
          (a) => a.appointment_date === todayDateStr && a.status !== 'cancelled'
        ).length;

        // Active medications count
        const activeMedsCount = medications.filter((m) => !m.taken).length;

        setStats({
          totalPatients: patients.length,
          totalDoctors: doctors.length,
          activePrescriptions: activeMedsCount,
          todayAppointments: todayCount,
        });

        // Recent 5 patients
        const sortedPatients = [...patients].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        setRecentPatients(sortedPatients.slice(0, 5));

        // Upcoming 5 appointments
        const validAppts = appointments.filter((a) => a.status !== 'cancelled');
        setUpcomingAppointments(validAppts.slice(0, 5));

        setDbStatus(dbRes);
      } catch (err) {
        console.error('Error loading dashboard overview:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOverviewData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Aggregating hospital analytics..." />;
  }

  return (
    <div className="space-y-7">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30">
            <Database className="w-3.5 h-3.5" />
            <span>
              {dbStatus?.mode === 'local' ? 'Local JSON DB Active' : 'Supabase Cloud Database Connected'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
            Hospital Operations Center
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
            Monitor real-time patient admissions, active prescription schedules, doctor staffing, and scheduled appointments across departments.
          </p>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            <button
              onClick={() => navigate('/admin/patients')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Patient
            </button>
            <button
              onClick={() => navigate('/admin/appointments')}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Book Appointment
            </button>
            <button
              onClick={() => navigate('/admin/medications')}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Pill className="w-3.5 h-3.5 text-emerald-400" /> Assign Medicine
            </button>
            <button
              onClick={() => navigate('/admin/doctors')}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Add Doctor
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-[-40px] top-[-40px] w-80 h-80 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
        <div className="absolute right-20 bottom-[-60px] w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          subtitle="Registered patient records"
          icon={Users}
          trend="+12%"
          trendPositive={true}
          color="blue"
          badgeText="Active"
        />
        <StatCard
          title="Staff Doctors"
          value={stats.totalDoctors}
          subtitle="Available specialists"
          icon={UserCheck}
          trend="100%"
          trendPositive={true}
          color="purple"
          badgeText="Staffed"
        />
        <StatCard
          title="Active Prescriptions"
          value={stats.activePrescriptions}
          subtitle="Scheduled to take"
          icon={Pill}
          trend="+5%"
          trendPositive={true}
          color="emerald"
          badgeText="Active"
        />
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          subtitle="Consultations booked"
          icon={Calendar}
          trend="On Track"
          trendPositive={true}
          color="amber"
          badgeText="Today"
        />
      </div>

      {/* Grid: Recent Patients & Upcoming Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Patients (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Recent Patient Admissions
              </h3>
              <p className="text-xs text-slate-500">Latest patients added to the registry</p>
            </div>
            <Link
              to="/admin/patients"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              View All Patients <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Gender / DOB</th>
                  <th className="py-2.5 px-3">Username</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {recentPatients.length > 0 ? (
                  recentPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{p.fullname || p.name || 'Unnamed'}</div>
                        <div className="text-[11px] text-slate-400">{p.email}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">{p.mobile || p.phone || '-'}</td>
                      <td className="py-3 px-3">
                        <span className="capitalize">{p.gender || '-'}</span>
                        <div className="text-[11px] text-slate-400">{p.dob || '-'}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-blue-600 font-semibold">
                        @{p.username}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No patients registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Upcoming Consultations (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Upcoming Consultations
              </h3>
              <p className="text-xs text-slate-500">Scheduled appointments</p>
            </div>
            <Link
              to="/admin/appointments"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appt) => {
                const patientName = appt.patients?.fullname || appt.patients?.username || 'Patient';
                const doctorName = appt.doctors?.full_name || 'Assigned Doctor';
                const spec = appt.doctors?.specialization || 'Consultation';

                return (
                  <div
                    key={appt.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">{patientName}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                        {appt.appointment_time}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span>With</span>
                      <strong className="text-slate-700">{doctorName}</strong>
                      <span className="text-slate-400">({spec})</span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1 pt-1 border-t border-slate-100">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{appt.appointment_date}</span>
                      {appt.reason && <span className="truncate">• {appt.reason}</span>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium">No upcoming consultations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
