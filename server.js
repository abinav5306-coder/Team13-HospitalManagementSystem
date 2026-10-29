require('dotenv').config();

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const app = express();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve index.html, style.css, script.js

const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'database.json');

// Initialize DB
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], medications: [], admins: [{ username: 'admin', email: 'admin@hospital.com', password: 'password123' }] }, null, 2));
} else {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!db.admins) {
        db.admins = [{ username: 'admin', email: 'admin@hospital.com', password: 'password123' }];
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
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

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
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

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin username or password'
            });
        }

        if (admin.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin username or password'
            });
        }

        res.json({
            success: true,
            message: 'Admin login successful',
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name
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
        
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq(field, value)
            .limit(1)
            .single();
            
        if (error && error.code !== 'PGRST116') {
            throw error; // Ignore PGRST116 (No rows returned)
        }
        res.json({ user: data || null });
    } catch (error) {
        console.error("Error checking user:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = req.body;
        
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
        res.json({ success: true, data });
    } catch (error) {
        console.error("Error adding user:", error);
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

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .single();

        if (error || !admin) {
            console.log("Admin not found:", error);
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        if (admin.password !== password) {
            console.log("Password does not match");
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        console.log("Admin login successful:", admin.username);
        
        const token = crypto.randomBytes(32).toString('hex');
        adminTokens.add(token);

        res.json({
            success: true,
            message: 'Admin login successful',
            token: token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                name: admin.name
            }
        });

    } catch (error) {
        console.error("Admin login error:", error);

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
        const meds = db.medications.filter(m => m.patientUsername === req.params.username);
        res.json(meds);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const { data: patients, error } = await supabase.from('patients').select('*');
        if (error) throw error;
        res.json(patients);
    } catch (error) {
        console.error("Error fetching admin users:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const newUser = req.body;
        
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
        res.json({ success: true });
    } catch (error) {
        console.error("Error adding admin user:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedUser = req.body;
        const { data, error } = await supabase.from('patients').update(updatedUser).eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating admin user:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('patients').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting admin user:", error);
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
        const med = db.medications.find(m => m.id === req.params.id);
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
        const { data, error } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
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
        res.json({ success: true, doctor: data });
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
        res.json(data);
    } catch (error) {
        console.error('Error fetching appointments:', error);
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
        res.json({ success: true, appointment: data });
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
        const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/test-supabase', async (req, res) => {
    try {
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
