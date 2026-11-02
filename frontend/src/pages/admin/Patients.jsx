import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Pill,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Phone,
  Mail,
  User
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAdminPatients,
  createAdminPatient,
  updateAdminPatient,
  deleteAdminPatient,
  getAdminMedications
} from '../../services/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected / Active Patient
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form State
  const initialFormState = {
    fullname: '',
    email: '',
    mobile: '',
    dob: '',
    gender: 'male',
    address: '',
    username: '',
    password: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const triggerToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  async function loadData() {
    try {
      setLoading(true);
      const [patList, medList] = await Promise.all([
        getAdminPatients().catch(() => []),
        getAdminMedications().catch(() => [])
      ]);
      setPatients(patList);
      setMedications(medList);
    } catch (e) {
      console.error('Error fetching patients:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.fullname || p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.mobile || p.phone || '').includes(q) ||
      (p.username || '').toLowerCase().includes(q);

    const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  // Open Edit Modal
  const openEditModal = (patient) => {
    setSelectedPatient(patient);
    setFormData({
      fullname: patient.fullname || patient.name || '',
      email: patient.email || '',
      mobile: patient.mobile || patient.phone || '',
      dob: patient.dob || '',
      gender: patient.gender || 'male',
      address: patient.address || '',
      username: patient.username || '',
      password: '' // empty means keep existing
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open View Modal
  const openViewModal = (patient) => {
    setSelectedPatient(patient);
    setIsViewModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (patient) => {
    setSelectedPatient(patient);
    setIsDeleteModalOpen(true);
  };

  // Handle Create Patient
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      await createAdminPatient(formData);
      setIsAddModalOpen(false);
      setFormData(initialFormState);
      triggerToast('Patient created successfully!');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error creating patient');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Patient
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setFormError('');
    setFormSubmitting(true);

    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Do not overwrite if blank

      await updateAdminPatient(selectedPatient.id, payload);
      setIsEditModalOpen(false);
      triggerToast('Patient details updated successfully!');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error updating patient');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Patient
  const handleDeleteConfirm = async () => {
    if (!selectedPatient) return;
    setFormSubmitting(true);

    try {
      await deleteAdminPatient(selectedPatient.id);
      setIsDeleteModalOpen(false);
      triggerToast('Patient record deleted successfully.');
      loadData();
    } catch (err) {
      alert(err.message || 'Error deleting patient');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Columns for DataTable
  const columns = [
    {
      header: 'Patient Details',
      accessor: 'fullname',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
            {(row.fullname || row.name || 'P').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-900 block leading-tight">
              {row.fullname || row.name || 'Unnamed'}
            </span>
            <span className="text-[11px] text-blue-600 font-mono">@{row.username}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Contact Info',
      accessor: 'email',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-700 block leading-tight">{row.email || '-'}</span>
          <span className="text-[11px] text-slate-400 font-medium">{row.mobile || row.phone || '-'}</span>
        </div>
      )
    },
    {
      header: 'Date of Birth',
      accessor: 'dob',
      render: (row) => <span className="text-xs text-slate-600">{row.dob || '-'}</span>
    },
    {
      header: 'Gender',
      accessor: 'gender',
      render: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
            row.gender === 'female'
              ? 'bg-pink-50 text-pink-700 border border-pink-200/60'
              : row.gender === 'male'
              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
              : 'bg-slate-100 text-slate-700 border border-slate-200/60'
          }`}
        >
          {row.gender || '-'}
        </span>
      )
    },
    {
      header: 'Medicines',
      accessor: 'medications',
      render: (row) => {
        const patientMeds = medications.filter((m) => m.patientUsername === row.username);
        const count = patientMeds.length;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
              count > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Pill className="w-3 h-3" />
            {count} {count === 1 ? 'Med' : 'Meds'}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openViewModal(row)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Edit Patient"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteModal(row)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Patient"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Action / Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, email, phone or username..."
          />

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData(initialFormState);
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Patient
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredPatients}
        keyField="id"
        isLoading={loading}
        emptyMessage="No patients found"
        emptySubtext={searchQuery ? 'Try adjusting your search criteria' : 'Add your first patient to begin'}
        onRowClick={openViewModal}
      />

      {/* ================= ADD PATIENT MODAL ================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Patient"
        description="Create a comprehensive patient record in the hospital registry"
        maxWidth="max-w-xl"
      >
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullname}
                onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                placeholder="John Doe"
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
                placeholder="john@example.com"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile (10 digits) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="9876543210"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Portal Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="johndoe32"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, City, State"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Set Account Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
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
              disabled={formSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= EDIT PATIENT MODAL ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Patient Details"
        description="Update demographics, contact info, or portal credentials"
        maxWidth="max-w-xl"
      >
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.fullname}
                onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
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
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Update Password <span className="text-slate-400 font-normal">(leave blank to keep unchanged)</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password or leave blank"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
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
              disabled={formSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= VIEW PATIENT MODAL ================= */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Patient Medical Profile"
        description="Complete demographic and active prescription overview"
        maxWidth="max-w-md"
      >
        {selectedPatient && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white text-xl font-bold flex items-center justify-center shadow-md shadow-blue-500/20">
                {(selectedPatient.fullname || selectedPatient.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  {selectedPatient.fullname || selectedPatient.name || 'Patient'}
                </h4>
                <p className="text-xs text-blue-700 font-mono">@{selectedPatient.username}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 capitalize border border-blue-200">
                  {selectedPatient.gender || 'Not specified'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-500">Email:</span>
                <span className="truncate">{selectedPatient.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-500">Mobile:</span>
                <span>{selectedPatient.mobile || selectedPatient.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-500">Birth Date:</span>
                <span>{selectedPatient.dob || '-'}</span>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="font-semibold text-slate-500">Address:</span>
                <span className="flex-1">{selectedPatient.address || 'No address registered'}</span>
              </div>
            </div>

            {/* Medications for this patient */}
            <div className="pt-3 border-t border-slate-100">
              <h5 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-indigo-600" /> Active Medications
              </h5>
              {(() => {
                const patMeds = medications.filter((m) => m.patientUsername === selectedPatient.username);
                return patMeds.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {patMeds.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs"
                      >
                        <div>
                          <strong className="text-slate-800">{m.medicineName}</strong>
                          <span className="text-slate-500 ml-1.5">({m.dosage})</span>
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                          {m.scheduleTime}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No medications scheduled for this patient.</p>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* ================= DELETE PATIENT CONFIRMATION MODAL ================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Patient Removal"
        description="Are you sure you want to delete this patient record?"
        maxWidth="max-w-sm"
      >
        <p className="text-xs text-slate-600 mb-6">
          Removing <strong className="text-slate-900">{selectedPatient?.fullname || selectedPatient?.name}</strong> will delete their profile from the hospital registry.
        </p>

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={formSubmitting}
            onClick={handleDeleteConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
          >
            {formSubmitting ? 'Deleting...' : 'Delete Record'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
