import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  Server,
  Building,
  CheckCircle2,
  RefreshCw,
  Info,
  Clock
} from 'lucide-react';
import { testBackendConnection } from '../../services/api';

export default function Settings() {
  const [dbInfo, setDbInfo] = useState(null);
  const [testing, setTesting] = useState(false);

  const checkConnection = async () => {
    setTesting(true);
    try {
      const res = await testBackendConnection();
      setDbInfo(res);
    } catch (e) {
      setDbInfo({ success: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Hospital Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Hospital System Profile
            </h3>
            <p className="text-xs text-slate-500">Institution and clinical unit information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-0.5 font-medium">Institution Name</span>
            <span className="font-bold text-slate-800 text-sm">MedCare Memorial Hospital</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-0.5 font-medium">Operating Units</span>
            <span className="font-bold text-slate-800 text-sm">Outpatient, Cardiology, Internal Med</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-0.5 font-medium">Backend Server</span>
            <span className="font-bold text-slate-800 text-sm">Node.js Express (Port 3000)</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block mb-0.5 font-medium">Security Protocol</span>
            <span className="font-bold text-slate-800 text-sm">Bearer Token Admin Guard & OTP</span>
          </div>
        </div>
      </div>

      {/* Database Connection Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Database Integration Status
              </h3>
              <p className="text-xs text-slate-500">Live storage provider and connectivity diagnostics</p>
            </div>
          </div>

          <button
            onClick={checkConnection}
            disabled={testing}
            className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>Check Connectivity</span>
          </button>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 mb-4">
          <div className="flex items-start gap-3">
            {dbInfo?.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {dbInfo?.mode === 'local'
                  ? 'Local JSON Database Fallback (database.json)'
                  : 'Supabase Cloud Database Connected'}
              </p>
              <p className="text-slate-500 mt-1 leading-relaxed">
                {dbInfo?.mode === 'local'
                  ? 'The backend is running in local offline storage mode using database.json. All patient registrations, prescription assignments, and consultations persist locally.'
                  : 'Connected directly to Supabase cloud database instance.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-blue-900 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-600" /> Connecting to Supabase Cloud:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-slate-600">
            <li>Open the root <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800">.env</code> file.</li>
            <li>Add <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800">SUPABASE_URL=https://atcrofguzgiluheuevua.supabase.co</code></li>
            <li>Add <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800">SUPABASE_SERVICE_ROLE_KEY=your_key</code></li>
            <li>Restart the Express backend. The server will automatically switch to Supabase cloud mode!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
