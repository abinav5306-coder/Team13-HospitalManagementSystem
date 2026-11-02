import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse,
  User,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  adminLogin as apiAdminLogin,
  checkUserExists,
  sendPhoneOtp,
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp
} from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { loginAdmin, loginPatient } = useAuth();

  // Mode: 'patient' | 'admin'
  const [authMode, setAuthMode] = useState('patient');

  // Patient Login Method: 'username' | 'phone' | 'email'
  const [patientMethod, setPatientMethod] = useState('username');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Admin login states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // OTP flow states
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const startResendCountdown = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // --- Handlers ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await apiAdminLogin(adminUsername.trim(), adminPassword);
      if (res.success && res.token) {
        loginAdmin(res.token, res.admin || { username: adminUsername, name: 'System Admin' });
        navigate('/admin/dashboard');
      } else {
        setErrorMsg(res.message || 'Invalid admin credentials');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientUsernameLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const user = await checkUserExists('username', username.trim());
      if (!user) {
        setErrorMsg('Patient account not found. Please register first.');
        return;
      }

      if (user.password !== password) {
        setErrorMsg('Incorrect password. Please try again.');
        return;
      }

      loginPatient(user);
      navigate('/patient/dashboard');
    } catch (err) {
      setErrorMsg('Error verifying credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!/^\d{10}$/.test(phone.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const user = await checkUserExists('mobile', phone.trim());
      if (!user) {
        setErrorMsg('This mobile number is not registered. Please register first.');
        return;
      }

      const res = await sendPhoneOtp(phone.trim());
      if (res.success) {
        setOtpSent(true);
        setSuccessMsg(`OTP sent to ${phone}. (Demo test OTP: 123456)`);
        startResendCountdown();
      } else {
        setErrorMsg(res.message || 'Failed to send OTP');
      }
    } catch (err) {
      setErrorMsg('Error communicating with authentication service');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await verifyPhoneOtp(phone.trim(), otpCode.trim());
      if (res.success && res.status === 'approved') {
        const user = await checkUserExists('mobile', phone.trim());
        loginPatient(user);
        navigate('/patient/dashboard');
      } else {
        setErrorMsg(res.message || 'Invalid OTP code');
      }
    } catch (err) {
      setErrorMsg('Error verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const user = await checkUserExists('email', email.trim());
      if (!user) {
        setErrorMsg('This email is not registered. Please register first.');
        return;
      }

      const res = await sendEmailOtp(email.trim());
      if (res.success) {
        setOtpSent(true);
        setSuccessMsg(`Verification code sent to ${email}`);
        startResendCountdown();
      } else {
        setErrorMsg(res.message || 'Failed to send email verification');
      }
    } catch (err) {
      setErrorMsg('Error sending verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await verifyEmailOtp(email.trim(), otpCode.trim());
      if (res.success && res.status === 'approved') {
        const user = await checkUserExists('email', email.trim());
        loginPatient(user);
        navigate('/patient/dashboard');
      } else {
        setErrorMsg(res.message || 'Invalid or expired verification code');
      }
    } catch (err) {
      setErrorMsg('Error verifying code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-50/50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-9 relative z-10"
      >
        {/* Brand Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-3">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            {authMode === 'admin' ? 'Admin Portal' : 'Patient Care Portal'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {authMode === 'admin'
              ? 'Authorized Hospital Administration Access'
              : 'Log in to view prescriptions, schedules & appointments'}
          </p>
        </div>

        {/* Portal Switcher (Patient vs Admin) */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('patient');
              clearMessages();
              setOtpSent(false);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authMode === 'patient'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Patient Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('admin');
              clearMessages();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Admin Sign In
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 mb-5 text-xs text-rose-700 bg-rose-50 border border-rose-200/80 rounded-xl">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2.5 p-3 mb-5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= ADMIN LOGIN ================= */}
        {authMode === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin or admin@hospital.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In as Administrator'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="p-3 mt-4 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 text-center">
              Default credentials: <strong className="text-slate-700">admin</strong> / <strong className="text-slate-700">password123</strong>
            </div>
          </form>
        ) : (
          /* ================= PATIENT LOGIN ================= */
          <div>
            {/* Patient method tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setPatientMethod('username');
                  clearMessages();
                  setOtpSent(false);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  patientMethod === 'username'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientMethod('phone');
                  clearMessages();
                  setOtpSent(false);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  patientMethod === 'phone'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientMethod('email');
                  clearMessages();
                  setOtpSent(false);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  patientMethod === 'email'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Email OTP
              </button>
            </div>

            {/* Method 1: Username & Password */}
            {patientMethod === 'username' && (
              <form onSubmit={handlePatientUsernameLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. johndoe"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Method 2: Mobile OTP */}
            {patientMethod === 'phone' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      disabled={otpSent}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-75"
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={loading || phone.length !== 10}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                    <KeyRound className="w-4 h-4" />
                  </button>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">Enter 6-Digit OTP</label>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Change Number
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full text-center tracking-widest text-lg font-bold py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Didn't receive code?</span>
                      {resendTimer > 0 ? (
                        <span>Resend in {resendTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Resend OTP
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Verifying...' : 'Verify & Enter Portal'}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Method 3: Email OTP */}
            {patientMethod === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled={otpSent}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patient@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-75"
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={loading || !email}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Sending Code...' : 'Send Verification Code'}
                    <KeyRound className="w-4 h-4" />
                  </button>
                ) : (
                  <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">Enter 6-Digit Code</label>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Change Email
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full text-center tracking-widest text-lg font-bold py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Code valid for 5 mins</span>
                      {resendTimer > 0 ? (
                        <span>Resend in {resendTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Resend Code
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Verifying...' : 'Verify & Enter Portal'}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Registration Link */}
            <div className="text-center mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                New patient at MedCare?{' '}
                <Link
                  to="/register"
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  Create an Account
                </Link>
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
