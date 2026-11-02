require('dotenv').config();

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

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
        pass: process.env.EMAIL_APP_PASSWORD
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
            taken: false
        };
        db.medications = db.medications || [];
        db.medications.push(newMed);
        writeDB(db);
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
