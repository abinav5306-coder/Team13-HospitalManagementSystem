require('dotenv').config();

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const cron = require('node-cron');

const app = express();

const hasSupabase = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));
let supabase = null;
if (hasSupabase) {
    try {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        console.log('[Supabase] Initialized client successfully');
    } catch (e) {
        console.warn('[Supabase] Failed to initialize client, falling back to local DB:', e.message);
        supabase = null;
    }
} else {
    console.log('[Database] Supabase credentials not found in .env; using local JSON database fallback (database.json)');
}

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve index.html, style.css, script.js

const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'database.json');

// Initialize DB
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({
        users: [],
        patients: [],
        doctors: [],
        appointments: [],
        medications: [],
        notifications: [],
        medication_adherence: [],
        admins: [{ id: 'admin-1', username: 'admin', email: 'admin@hospital.com', password: 'password123', name: 'System Administrator' }]
    }, null, 2));
} else {
    try {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        let updated = false;
        if (!db.admins || db.admins.length === 0) {
            db.admins = [{ id: 'admin-1', username: 'admin', email: 'admin@hospital.com', password: 'password123', name: 'System Administrator' }];
            updated = true;
        }
        if (!db.patients) { db.patients = []; updated = true; }
        if (!db.doctors) { db.doctors = []; updated = true; }
        if (!db.appointments) { db.appointments = []; updated = true; }
        if (!db.medications) { db.medications = []; updated = true; }
        if (!db.notifications) { db.notifications = []; updated = true; }
        if (!db.medication_adherence) { db.medication_adherence = []; updated = true; }
        if (updated) {
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        }
    } catch (err) {
        console.error('Error reading database.json:', err);
    }
}

function readDB() {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

const adminTokens = new Set();
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (adminTokens.has(token)) {
            return next();
        }
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
}

function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (e) {
        console.warn('Twilio initialization skipped:', e.message);
    }
}
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        if (!client || !serviceSid) {
            return res.json({ success: true, status: 'pending', note: 'Twilio not configured' });
        }

        // Format to E.164 (Indian mobile numbers)
        let formattedPhone = phone;
        if (formattedPhone.length === 10) {
            formattedPhone = '+91' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        const verification = await client.verify.v2.services(serviceSid)
            .verifications
            .create({ to: formattedPhone, channel: 'sms' });

        res.json({ success: true, status: verification.status });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        if (!phone || !code) {
            return res.status(400).json({ success: false, message: 'Phone and code are required' });
        }

        if (!client || !serviceSid) {
            if (code === '123456') {
                return res.json({ success: true, status: 'approved' });
            }
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        let formattedPhone = phone;
        if (formattedPhone.length === 10) {
            formattedPhone = '+91' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        const verificationCheck = await client.verify.v2.services(serviceSid)
            .verificationChecks
            .create({ to: formattedPhone, code });

        if (verificationCheck.status === 'approved') {
            res.json({ success: true, status: 'approved' });
        } else {
            res.json({ success: false, message: 'Invalid OTP. Please try again.' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Invalid OTP or error verifying. Please try again.' });
    }
});

const emailOtps = new Map();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS
    }
});

