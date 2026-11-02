import React, { useState, useEffect } from 'react';
import {
  Pill,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAdminMedications,
  getAdminPatients,
  assignMedication
} from '../../services/api';

export default function Medications() {
  const [medications, setMedications] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const initialAssignForm = {
    patientUsername: '',
    medicineName: '',
    dosage: '',
    scheduleTime: '09:00'
  };
  const [formData, setFormData] = useState(initialAssignForm);
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
      const [medsList, patList] = await Promise.all([
        getAdminMedications().catch(() => []),
        getAdminPatients().catch(() => [])
      ]);
      setMedications(medsList);
      setPatients(patList);
    } catch (err) {
      console.error('Error loading medications:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered meds
  const filteredMeds = medications.filter((m) => {
    const q = searchQuery.toLowerCase();
    const patientObj = patients.find((p) => p.username === m.patientUsername);
    const patName = patientObj ? (patientObj.fullname || patientObj.name || '').toLowerCase() : '';

    const matchesSearch =
      (m.medicineName || '').toLowerCase().includes(q) ||
      (m.patientUsername || '').toLowerCase().includes(q) ||
      patName.includes(q) ||
      (m.dosage || '').toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'taken' && m.taken) ||
      (statusFilter === 'pending' && !m.taken);

    return matchesSearch && matchesStatus;
  });

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientUsername) {
      setFormError('Please select a patient');
      return;
    }

    setFormError('');
    setSubmitting(true);

    try {
      await assignMedication(formData);
      setIsAssignModalOpen(false);
      setFormData(initialAssignForm);
      triggerToast('Medication scheduled successfully!');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to assign medication');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Patient',
      accessor: 'patientUsername',
      render: (row) => {
        const pat = patients.find((p) => p.username === row.patientUsername);
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              {(pat?.fullname || row.patientUsername || 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-slate-900 block leading-tight">
                {pat?.fullname || pat?.name || row.patientUsername}
              </span>
              <span className="text-[11px] text-blue-600 font-mono">@{row.patientUsername}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Medication Name',
      accessor: 'medicineName',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-800 text-xs">{row.medicineName}</span>
        </div>
      )
    },
    {
      header: 'Dosage / Instructions',
      accessor: 'dosage',
      render: (row) => <span className="text-xs text-slate-600">{row.dosage || '-'}</span>
    },
    {
      header: 'Scheduled Time',
      accessor: 'scheduleTime',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          {row.scheduleTime || '-'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'taken',
      render: (row) => (
        row.taken ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Taken
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        )
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
            placeholder="Search by patient name or medicine..."
          />

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All Prescriptions</option>
              <option value="pending">Pending</option>
              <option value="taken">Taken</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData(initialAssignForm);
            setFormError('');
            setIsAssignModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Assign Medication
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredMeds}
        keyField="id"
        isLoading={loading}
        emptyMessage="No medications recorded"
        emptySubtext={searchQuery ? 'Try another search term' : 'Assign medications to patients to track adherence'}
      />

      {/* ================= ASSIGN MEDICATION MODAL ================= */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Prescription to Patient"
        description="Select a registered patient and set dosage and schedule times"
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
            <select
              required
              value={formData.patientUsername}
              onChange={(e) => setFormData({ ...formData, patientUsername: e.target.value })}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="" disabled>-- Choose a patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.username}>
                  {p.fullname || p.name} (@{p.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name *</label>
            <input
              type="text"
              required
              value={formData.medicineName}
              onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
              placeholder="e.g. Paracetamol 500mg, Amoxicillin"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage & Instructions *</label>
            <input
              type="text"
              required
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              placeholder="e.g. 1 tablet twice daily after food"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Time *</label>
            <input
              type="time"
              required
              value={formData.scheduleTime}
              onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Assign Medication'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
