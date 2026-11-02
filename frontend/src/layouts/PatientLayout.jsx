import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PatientLayout() {
  const { isPatientAuthenticated, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading patient portal..." />;
  }

  if (!isPatientAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/patient/profile')) {
      return { title: 'My Medical Profile', breadcrumbs: ['Profile'] };
    }
    if (path.includes('/patient/medications')) {
      return { title: 'Prescriptions & Medications', breadcrumbs: ['Medications'] };
    }
    if (path.includes('/patient/today')) {
      return { title: "Today's Medication Schedule", breadcrumbs: ["Today's Schedule"] };
    }
    if (path.includes('/patient/appointments')) {
      return { title: 'My Consultations & Appointments', breadcrumbs: ['Appointments'] };
    }
    if (path.includes('/patient/history')) {
      return { title: 'Medication Adherence History', breadcrumbs: ['History'] };
    }
    return { title: 'Patient Health Portal', breadcrumbs: ['Dashboard'] };
  };

  const { title, breadcrumbs } = getHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        role="patient"
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
