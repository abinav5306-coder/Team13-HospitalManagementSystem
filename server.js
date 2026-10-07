require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve index.html, style.css, script.js

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
