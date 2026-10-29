// DD-14 verification script
const fs = require('fs');

const content = fs.readFileSync('server.js', 'utf8');

const serverChecks = [
    ["app.get('/api/admin/doctors'", "GET /api/admin/doctors"],
    ["app.post('/api/admin/doctors'", "POST /api/admin/doctors"],
    ["app.put('/api/admin/doctors/:id'", "PUT /api/admin/doctors/:id"],
    ["app.delete('/api/admin/doctors/:id'", "DELETE /api/admin/doctors/:id"],
    ["app.get('/api/admin/appointments'", "GET /api/admin/appointments"],
    ["app.post('/api/admin/appointments'", "POST /api/admin/appointments"],
    ["app.put('/api/admin/appointments/:id'", "PUT /api/admin/appointments/:id"],
    ["app.delete('/api/admin/appointments/:id'", "DELETE /api/admin/appointments/:id"],
    ["authenticateAdmin", "admin auth middleware"],
    ["Appointment date cannot be in the past", "past-date validation"],
    ["already has an appointment at this date and time", "double-booking check"],
];

let allOk = true;
serverChecks.forEach(([pattern, label]) => {
    if (content.includes(pattern)) {
        console.log('PASS (server):', label);
    } else {
        console.log('FAIL (server):', label);
        allOk = false;
    }
});

const html = fs.readFileSync('index.html', 'utf8');
const htmlChecks = [
    ['tab-admin-doctors-btn', 'Doctors tab button'],
    ['tab-admin-appointments-btn', 'Appointments tab button'],
    ['admin-doctor-modal', 'Doctor modal'],
    ['admin-appointment-modal', 'Appointment modal'],
    ['appt-patient', 'Patient dropdown'],
    ['appt-doctor', 'Doctor dropdown'],
    ['admin-doctors-tbody', 'Doctors table body'],
    ['admin-appointments-tbody', 'Appointments table body'],
];
htmlChecks.forEach(([pat, label]) => {
    if (html.includes(pat)) {
        console.log('PASS (HTML):', label);
    } else {
        console.log('FAIL (HTML):', label);
        allOk = false;
    }
});

const js = fs.readFileSync('script.js', 'utf8');
const jsChecks = [
    ['loadDoctorsTable', 'loadDoctorsTable function'],
    ['loadAppointmentsTable', 'loadAppointmentsTable function'],
    ['openDoctorModal', 'openDoctorModal function'],
    ['openAppointmentModal', 'openAppointmentModal function'],
    ['populateAppointmentDropdowns', 'populateAppointmentDropdowns function'],
    ['statusBadge', 'statusBadge helper'],
    ['switchAdminTab', 'switchAdminTab function'],
    ['tab-admin-doctors-btn', 'Doctors tab wired in JS'],
    ['tab-admin-appointments-btn', 'Appointments tab wired in JS'],
];
jsChecks.forEach(([pat, label]) => {
    if (js.includes(pat)) {
        console.log('PASS (JS):', label);
    } else {
        console.log('FAIL (JS):', label);
        allOk = false;
    }
});

console.log(allOk ? '\nAll checks passed!' : '\nSome checks FAILED - review above.');
process.exit(allOk ? 0 : 1);
