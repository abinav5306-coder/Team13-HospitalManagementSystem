const BASE_URL = ''; // Relative URL leverages Vite proxy in dev

function getAdminHeaders() {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// ---------------- Admin Auth ----------------
export async function adminLogin(username, password) {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

export async function adminLogout() {
  const res = await fetch(`${BASE_URL}/api/admin/logout`, {
    method: 'POST',
    headers: getAdminHeaders()
  });
  return res.json();
}

// ---------------- Patient Auth & Registration ----------------
export async function checkUserExists(field, value) {
  const res = await fetch(`${BASE_URL}/api/users/check?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`);
  const data = await res.json();
  return data.user || null;
}

export async function registerPatient(patientData) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to register patient');
  }
  return data;
}

export async function sendPhoneOtp(phone) {
  const res = await fetch(`${BASE_URL}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  return res.json();
}

export async function verifyPhoneOtp(phone, code) {
  const res = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code })
  });
  return res.json();
}

export async function sendEmailOtp(email) {
  const res = await fetch(`${BASE_URL}/send-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function verifyEmailOtp(email, code) {
  const res = await fetch(`${BASE_URL}/verify-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  return res.json();
}

// ---------------- Admin: Patients ----------------
export async function getAdminPatients() {
  const res = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: getAdminHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
}

export async function createAdminPatient(data) {
  const res = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create patient');
  return result;
}

export async function updateAdminPatient(id, data) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update patient');
  return result;
}

export async function deleteAdminPatient(id) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to delete patient');
  return result;
}

// ---------------- Admin: Medications ----------------
export async function getAdminMedications() {
  const res = await fetch(`${BASE_URL}/api/admin/medications`, {
    headers: getAdminHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch medications');
  return res.json();
}

export async function assignMedication(data) {
  const res = await fetch(`${BASE_URL}/api/admin/medications`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to assign medication');
  return result;
}

// ---------------- Admin: Doctors ----------------
export async function getAdminDoctors() {
  const res = await fetch(`${BASE_URL}/api/admin/doctors`, {
    headers: getAdminHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch doctors');
  return res.json();
}

export async function createAdminDoctor(data) {
  const res = await fetch(`${BASE_URL}/api/admin/doctors`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create doctor');
  return result;
}

export async function updateAdminDoctor(id, data) {
  const res = await fetch(`${BASE_URL}/api/admin/doctors/${id}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update doctor');
  return result;
}

export async function deleteAdminDoctor(id) {
  const res = await fetch(`${BASE_URL}/api/admin/doctors/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to delete doctor');
  return result;
}

// ---------------- Admin: Appointments ----------------
export async function getAdminAppointments() {
  const res = await fetch(`${BASE_URL}/api/admin/appointments`, {
    headers: getAdminHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch appointments');
  return res.json();
}

export async function createAdminAppointment(data) {
  const res = await fetch(`${BASE_URL}/api/admin/appointments`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create appointment');
  return result;
}

export async function updateAdminAppointment(id, data) {
  const res = await fetch(`${BASE_URL}/api/admin/appointments/${id}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update appointment');
  return result;
}

export async function deleteAdminAppointment(id) {
  const res = await fetch(`${BASE_URL}/api/admin/appointments/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders()
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to cancel appointment');
  return result;
}

// ---------------- Patient Portal Specific ----------------
export async function getPatientMedications(username) {
  const res = await fetch(`${BASE_URL}/api/medications/${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error('Failed to fetch patient medications');
  return res.json();
}

export async function markMedicationTaken(id) {
  const res = await fetch(`${BASE_URL}/api/medications/${id}/taken`, {
    method: 'PUT'
  });
  return res.json();
}

export async function getPatientAppointments(patientId) {
  const res = await fetch(`${BASE_URL}/api/patient/appointments/${encodeURIComponent(patientId)}`);
  if (!res.ok) throw new Error('Failed to fetch patient appointments');
  return res.json();
}

export async function getPatientDoctors() {
  const res = await fetch(`${BASE_URL}/api/patient/doctors`);
  if (!res.ok) throw new Error('Failed to fetch doctors');
  return res.json();
}

// ---------------- Patient Notifications & Reminders ----------------
export async function getPatientNotifications(username) {
  const res = await fetch(`${BASE_URL}/api/patient/notifications/${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await fetch(`${BASE_URL}/api/patient/notifications/${id}/read`, {
    method: 'PUT'
  });
  return res.json();
}

export async function markAllNotificationsRead(username) {
  const res = await fetch(`${BASE_URL}/api/patient/notifications/${encodeURIComponent(username)}/read-all`, {
    method: 'PUT'
  });
  return res.json();
}

export async function confirmNotificationTaken(id) {
  const res = await fetch(`${BASE_URL}/api/patient/notifications/${id}/take`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to mark dose taken');
  return data;
}

export async function snoozeNotification(id, snoozeMinutes = 10) {
  const res = await fetch(`${BASE_URL}/api/patient/notifications/${id}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snoozeMinutes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to snooze reminder');
  return data;
}

export async function sendTestReminder(testData) {
  const res = await fetch(`${BASE_URL}/api/patient/notifications/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate test reminder');
  return data;
}

export async function clearTestNotifications(username) {
  const res = await fetch(`${BASE_URL}/api/patient/notifications/test/${encodeURIComponent(username)}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function getPatientAdherence(username) {
  const res = await fetch(`${BASE_URL}/api/patient/adherence/${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error('Failed to fetch adherence logs');
  return res.json();
}

// Check database connection mode
export async function testBackendConnection() {
  try {
    const res = await fetch(`${BASE_URL}/test-supabase`);
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

