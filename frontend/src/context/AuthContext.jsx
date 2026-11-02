import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminLogout as apiAdminLogout } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [patientUser, setPatientUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate sessions from localStorage
    try {
      const storedToken = localStorage.getItem('adminToken');
      const storedAdminData = localStorage.getItem('adminData');
      if (storedToken) {
        setAdminUser(storedAdminData ? JSON.parse(storedAdminData) : { username: 'admin', token: storedToken });
      }

      const storedPatient = localStorage.getItem('patientUser');
      if (storedPatient) {
        setPatientUser(JSON.parse(storedPatient));
      }
    } catch (e) {
      console.error('Error hydrating auth state:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAdmin = (token, adminData) => {
    localStorage.setItem('adminToken', token);
    const fullData = { ...adminData, token };
    localStorage.setItem('adminData', JSON.stringify(fullData));
    setAdminUser(fullData);
  };

  const logoutAdmin = async () => {
    try {
      await apiAdminLogout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      setAdminUser(null);
    }
  };

  const loginPatient = (userData) => {
    localStorage.setItem('patientUser', JSON.stringify(userData));
    setPatientUser(userData);
  };

  const logoutPatient = () => {
    localStorage.removeItem('patientUser');
    setPatientUser(null);
  };

  const updatePatient = (updatedData) => {
    const updated = { ...patientUser, ...updatedData };
    localStorage.setItem('patientUser', JSON.stringify(updated));
    setPatientUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        adminUser,
        patientUser,
        isAdminAuthenticated: !!adminUser,
        isPatientAuthenticated: !!patientUser,
        loginAdmin,
        logoutAdmin,
        loginPatient,
        logoutPatient,
        updatePatient,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
