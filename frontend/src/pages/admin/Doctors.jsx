import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Stethoscope
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAdminDoctors,
  createAdminDoctor,
  updateAdminDoctor,
  deleteAdminDoctor
} from '../../services/api';

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Form
  const initialDoctorState = {
    full_name: '',
    email: '',
    mobile: '',
    specialization: 'General Medicine',
    availability: 'available'
  };
  const [formData, setFormData] = useState(initialDoctorState);
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
      const list = await getAdminDoctors();
      setDoctors(list);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      (doc.full_name || '').toLowerCase().includes(q) ||
      (doc.email || '').toLowerCase().includes(q) ||
      (doc.mobile || '').includes(q) ||
      (doc.specialization || '').toLowerCase().includes(q)
    );
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await createAdminDoctor(formData);
      setIsAddModalOpen(false);
      setFormData(initialDoctorState);
      triggerToast('Doctor registered successfully!');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error registering doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (doc) => {
    setSelectedDoctor(doc);
    setFormData({
      full_name: doc.full_name || '',
      email: doc.email || '',
      mobile: doc.mobile || '',
      specialization: doc.specialization || 'General Medicine',
      availability: doc.availability || 'available'
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setFormError('');
    setSubmitting(true);

    try {
      await updateAdminDoctor(selectedDoctor.id, formData);
      setIsEditModalOpen(false);
      triggerToast('Doctor details updated successfully!');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error updating doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDoctor) return;
    setSubmitting(true);

    try {
      await deleteAdminDoctor(selectedDoctor.id);
      setIsDeleteModalOpen(false);
      triggerToast('Doctor removed successfully.');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to remove doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Doctor Name',
      accessor: 'full_name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
            {(row.full_name || 'D').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{row.full_name}</span>
            <span className="text-[11px] text-slate-400">MD / Specialist</span>
          </div>
        </div>
      )
    },
    {
      header: 'Specialization',
      accessor: 'specialization',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
          <Stethoscope className="w-3.5 h-3.5" />
          {row.specialization}
        </span>
      )
    },
    {
      header: 'Contact Info',
      accessor: 'email',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-700 block leading-tight">{row.email}</span>
          <span className="text-[11px] text-slate-400 font-medium">{row.mobile}</span>
        </div>
      )
    },
    {
      header: 'Availability',
      accessor: 'availability',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
            row.availability === 'available'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              row.availability === 'available' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          {row.availability}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Edit Doctor"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedDoctor(row);
              setFormError('');
              setIsDeleteModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Remove Doctor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search doctor by name, email, or specialty..."
        />

        <button
          onClick={() => {
            setFormData(initialDoctorState);
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Doctor
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredDoctors}
        keyField="id"
        isLoading={loading}
        emptyMessage="No doctors listed"
        emptySubtext={searchQuery ? 'Try another search keyword' : 'Add specialists to your hospital team'}
      />

      {/* ================= ADD DOCTOR MODAL ================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Staff Doctor"
        description="Register a physician or specialist in the hospital system"
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name & Title *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Dr. Emily Davis, MD"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="dr.davis@hospital.com"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
            <input
              type="tel"
              required
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="9876543210"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization *</label>
            <select
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="Cardiology">Cardiology</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Oncology">Oncology</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Duty Availability</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= EDIT DOCTOR MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Doctor Details"
        description="Update doctor contact information, specialty, or duty status"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
            <input
              type="tel"
              required
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
            <select
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="Cardiology">Cardiology</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Oncology">Oncology</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Availability</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
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
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= DELETE CONFIRMATION ================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Staff Doctor"
        description="Verify doctor deletion"
        maxWidth="max-w-sm"
      >
        {formError ? (
          <div className="p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="font-semibold mb-1">Cannot Delete Doctor</p>
            <p>{formError}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-600 mb-6">
            Are you sure you want to remove <strong className="text-slate-900">{selectedDoctor?.full_name}</strong>? If there are active appointments scheduled with this doctor, removal will be prevented.
          </p>
        )}

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            {formError ? 'Close' : 'Cancel'}
          </button>
          {!formError && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Removing...' : 'Confirm Remove'}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