app.post('/send-email-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        emailOtps.set(email, {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Patient Portal Verification Code',
            text: `Your 6-digit OTP is: ${otp}\n\nThis code expires in 5 minutes.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending email OTP:', error);
        res.status(500).json({ success: false, message: 'Error sending email OTP' });
    }
});

app.post('/verify-email-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and code are required' });
        }

        const storedOtpData = emailOtps.get(email);

        if (!storedOtpData) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please try again.' });
        }

        if (Date.now() > storedOtpData.expiresAt) {
            emailOtps.delete(email);
            return res.status(400).json({ success: false, message: 'Verification code expired. Please request a new OTP.' });
        }

        if (storedOtpData.otp === code) {
            emailOtps.delete(email);
            res.json({ success: true, status: 'approved' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid verification code. Please try again.' });
        }
    } catch (error) {
        console.error('Error verifying email OTP:', error);
        res.status(500).json({ success: false, message: 'Error verifying email OTP' });
    }
});

app.post('/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        let admin = null;
        if (supabase) {
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .eq('username', username)
                .single();
            if (!error && data) admin = data;
        }

        if (!admin) {
            const db = readDB();
            admin = (db.admins || []).find(a => a.username === username || a.email === username);
        }

        if (!admin || admin.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin username or password'
            });
        }

        res.json({
            success: true,
            message: 'Admin login successful',
            admin: {
                id: admin.id || 'admin-1',
                username: admin.username,
                name: admin.name || admin.username
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.get('/api/users/check', async (req, res) => {
    try {
        const { field, value } = req.query;
        const validFields = ['username', 'email', 'mobile'];
        if (!validFields.includes(field)) {
            return res.status(400).json({ error: 'Invalid field' });
        }

        let data = null;
        if (supabase) {
            const { data: sbData, error } = await supabase
                .from('patients')
                .select('*')
                .eq(field, value)
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            data = sbData;
        } else {
            const db = readDB();
            const list = db.patients || db.users || [];
            data = list.find(u => u[field] === value) || null;
        }
        res.json({ user: data || null });
    } catch (error) {
        console.error('Error checking user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = req.body;

        if (supabase) {
            // Check for duplicates
            const { data: existingUser } = await supabase
                .from('patients')
                .select('username, email, mobile')
                .or(`username.eq.${newUser.username},email.eq.${newUser.email},mobile.eq.${newUser.mobile}`)
                .limit(1);

            if (existingUser && existingUser.length > 0) {
                const eu = existingUser[0];
                if (eu.username === newUser.username) return res.status(400).json({ error: 'Username already taken' });
                if (eu.email === newUser.email) return res.status(400).json({ error: 'Email already registered' });
                if (eu.mobile === newUser.mobile) return res.status(400).json({ error: 'Mobile number already registered' });
            }

            // Populate old fields to satisfy NOT NULL constraints if they exist in the DB
            const insertData = {
                ...newUser,
                name: newUser.fullname || '',
                phone: newUser.mobile || '',
                age: 0
            };

            const { data, error } = await supabase.from('patients').insert([insertData]);
            if (error) throw error;
            return res.json({ success: true, data });
        }

        const db = readDB();
        const patients = db.patients || [];
        const duplicate = patients.find(u =>
            u.username === newUser.username ||
            u.email === newUser.email ||
            u.mobile === newUser.mobile
        );
        if (duplicate) {
            if (duplicate.username === newUser.username) return res.status(400).json({ error: 'Username already taken' });
            if (duplicate.email === newUser.email) return res.status(400).json({ error: 'Email already registered' });
            if (duplicate.mobile === newUser.mobile) return res.status(400).json({ error: 'Mobile number already registered' });
        }
        const record = {
            id: crypto.randomUUID(),
            ...newUser,
            name: newUser.fullname || '',
            phone: newUser.mobile || '',
            age: newUser.age || 0,
            created_at: new Date().toISOString()
        };
        patients.push(record);
        db.patients = patients;
        writeDB(db);
        res.json({ success: true, data: record });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        let admin = null;
        if (supabase) {
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .or(`username.eq.${username},email.eq.${username}`)
                .single();
            if (!error && data) admin = data;
        }

        if (!admin) {
            const db = readDB();
            admin = (db.admins || []).find(a => a.username === username || a.email === username);
        }

        if (!admin || admin.password !== password) {
            console.log('Password does not match or admin not found');
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        console.log('Admin login successful:', admin.username);

        const token = crypto.randomBytes(32).toString('hex');
        adminTokens.add(token);

        res.json({
            success: true,
            message: 'Admin login successful',
            token: token,
            admin: {
                id: admin.id || 'admin-1',
                username: admin.username,
                email: admin.email,
                name: admin.name || admin.username
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.post('/api/admin/logout', authenticateAdmin, (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        adminTokens.delete(token);
    }
    res.json({ success: true });
});

// Medications endpoints
app.get('/api/medications/:username', (req, res) => {
    try {
        const db = readDB();
        const meds = (db.medications || []).filter(m => m.patientUsername === req.params.username);
        res.json(meds);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        if (supabase) {
            const { data: patients, error } = await supabase.from('patients').select('*');
            if (error) throw error;
            return res.json(patients);
        }
        const db = readDB();
        res.json(db.patients || []);
    } catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const newUser = req.body;

        if (supabase) {
            // Check for duplicates
            const { data: existingUser } = await supabase
                .from('patients')
                .select('username, email, mobile')
                .or(`username.eq.${newUser.username},email.eq.${newUser.email},mobile.eq.${newUser.mobile}`)
                .limit(1);

            if (existingUser && existingUser.length > 0) {
                const eu = existingUser[0];
                if (eu.username === newUser.username) return res.status(400).json({ error: 'Username already taken' });
                if (eu.email === newUser.email) return res.status(400).json({ error: 'Email already registered' });
                if (eu.mobile === newUser.mobile) return res.status(400).json({ error: 'Mobile number already registered' });
            }

            // Populate old fields to satisfy NOT NULL constraints
            const insertData = {
                ...newUser,
                name: newUser.fullname || '',
                phone: newUser.mobile || '',
                age: 0
            };

            const { data, error } = await supabase.from('patients').insert([insertData]);
            if (error) throw error;
            return res.json({ success: true });
        }

        const db = readDB();
        const patients = db.patients || [];
        const duplicate = patients.find(u =>
            u.username === newUser.username ||
            u.email === newUser.email ||
            u.mobile === newUser.mobile
        );
        if (duplicate) {
            if (duplicate.username === newUser.username) return res.status(400).json({ error: 'Username already taken' });
            if (duplicate.email === newUser.email) return res.status(400).json({ error: 'Email already registered' });
            if (duplicate.mobile === newUser.mobile) return res.status(400).json({ error: 'Mobile number already registered' });
        }
        patients.push({
            id: crypto.randomUUID(),
            ...newUser,
            name: newUser.fullname || '',
            phone: newUser.mobile || '',
            age: 0,
            created_at: new Date().toISOString()
        });
        db.patients = patients;
        writeDB(db);
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding admin user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedUser = req.body;
        if (supabase) {
            const { data, error } = await supabase.from('patients').update(updatedUser).eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }
        const db = readDB();
        const idx = (db.patients || []).findIndex(p => p.id === id);
        if (idx !== -1) {
            db.patients[idx] = { ...db.patients[idx], ...updatedUser };
            writeDB(db);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating admin user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (supabase) {
            const { data, error } = await supabase.from('patients').delete().eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }
        const db = readDB();
        db.patients = (db.patients || []).filter(p => p.id !== id);
        writeDB(db);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting admin user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/medications', authenticateAdmin, (req, res) => {
    try {
        const db = readDB();
        res.json(db.medications || []);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/admin/medications', authenticateAdmin, (req, res) => {
    try {
        const db = readDB();
        const newMed = {
            id: Date.now().toString(),
            patientUsername: req.body.patientUsername,
            medicineName: req.body.medicineName,
            dosage: req.body.dosage,
            scheduleTime: req.body.scheduleTime,
            instructions: req.body.instructions || 'Take as prescribed with water',
            quantity: req.body.quantity || '1 tablet',
            taken: false,
            created_at: new Date().toISOString()
        };
        db.medications = db.medications || [];
        db.medications.push(newMed);
        writeDB(db);

        // Run scheduler tick immediately to check new prescription
        setTimeout(() => {
            runMedicationReminderScheduler();
        }, 500);

        res.json({ success: true, medication: newMed });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/medications/:id/taken', (req, res) => {
    try {
        const db = readDB();
        const med = (db.medications || []).find(m => m.id === req.params.id);
        if (med) {
            med.taken = true;
            med.taken_at = new Date().toISOString();

            // Also log clinical adherence
            db.medication_adherence = db.medication_adherence || [];
            db.medication_adherence.unshift({
                id: 'adh-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                patient_username: med.patientUsername,
                medication_id: med.id,
                medicine_name: med.medicineName,
                dosage: med.dosage || '',
                scheduled_time: med.scheduleTime || '',
                confirmed_at: new Date().toISOString(),
                status: 'taken',
                notes: 'Recorded taken directly from medication schedule',
                created_at: new Date().toISOString()
            });

            writeDB(db);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ============================================================
// AUTOMATED MEDICINE REMINDERS & PATIENT NOTIFICATION SYSTEM
// ============================================================

// Helper: Asia/Kolkata current time & date
function getKolkataTime() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    const hours = parseInt(map.hour, 10);
    const minutes = parseInt(map.minute, 10);
    const seconds = parseInt(map.second, 10);
    return {
        dateStr: `${map.year}-${map.month}-${map.day}`,
        hours,
        minutes,
        seconds,
        totalMinutes: hours * 60 + minutes,
        timeStr: `${map.hour}:${map.minute}`
    };
}

// Helper: Parse schedule time ("08:00 AM", "08:00", "8:30 PM", "14:00") into minutes from midnight
function parseScheduleTimeToMinutes(scheduleTimeStr) {
    if (!scheduleTimeStr) return null;
    const clean = scheduleTimeStr.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const match = clean.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

// Automatic Reminder Scheduler Core Logic (Asia/Kolkata timezone)
async function runMedicationReminderScheduler() {
    try {
        const kolkata = getKolkataTime();
        const db = readDB();
        const medications = db.medications || [];
        const patients = db.patients || [];
        db.notifications = db.notifications || [];
        db.medication_adherence = db.medication_adherence || [];

        let changesMade = false;

        // 1. Process Snoozed notifications: Check if snooze window has expired
        for (const notif of db.notifications) {
            if (notif.status === 'Snoozed' && notif.snooze_until) {
                const snoozeTime = new Date(notif.snooze_until).getTime();
                if (Date.now() >= snoozeTime) {
                    notif.status = 'Due';
                    notif.notification_type = 'Snoozed Reminder';
                    notif.is_read = false;
                    notif.updated_at = new Date().toISOString();
                    changesMade = true;
                    console.log(`[Scheduler] Snoozed reminder awakened for ${notif.patient_username}: ${notif.medicine_name}`);
                }
            }
        }

        // 2. Process active medications for all patients
        for (const med of medications) {
            if (!med.patientUsername || !med.scheduleTime) continue;

            const scheduledMinutes = parseScheduleTimeToMinutes(med.scheduleTime);
            if (scheduledMinutes === null) continue;

            // Unique reminder occurrence key: patient_medId_date_scheduledTime
            const reminderKey = `${med.patientUsername}_${med.id}_${kolkata.dateStr}_${med.scheduleTime}`;

            // Check if reminder already generated for this occurrence (prevents duplicate on reload/restart)
            const existing = db.notifications.find(n => n.reminder_key === reminderKey);
            if (existing) continue;

            // Is the scheduled time due?
            // Due when current time in Kolkata has reached or passed scheduled time today
            const isDue = kolkata.totalMinutes >= scheduledMinutes;

            if (isDue) {
                const patient = patients.find(p => p.username === med.patientUsername);
                const patientName = patient?.fullname || patient?.name || med.patientUsername || 'Patient';
                const dosageStr = med.dosage ? `${med.dosage}` : '';
                const qtyStr = med.quantity || (med.dosage && med.dosage.toLowerCase().includes('tablet') ? med.dosage : '1 tablet');
                const instructionStr = med.instructions || 'Please take it as prescribed with water.';

                const newNotif = {
                    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                    patient_id: patient?.id || med.patientUsername,
                    patient_username: med.patientUsername,
                    medication_id: med.id,
                    notification_title: `Time to take ${med.medicineName}`,
                    notification_message: `Hello ${patientName}! It is time to take your ${med.medicineName} ${dosageStr}. Your scheduled medicine time is ${med.scheduleTime}. ${instructionStr}`,
                    medicine_name: med.medicineName,
                    dosage: med.dosage || '',
                    scheduled_time: med.scheduleTime,
                    scheduled_date: kolkata.dateStr,
                    instructions: instructionStr,
                    quantity: qtyStr,
                    notification_type: 'Medicine Due',
                    status: 'Due',
                    is_read: false,
                    is_test: false,
                    reminder_key: reminderKey,
                    snooze_until: null,
                    taken_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                db.notifications.unshift(newNotif);
                changesMade = true;
                console.log(`[Scheduler] Generated medicine reminder for ${med.patientUsername}: ${med.medicineName} (${med.scheduleTime})`);

                if (supabase) {
                    try {
                        await supabase.from('notifications').upsert([newNotif], { onConflict: 'reminder_key' });
                    } catch (sErr) {
                        console.warn('[Scheduler] Supabase notification sync warning:', sErr.message);
                    }
                }
            }
        }

        if (changesMade) {
            writeDB(db);
        }
    } catch (schedErr) {
        console.error('[Scheduler] Error running reminder scheduler:', schedErr);
    }
}

// Run scheduler every 30 seconds
cron.schedule('*/30 * * * * *', () => {
    runMedicationReminderScheduler();
}, {
    timezone: 'Asia/Kolkata'
});

// Run initial check on server startup
setTimeout(() => {
    runMedicationReminderScheduler();
}, 2000);

// --- PATIENT NOTIFICATIONS ENDPOINTS ---

// GET: Fetch all notifications for a patient (Patient-Only)
app.get('/api/patient/notifications/:username', (req, res) => {
    try {
        const username = req.params.username;
        const db = readDB();
        const allNotifs = (db.notifications || []).filter(n => n.patient_username === username);

        // Sort descending by created_at
        allNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const unreadCount = allNotifs.filter(n => !n.is_read).length;
        const dueCount = allNotifs.filter(n => n.status === 'Due').length;
        const kolkata = getKolkataTime();

        res.json({
            success: true,
            notifications: allNotifs,
            unreadCount,
            dueCount,
            kolkataTime: kolkata
        });
    } catch (error) {
        console.error('Error fetching patient notifications:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT: Mark a single notification as read
app.put('/api/patient/notifications/:id/read', (req, res) => {
    try {
        const db = readDB();
        const notif = (db.notifications || []).find(n => n.id === req.params.id);
        if (notif) {
            notif.is_read = true;
            notif.updated_at = new Date().toISOString();
            writeDB(db);
            return res.json({ success: true, notification: notif });
        }
        res.status(404).json({ success: false, message: 'Notification not found' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT: Mark all notifications as read for a patient
app.put('/api/patient/notifications/:username/read-all', (req, res) => {
    try {
        const username = req.params.username;
        const db = readDB();
        let count = 0;
        (db.notifications || []).forEach(n => {
            if (n.patient_username === username && !n.is_read) {
                n.is_read = true;
                n.updated_at = new Date().toISOString();
                count++;
            }
        });
        if (count > 0) {
            writeDB(db);
        }
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST: Mark medicine as taken from a reminder notification
app.post('/api/patient/notifications/:id/take', async (req, res) => {
    try {
        const db = readDB();
        db.notifications = db.notifications || [];
        db.medications = db.medications || [];
        db.medication_adherence = db.medication_adherence || [];

        const notif = db.notifications.find(n => n.id === req.params.id);
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        const nowIso = new Date().toISOString();
        notif.status = 'Confirmed Taken';
        notif.is_read = true;
        notif.taken_at = nowIso;
        notif.updated_at = nowIso;

        // Strictly check if test notification: test reminders must NOT modify real records!
        if (!notif.is_test) {
            // 1. Update medication adherence on the actual medication
            if (notif.medication_id) {
                const med = db.medications.find(m => m.id === notif.medication_id);
                if (med) {
                    med.taken = true;
                    med.taken_at = nowIso;
                }
            }

            // 2. Record permanent clinical adherence record
            const adherenceRecord = {
                id: 'adh-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                patient_username: notif.patient_username,
                medication_id: notif.medication_id || '',
                medicine_name: notif.medicine_name,
                dosage: notif.dosage || '',
                scheduled_time: notif.scheduled_time || '',
                confirmed_at: nowIso,
                status: 'taken',
                notes: 'Confirmed taken by patient via reminder notification',
                created_at: nowIso
            };
            db.medication_adherence.unshift(adherenceRecord);

            if (supabase) {
                try {
                    await supabase.from('medication_adherence').insert([adherenceRecord]);
                } catch (sErr) {
                    console.warn('[Supabase] Adherence log insert warning:', sErr.message);
                }
            }
        }

        writeDB(db);
        res.json({
            success: true,
            notification: notif,
            message: notif.is_test ? 'Test dose marked as taken (simulated only)' : 'Medication adherence recorded successfully'
        });
    } catch (error) {
        console.error('Error confirming taken:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST: Snooze reminder (Remind Me Later: 10m or 15m)
app.post('/api/patient/notifications/:id/snooze', (req, res) => {
    try {
        const snoozeMinutes = parseInt(req.body.snoozeMinutes, 10) || 10;
        const db = readDB();
        const notif = (db.notifications || []).find(n => n.id === req.params.id);
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        const now = Date.now();
        const snoozeUntil = new Date(now + snoozeMinutes * 60 * 1000).toISOString();

        notif.status = 'Snoozed';
        notif.notification_type = 'Snoozed Reminder';
        notif.snooze_until = snoozeUntil;
        notif.updated_at = new Date().toISOString();

        writeDB(db);
        res.json({
            success: true,
            notification: notif,
            snoozeUntil,
            message: `Reminder snoozed for ${snoozeMinutes} minutes`
        });
    } catch (error) {
        console.error('Error snoozing notification:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST: Generate immediate TEST reminder in patient dashboard
app.post('/api/patient/notifications/test', async (req, res) => {
    try {
        const {
            patientUsername,
            medicationId,
            medicineName,
            dosage,
            scheduleTime,
            instructions,
            quantity,
            simulationType // 'due' or 'upcoming'
        } = req.body;

        if (!patientUsername || !medicineName) {
            return res.status(400).json({ success: false, message: 'patientUsername and medicineName are required' });
        }

        const db = readDB();
        db.notifications = db.notifications || [];
        const patients = db.patients || [];
        const patient = patients.find(p => p.username === patientUsername);
        const patientName = patient?.fullname || patient?.name || patientUsername;

        const kolkata = getKolkataTime();
        const isUpcoming = simulationType === 'upcoming';
        const notifStatus = isUpcoming ? 'Upcoming' : 'Due';
        const notifType = isUpcoming ? 'Medicine Upcoming' : 'Test Reminder';
        const dosageDisplay = dosage ? `${dosage}` : '';
        const timeDisplay = scheduleTime || kolkata.timeStr;

        const testNotif = {
            id: 'test-notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            patient_id: patient?.id || patientUsername,
            patient_username: patientUsername,
            medication_id: medicationId || 'test-med-' + Date.now(),
            notification_title: `TEST REMINDER: ${medicineName}`,
            notification_message: `TEST REMINDER: It is time to take your ${medicineName} ${dosageDisplay}. Your scheduled time is ${timeDisplay}. ${instructions || 'Please take it as prescribed.'}`,
            medicine_name: medicineName,
            dosage: dosage || '',
            scheduled_time: timeDisplay,
            scheduled_date: kolkata.dateStr,
            instructions: instructions || 'Simulated test reminder. Take with water.',
            quantity: quantity || '1 tablet',
            notification_type: notifType,
            status: notifStatus,
            is_read: false,
            is_test: true,
            reminder_key: `test_${patientUsername}_${Date.now()}_${Math.random()}`,
            snooze_until: null,
            taken_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        db.notifications.unshift(testNotif);
        writeDB(db);

        console.log(`[Test Mode] Sent simulated test reminder for ${patientUsername}: ${medicineName}`);
        res.json({ success: true, notification: testNotif });
    } catch (error) {
        console.error('Error generating test notification:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE: Clear test notification history for a patient
app.delete('/api/patient/notifications/test/:username', (req, res) => {
    try {
        const username = req.params.username;
        const db = readDB();
        const initialCount = (db.notifications || []).length;
        db.notifications = (db.notifications || []).filter(n => !(n.patient_username === username && n.is_test));
        const deletedCount = initialCount - db.notifications.length;
        writeDB(db);
        res.json({ success: true, deletedCount });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET: Clinical adherence history for a patient
app.get('/api/patient/adherence/:username', (req, res) => {
    try {
        const username = req.params.username;
        const db = readDB();
        const records = (db.medication_adherence || []).filter(a => a.patient_username === username);
        records.sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at));
        res.json({ success: true, adherence: records });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ============================================================
// DD-14: DOCTOR MANAGEMENT ROUTES
// ============================================================

// GET all doctors
app.get('/api/admin/doctors', authenticateAdmin, async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return res.json(data);
        }
        const db = readDB();
        const docs = [...(db.doctors || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        res.json(docs);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST create doctor
app.post('/api/admin/doctors', authenticateAdmin, async (req, res) => {
    try {
        const { full_name, email, mobile, specialization, availability } = req.body;
        if (!full_name || !email || !mobile || !specialization) {
            return res.status(400).json({ error: 'full_name, email, mobile, and specialization are required' });
        }

        if (supabase) {
            // Check for duplicate email
            const { data: existing } = await supabase.from('doctors').select('id').eq('email', email).limit(1);
            if (existing && existing.length > 0) {
                return res.status(400).json({ error: 'A doctor with this email already exists' });
            }

            const { data, error } = await supabase.from('doctors').insert([{
                full_name, email, mobile, specialization,
                availability: availability || 'available'
            }]).select().single();
            if (error) throw error;
            return res.json({ success: true, doctor: data });
        }

        const db = readDB();
        db.doctors = db.doctors || [];
        const existing = db.doctors.find(d => d.email && d.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(400).json({ error: 'A doctor with this email already exists' });
        }

        const newDoc = {
            id: crypto.randomUUID(),
            full_name,
            email,
            mobile,
            specialization,
            availability: availability || 'available',
            created_at: new Date().toISOString()
        };
        db.doctors.push(newDoc);
        writeDB(db);
        res.json({ success: true, doctor: newDoc });
    } catch (error) {
        console.error('Error creating doctor:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT update doctor
app.put('/api/admin/doctors/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, mobile, specialization, availability } = req.body;
        if (!full_name || !email || !mobile || !specialization) {
            return res.status(400).json({ error: 'full_name, email, mobile, and specialization are required' });
        }

        if (supabase) {
            // Check duplicate email (excluding current doctor)
            const { data: existing } = await supabase.from('doctors').select('id').eq('email', email).neq('id', id).limit(1);
            if (existing && existing.length > 0) {
                return res.status(400).json({ error: 'Another doctor with this email already exists' });
            }

            const { error } = await supabase.from('doctors').update({
                full_name, email, mobile, specialization,
                availability: availability || 'available'
            }).eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }

        const db = readDB();
        db.doctors = db.doctors || [];
        const existing = db.doctors.find(d => d.email && d.email.toLowerCase() === email.toLowerCase() && d.id !== id);
        if (existing) {
            return res.status(400).json({ error: 'Another doctor with this email already exists' });
        }

        const idx = db.doctors.findIndex(d => d.id === id);
        if (idx !== -1) {
            db.doctors[idx] = {
                ...db.doctors[idx],
                full_name,
                email,
                mobile,
                specialization,
                availability: availability || 'available'
            };
            writeDB(db);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE doctor (guard: reject if linked appointments exist)
app.delete('/api/admin/doctors/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            // Check if any non-cancelled appointments reference this doctor
            const { data: linked } = await supabase
                .from('appointments')
                .select('id')
                .eq('doctor_id', id)
                .neq('status', 'cancelled')
                .limit(1);

            if (linked && linked.length > 0) {
                return res.status(400).json({
                    error: 'Cannot remove doctor: there are active appointments linked to this doctor. Please cancel those appointments first.'
                });
            }

            const { error } = await supabase.from('doctors').delete().eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }

        const db = readDB();
        const linked = (db.appointments || []).find(a => a.doctor_id === id && a.status !== 'cancelled');
        if (linked) {
            return res.status(400).json({
                error: 'Cannot remove doctor: there are active appointments linked to this doctor. Please cancel those appointments first.'
            });
        }

        db.doctors = (db.doctors || []).filter(d => d.id !== id);
        writeDB(db);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ============================================================
// DD-14: APPOINTMENT MANAGEMENT ROUTES
// ============================================================

// GET all appointments (with patient and doctor details joined)
app.get('/api/admin/appointments', authenticateAdmin, async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    patients:patient_id (id, fullname, email, mobile, username),
                    doctors:doctor_id (id, full_name, specialization)
                `)
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false });
            if (error) throw error;
            return res.json(data);
        }

        const db = readDB();
        const appts = (db.appointments || []).map(a => {
            const p = (db.patients || []).find(pat => pat.id === a.patient_id) || null;
            const d = (db.doctors || []).find(doc => doc.id === a.doctor_id) || null;
            return {
                ...a,
                patients: p ? { id: p.id, fullname: p.fullname || p.name, email: p.email, mobile: p.mobile || p.phone, username: p.username } : null,
                doctors: d ? { id: d.id, full_name: d.full_name, specialization: d.specialization } : null
            };
        }).sort((a, b) => {
            const dComp = (b.appointment_date || '').localeCompare(a.appointment_date || '');
            if (dComp !== 0) return dComp;
            return (b.appointment_time || '').localeCompare(a.appointment_time || '');
        });

        res.json(appts);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET patient appointments
