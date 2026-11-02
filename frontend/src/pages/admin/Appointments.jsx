import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  XCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Stethoscope,
  FileText
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAdminAppointments,
  getAdminPatients,
  getAdminDoctors,
  createAdminAppointment,
  updateAdminAppointment,
  deleteAdminAppointment
} from '../../services/api';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Form State
  const initialFormState = {
    patient_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00',
    reason: '',
    status: 'scheduled'
  };
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  async function loadData() {
    try {
      setLoading(true);
      const [apptList, patList, docList] = await Promise.all([
        getAdminAppointments().catch(() => []),
        getAdminPatients().catch(() => []),
        getAdminDoctors().catch(() => [])
      ]);
      setAppointments(apptList);
      setPatients(patList);
      setDoctors(docList);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredAppts = appointments.filter((appt) => {
    const q = searchQuery.toLowerCase();
    const patName = (appt.patients?.fullname || appt.patients?.name || appt.patients?.username || '').toLowerCase();
    const docName = (appt.doctors?.full_name || '').toLowerCase();
    const reason = (appt.reason || '').toLowerCase();

    const matchesSearch =
      patName.includes(q) || docName.includes(q) || reason.includes(q);

    const matchesStatus =
      statusFilter === 'all' || appt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.doctor_id) {
      setFormError('Please select both a patient and a doctor');
      return;
    }

    setFormError('');
    setSubmitting(true);

    try {
      await createAdminAppointment(formData);
      setIsBookModalOpen(false);
      setFormData(initialFormState);
      triggerToast('Appointment booked successfully!');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error booking appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (appt) => {
    setSelectedAppt(appt);
    setFormData({
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time,
      reason: appt.reason || '',
      status: appt.status || 'scheduled'
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setFormError('');
    setSubmitting(true);

    try {
      await updateAdminAppointment(selectedAppt.id, formData);
      setIsEditModalOpen(false);
      triggerToast('Appointment updated successfully!');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error updating appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await deleteAdminAppointment(id);
      triggerToast('Appointment cancelled.');
      loadData();
    } catch (err) {
      alert(err.message || 'Error cancelling appointment');
    }
  };

  const columns = [
    {
      header: 'Patient',
      accessor: 'patient_id',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
            {(row.patients?.fullname || row.patients?.username || 'P').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-900 block leading-tight">
              {row.patients?.fullname || row.patients?.name || row.patients?.username || 'Patient'}
            </span>
            <span className="text-[11px] text-blue-600 font-mono">
              @{row.patients?.username || 'user'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Doctor & Department',
      accessor: 'doctor_id',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block leading-tight">
            {row.doctors?.full_name || 'Specialist Doctor'}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {row.doctors?.specialization || 'Clinical Medicine'}
          </span>
        </div>
      )
    },
    {
      header: 'Schedule Slot',
      accessor: 'appointment_date',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            {row.appointment_date}
          </span>
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {row.appointment_time}
          </span>
        </div>
      )
    },
    {
      header: 'Clinical Reason',
      accessor: 'reason',
      render: (row) => (
        <span className="text-xs text-slate-600 truncate max-w-xs block">
          {row.reason || 'General checkup'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const statusMap = {
          scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
          cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
        };
        const s = statusMap[row.status] || statusMap.scheduled;
        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${s.bg} ${s.text} border ${s.border}`}
          >
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Edit / Reschedule"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {row.status !== 'cancelled' && (
            <button
              onClick={() => handleCancelAppointment(row.id)}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Cancel Appointment"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by patient, doctor, or reason..."
          />

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All Appointments</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData(initialFormState);
            setFormError('');
            setIsBookModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredAppts}
        keyField="id"
        isLoading={loading}
        emptyMessage="No appointments scheduled"
        emptySubtext={searchQuery ? 'Try another search term' : 'Book a consultation for a patient'}
      />

      {/* ================= BOOK APPOINTMENT MODAL ================= */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Schedule Patient Appointment"
        description="Book a consultation with an on-duty doctor"
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleBookSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
            <select
              required
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="" disabled>-- Choose a patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullname || p.name} (@{p.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor *</label>
            <select
              required
              value={formData.doctor_id}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="" disabled>-- Choose a doctor --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} — {d.specialization} ({d.availability})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time *</label>
              <input
                type="time"
                required
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Clinical Notes</label>
            <textarea
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Chest pain follow-up, Routine consultation"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= EDIT / RESCHEDULE MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit / Reschedule Appointment"
        description="Update appointment time, date, assigned doctor, or status"
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Patient</label>
            <select
              required
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullname || p.name} (@{p.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor</label>
            <select
              required
              value={formData.doctor_id}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} — {d.specialization}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                required
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Notes</label>
            <textarea
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Update Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
