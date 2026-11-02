import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Heart, 
  FileText,
  BadgeAlert,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PatientProfile() {
  const { patientUser } = useAuth();

  const displayName = patientUser?.fullname || patientUser?.name || 'Registered Patient';
  const username = patientUser?.username || '—';
  const email = patientUser?.email || '—';
  const phone = patientUser?.mobile || patientUser?.phone || '—';
  const dob = patientUser?.dob || 'Not specified';
  const gender = patientUser?.gender ? (patientUser.gender.charAt(0).toUpperCase() + patientUser.gender.slice(1)) : 'Not specified';
  const address = patientUser?.address || 'Primary Residence on Record';
  const regDate = patientUser?.created_at ? new Date(patientUser.created_at).toLocaleDateString() : 'Active Patient';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                {displayName}
              </h1>
              <p className="text-sm font-semibold text-blue-600 mt-0.5">
                Patient ID: <span className="font-mono">{username}</span>
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold self-center sm:self-start">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Patient
            </div>
          </div>

          <p className="mt-3 text-slate-500 text-sm leading-relaxed">
            Your patient record is safely registered in the MedCare Clinical Management System. Keep your emergency contact information updated with our reception desk.
          </p>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Demographic Information</h2>
          </div>

          <div className="space-y-3.5 text-sm">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
              <span className="text-slate-900 font-bold text-base">{displayName}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Date of Birth</span>
                <span className="text-slate-800 font-semibold">{dob}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                <span className="text-slate-800 font-semibold">{gender}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Residential Address</span>
              <div className="flex items-start gap-2 mt-0.5">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-800 font-medium">{address}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registered Since</span>
              <div className="flex items-center gap-2 mt-0.5 text-slate-700 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{regDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information & Security */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Contact & Login Credentials</h2>
          </div>

          <div className="space-y-3.5 text-sm">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900 font-bold font-mono">{email}</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Used for OTP verification & reminders</span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Mobile Phone Number</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900 font-bold font-mono">{phone}</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Used for SMS codes and urgent clinical alerts</span>
            </div>

            <div className="pt-2">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100/80">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-blue-900">Hospital Medical Record</h3>
                    <p className="text-[12px] text-blue-700/90 mt-0.5 leading-relaxed">
                      All your prescriptions and consultation records are synced securely with your treating physicians.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
