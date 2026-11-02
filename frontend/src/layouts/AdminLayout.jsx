import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminLayout() {
  const { isAdminAuthenticated, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen text="Verifying admin credentials..." />;
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Derive header title and breadcrumb from pathname
  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/admin/patients')) {
      return { title: 'Patient Management', breadcrumbs: ['Patients'] };
    }
    if (path.includes('/admin/medications')) {
      return { title: 'Prescription & Medications', breadcrumbs: ['Medications'] };
    }
    if (path.includes('/admin/doctors')) {
      return { title: 'Doctor Directory', breadcrumbs: ['Doctors'] };
    }
    if (path.includes('/admin/appointments')) {
      return { title: 'Appointments Schedule', breadcrumbs: ['Appointments'] };
    }
    if (path.includes('/admin/settings')) {
      return { title: 'System Settings', breadcrumbs: ['Settings'] };
    }
    return { title: 'Hospital Admin Dashboard', breadcrumbs: ['Overview'] };
  };

  const { title, breadcrumbs } = getHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        role="admin"
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Column */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header
          title={title}
          breadcrumbs={breadcrumbs}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