app.get('/api/patient/appointments/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        if (supabase) {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id, patient_id, doctor_id, appointment_date, appointment_time, reason, status, created_at,
                    patients (id, fullname, name, email, mobile, phone, username),
                    doctors (id, full_name, specialization)
                `)
                .or(`patient_id.eq.${patientId}`)
                .order('appointment_date', { ascending: true });
            if (error) throw error;
            return res.json(data);
        }

        const db = readDB();
        const appts = (db.appointments || [])
            .filter(a => {
                const p = (db.patients || []).find(pat => pat.id === a.patient_id);
                return a.patient_id === patientId || (p && p.username === patientId);
            })
            .map(a => {
                const p = (db.patients || []).find(pat => pat.id === a.patient_id) || null;
                const d = (db.doctors || []).find(doc => doc.id === a.doctor_id) || null;
                return {
                    ...a,
                    patients: p ? { id: p.id, fullname: p.fullname || p.name, email: p.email, mobile: p.mobile || p.phone, username: p.username } : null,
                    doctors: d ? { id: d.id, full_name: d.full_name, specialization: d.specialization } : null
                };
            })
            .sort((a, b) => {
                const dComp = (a.appointment_date || '').localeCompare(b.appointment_date || '');
                if (dComp !== 0) return dComp;
                return (a.appointment_time || '').localeCompare(b.appointment_time || '');
            });

        res.json(appts);
    } catch (error) {
        console.error('Error fetching patient appointments:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET patient doctors
app.get('/api/patient/doctors', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase.from('doctors').select('id, full_name, specialization, availability');
            if (error) throw error;
            return res.json(data);
        }
        const db = readDB();
        const docs = (db.doctors || []).map(d => ({
            id: d.id,
            full_name: d.full_name,
            specialization: d.specialization,
            availability: d.availability
        }));
        res.json(docs);
    } catch (error) {
        console.error('Error fetching patient doctors:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST create appointment
app.post('/api/admin/appointments', authenticateAdmin, async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date, appointment_time, reason, status } = req.body;

        if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ error: 'patient_id, doctor_id, appointment_date, and appointment_time are required' });
        }

        // Validate date is not in the past
        const apptDate = new Date(appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (apptDate < today) {
            return res.status(400).json({ error: 'Appointment date cannot be in the past' });
        }

        if (supabase) {
            // Check for double-booking
            const { data: conflict } = await supabase
                .from('appointments')
                .select('id')
                .eq('doctor_id', doctor_id)
                .eq('appointment_date', appointment_date)
                .eq('appointment_time', appointment_time)
                .neq('status', 'cancelled')
                .limit(1);

            if (conflict && conflict.length > 0) {
                return res.status(400).json({ error: 'This doctor already has an appointment at this date and time. Please choose a different slot.' });
            }

            const { data, error } = await supabase.from('appointments').insert([{
                patient_id, doctor_id, appointment_date, appointment_time,
                reason: reason || '',
                status: status || 'scheduled'
            }]).select().single();
            if (error) throw error;
            return res.json({ success: true, appointment: data });
        }

        const db = readDB();
        db.appointments = db.appointments || [];
        const conflict = db.appointments.find(a =>
            a.doctor_id === doctor_id &&
            a.appointment_date === appointment_date &&
            a.appointment_time === appointment_time &&
            a.status !== 'cancelled'
        );
        if (conflict) {
            return res.status(400).json({ error: 'This doctor already has an appointment at this date and time. Please choose a different slot.' });
        }

        const newAppt = {
            id: crypto.randomUUID(),
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            reason: reason || '',
            status: status || 'scheduled',
            created_at: new Date().toISOString()
        };
        db.appointments.push(newAppt);
        writeDB(db);
        res.json({ success: true, appointment: newAppt });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT update appointment
app.put('/api/admin/appointments/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { patient_id, doctor_id, appointment_date, appointment_time, reason, status } = req.body;

        if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ error: 'patient_id, doctor_id, appointment_date, and appointment_time are required' });
        }

        if (supabase) {
            // Check double-booking (excluding the appointment being edited)
            const { data: conflict } = await supabase
                .from('appointments')
                .select('id')
                .eq('doctor_id', doctor_id)
                .eq('appointment_date', appointment_date)
                .eq('appointment_time', appointment_time)
                .neq('status', 'cancelled')
                .neq('id', id)
                .limit(1);

            if (conflict && conflict.length > 0) {
                return res.status(400).json({ error: 'This doctor already has an appointment at this date and time. Please choose a different slot.' });
            }

            const { error } = await supabase.from('appointments').update({
                patient_id, doctor_id, appointment_date, appointment_time,
                reason: reason || '',
                status: status || 'scheduled'
            }).eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }

        const db = readDB();
        db.appointments = db.appointments || [];
        const conflict = db.appointments.find(a =>
            a.doctor_id === doctor_id &&
            a.appointment_date === appointment_date &&
            a.appointment_time === appointment_time &&
            a.status !== 'cancelled' &&
            a.id !== id
        );
        if (conflict) {
            return res.status(400).json({ error: 'This doctor already has an appointment at this date and time. Please choose a different slot.' });
        }

        const idx = db.appointments.findIndex(a => a.id === id);
        if (idx !== -1) {
            db.appointments[idx] = {
                ...db.appointments[idx],
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                reason: reason || '',
                status: status || 'scheduled'
            };
            writeDB(db);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE (cancel) appointment
app.delete('/api/admin/appointments/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (supabase) {
            const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }

        const db = readDB();
        const appt = (db.appointments || []).find(a => a.id === id);
        if (appt) {
            appt.status = 'cancelled';
            writeDB(db);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/test-supabase', async (req, res) => {
    try {
        if (!supabase) {
            return res.json({
                success: true,
                message: 'Running in local JSON DB fallback mode (Supabase not configured)',
                mode: 'local'
            });
        }
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Supabase connected successfully',
            data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
