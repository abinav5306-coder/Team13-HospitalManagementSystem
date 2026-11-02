import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Users,
  Pill,
  UserCheck,
  Calendar,
  Settings,
  LogOut,
  LayoutDashboard,
  Clock,
  User,
  History,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ role = 'admin', isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { adminUser, patientUser, logoutAdmin, logoutPatient } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (role === 'admin') {
      await logoutAdmin();
      navigate('/login');
    } else {
      logoutPatient();
      navigate('/login');
    }
  };

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Patient Management', path: '/admin/patients', icon: Users },
    { name: 'Medications', path: '/admin/medications', icon: Pill },
    { name: 'Doctors', path: '/admin/doctors', icon: UserCheck },
    { name: 'Appointments', path: '/admin/appointments', icon: Calendar },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const patientNavItems = [
    { name: 'Overview', path: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/patient/profile', icon: User },
    { name: 'My Medications', path: '/patient/medications', icon: Pill },
    { name: "Today's Schedule", path: '/patient/today', icon: Clock },
    { name: 'My Appointments', path: '/patient/appointments', icon: Calendar },
    { name: 'Medication History', path: '/patient/history', icon: History },
  ];

  const navItems = role === 'admin' ? adminNavItems : patientNavItems;
  const user = role === 'admin' ? adminUser : patientUser;
  const displayName = role === 'admin' 
    ? (user?.name || user?.username || 'Administrator') 
    : (user?.fullname || user?.username || 'Patient');
  const displaySub = role === 'admin' 
    ? 'Admin Portal' 
    : `ID: ${user?.username || 'Patient'}`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-20 px-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  MedCare
                </span>
                <span className="text-[11px] font-medium text-blue-400 tracking-wider uppercase">
                  {role === 'admin' ? 'Hospital System' : 'Patient Portal'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5">
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Main Menu
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                    {isActive && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full shadow-glow" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-800/60 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate">{displaySub}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
