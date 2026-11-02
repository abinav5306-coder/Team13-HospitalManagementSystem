import React from 'react';
import { Menu, Bell, Calendar as CalendarIcon, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, breadcrumbs = [], setIsMobileOpen }) {
  const { adminUser, patientUser, isAdminAuthenticated } = useAuth();
  const user = isAdminAuthenticated ? adminUser : patientUser;
  const userName = isAdminAuthenticated
    ? (user?.name || user?.username || 'Administrator')
    : (user?.fullname || user?.username || 'Patient');

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-6 sm:px-8 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          title="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-0.5">
            <span>{isAdminAuthenticated ? 'Admin Portal' : 'Patient Care'}</span>
            {breadcrumbs.length > 0 && <span>/</span>}
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className={idx === breadcrumbs.length - 1 ? 'text-blue-600 font-semibold' : ''}>
                  {crumb}
                </span>
                {idx < breadcrumbs.length - 1 && <span>/</span>}
              </React.Fragment>
            ))}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Date, Notifications, User Status */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>{todayStr}</span>
        </div>

        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Session</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-blue-500/20">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">{userName}</p>
            <p className="text-[11px] text-slate-600 leading-tight">
              {isAdminAuthenticated ? 'System Admin' : 'Registered Patient'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
