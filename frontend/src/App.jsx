import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import PatientLayout from './layouts/PatientLayout';

// Public Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview';
import Patients from './pages/admin/Patients';
import Medications from './pages/admin/Medications';
import Doctors from './pages/admin/Doctors';
import Appointments from './pages/admin/Appointments';
import Settings from './pages/admin/Settings';

// Patient Pages
import PatientOverview from './pages/patient/PatientOverview';
import PatientProfile from './pages/patient/PatientProfile';
import MyMedications from './pages/patient/MyMedications';
import TodaySchedule from './pages/patient/TodaySchedule';
import MyAppointments from './pages/patient/MyAppointments';
import MedicationHistory from './pages/patient/MedicationHistory';

function RootRedirect() {
  const { isAdminAuthenticated, isPatientAuthenticated } = useAuth();
  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isPatientAuthenticated) {
    return <Navigate to="/patient/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Protected Portal */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminOverview />} />
            <Route path="patients" element={<Patients />} />
            <Route path="medications" element={<Medications />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Patient Protected Portal */}
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<Navigate to="/patient/dashboard" replace />} />
            <Route path="dashboard" element={<PatientOverview />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="medications" element={<MyMedications />} />
            <Route path="today" element={<TodaySchedule />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="history" element={<MedicationHistory />} />
          </Route>

          {/* Root & Catch-all Fallbacks */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
