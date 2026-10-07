document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    
    // Sections
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    
    // Switch links
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');
    
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Login Elements - Mobile OTP
    const btnSendPhoneOtp = document.getElementById('btn-send-phone-otp');
    const btnVerifyPhoneOtp = document.getElementById('btn-verify-phone-otp');
    const phoneInputGroup = document.getElementById('phone-input-group');
    const phoneOtpContainer = document.getElementById('phone-otp-container');
    const phoneOtpGroup = document.getElementById('phone-otp-group');
    const phoneInput = document.getElementById('login-phone-number');
    const phoneOtpInput = document.getElementById('login-phone-otp');
    const displayPhoneNum = document.getElementById('display-phone-num');
    const changePhoneNum = document.getElementById('change-phone-num');
    const btnResendPhoneOtp = document.getElementById('btn-resend-phone-otp');
    
    // Login Elements - Email OTP
    const btnSendEmailOtp = document.getElementById('btn-send-email-otp');
    const btnVerifyEmailOtp = document.getElementById('btn-verify-email-otp');
    const emailInputGroup = document.getElementById('email-input-group');
    const emailOtpContainer = document.getElementById('email-otp-container');
    const emailOtpGroup = document.getElementById('email-otp-group');
    const emailInput = document.getElementById('login-email-id');
    const emailOtpInput = document.getElementById('login-email-otp');
    const displayEmailId = document.getElementById('display-email-id');
    const changeEmailId = document.getElementById('change-email-id');
    const btnResendEmailOtp = document.getElementById('btn-resend-email-otp');
    
    // Forms
    const registerForm = document.getElementById('register-form');
    const loginFormUp = document.getElementById('login-form-up');
    const loginFormPhone = document.getElementById('login-form-phone');
    const loginFormEmail = document.getElementById('login-form-email');

    // Messages
    const loginMsg = document.getElementById('login-msg');
    const regMsg = document.getElementById('reg-msg');
    
    // Modal
    const successModal = document.getElementById('success-modal');
    const btnLogout = document.getElementById('btn-logout');

    // State Variables
    let currentPhoneOtp = null;
    let currentEmailOtp = null;

    // --- Utility Functions ---
    function showMsg(element, msg, isError = true) {
        element.textContent = msg;
        element.className = 'msg ' + (isError ? 'error' : 'success');
        setTimeout(() => {
            element.textContent = '';
            element.className = 'msg';
        }, 5000);
    }
    
    function generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    function checkUserExists(key, value) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        return users.find(u => u[key] === value);
    }
    
    // --- Event Listeners ---

    // Switch between Login and Registration
    goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
        document.getElementById('app-container').style.maxWidth = '650px';
    });

    goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        document.getElementById('app-container').style.maxWidth = '500px';
    });

    // Tab Switching for Login Methods
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to current
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            // Reset forms and states on tab switch
            loginFormUp.reset();
            loginFormPhone.reset();
            loginFormEmail.reset();
            
            if (phoneOtpContainer) phoneOtpContainer.classList.add('hidden');
            phoneInputGroup.classList.remove('hidden');
            btnSendPhoneOtp.classList.remove('hidden');
            btnVerifyPhoneOtp.classList.add('hidden');
            phoneInput.disabled = false;
            clearInterval(window.phoneCountdownInterval);
            
            if (emailOtpContainer) emailOtpContainer.classList.add('hidden');
            emailInputGroup.classList.remove('hidden');
            btnSendEmailOtp.classList.remove('hidden');
            btnVerifyEmailOtp.classList.add('hidden');
            emailInput.disabled = false;
            clearInterval(window.emailCountdownInterval);
            
            loginMsg.textContent = '';
            loginMsg.className = 'msg';
        });
    });

    // Registration Form Submit
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fullname = document.getElementById('reg-fullname').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const mobile = document.getElementById('reg-mobile').value.trim();
        const dob = document.getElementById('reg-dob').value;
        const gender = document.getElementById('reg-gender').value;
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        if (password !== confirmPassword) {
            showMsg(regMsg, 'Passwords do not match!', true);
            return;
        }

        // Check if user already exists
        if (checkUserExists('username', username)) {
            showMsg(regMsg, 'Username already taken!', true);
            return;
        }
        if (checkUserExists('email', email)) {
            showMsg(regMsg, 'Email already registered! Please log in.', true);
            return;
        }
        if (checkUserExists('mobile', mobile)) {
            showMsg(regMsg, 'Mobile number already registered! Please log in.', true);
            return;
        }

        const newUser = { fullname, email, mobile, dob, gender, username, password };
        const users = JSON.parse(localStorage.getItem('users')) || [];
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        showMsg(regMsg, 'Registration successful! Please log in.', false);
        registerForm.reset();
        
        setTimeout(() => {
            goToLogin.click();
        }, 1500);
    });

    // Login Method 1: Username & Password
    loginFormUp.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        const user = checkUserExists('username', username);
        if (!user) {
            showMsg(loginMsg, 'User not found. Please register first.', true);
            return;
        }
        if (user.password !== password) {
            showMsg(loginMsg, 'Incorrect password!', true);
            return;
        }

        // Login Success
        showSuccessModal();
    });

    // Login Method 2: Mobile & OTP
    window.phoneCountdownInterval = null;

    function startPhoneResendCountdown() {
        let timeLeft = 30;
        btnResendPhoneOtp.style.pointerEvents = 'none';
        btnResendPhoneOtp.style.color = 'var(--text-muted)';
        
        clearInterval(window.phoneCountdownInterval);
        window.phoneCountdownInterval = setInterval(() => {
            btnResendPhoneOtp.textContent = `Resend OTP (${timeLeft}s)`;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(window.phoneCountdownInterval);
                btnResendPhoneOtp.textContent = 'Resend OTP';
                btnResendPhoneOtp.style.pointerEvents = 'auto';
                btnResendPhoneOtp.style.color = 'var(--primary-color)';
            }
        }, 1000);
    }

    async function sendPhoneOTP(mobile, isResend = false) {
        const btn = isResend ? btnResendPhoneOtp : btnSendPhoneOtp;
        const originalText = btn.textContent;
        
        if (!isResend) {
            btn.textContent = 'Sending...';
            btn.disabled = true;
        } else {
            btn.textContent = 'Sending...';
            btn.style.pointerEvents = 'none';
        }

        try {
            const res = await fetch('http://localhost:3000/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: mobile })
            });
            const data = await res.json();
            
            if (data.success) {
                phoneInputGroup.classList.add('hidden');
                phoneOtpContainer.classList.remove('hidden');
                displayPhoneNum.textContent = mobile;
                phoneOtpInput.required = true;
                btnSendPhoneOtp.classList.add('hidden');
                btnVerifyPhoneOtp.classList.remove('hidden');
                showMsg(loginMsg, 'OTP sent successfully!', false);
                startPhoneResendCountdown();
            } else {
                showMsg(loginMsg, data.message || 'Failed to send OTP', true);
                if (!isResend) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                } else {
                    btn.textContent = 'Resend OTP';
                    btn.style.pointerEvents = 'auto';
                }
            }
        } catch (error) {
            showMsg(loginMsg, 'Error connecting to server', true);
            if (!isResend) {
                btn.textContent = originalText;
                btn.disabled = false;
            } else {
                btn.textContent = 'Resend OTP';
                btn.style.pointerEvents = 'auto';
            }
        }
    }

    btnSendPhoneOtp.addEventListener('click', () => {
        const mobile = phoneInput.value.trim();
        if (!/^\d{10}$/.test(mobile)) {
            showMsg(loginMsg, 'Mobile number must be exactly 10 digits', true);
            return;
        }
        
        const user = checkUserExists('mobile', mobile);
        if (!user) {
            showMsg(loginMsg, 'Mobile number not registered. Please register first.', true);
            return;
        }

        sendPhoneOTP(mobile, false);
    });

    btnResendPhoneOtp.addEventListener('click', (e) => {
        e.preventDefault();
        const mobile = phoneInput.value.trim();
        sendPhoneOTP(mobile, true);
    });

    changePhoneNum.addEventListener('click', (e) => {
        e.preventDefault();
        clearInterval(window.phoneCountdownInterval);
        phoneOtpContainer.classList.add('hidden');
        phoneInputGroup.classList.remove('hidden');
        btnVerifyPhoneOtp.classList.add('hidden');
        btnSendPhoneOtp.classList.remove('hidden');
        btnSendPhoneOtp.disabled = false;
        btnSendPhoneOtp.textContent = 'Send OTP';
        phoneOtpInput.value = '';
        phoneOtpInput.required = false;
        loginMsg.textContent = '';
        loginMsg.className = 'msg';
    });

    loginFormPhone.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredOtp = phoneOtpInput.value.trim();
        const mobile = phoneInput.value.trim();
        
        const originalText = btnVerifyPhoneOtp.textContent;
        btnVerifyPhoneOtp.textContent = 'Verifying...';
        btnVerifyPhoneOtp.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: mobile, code: enteredOtp })
            });
            const data = await res.json();
            
            if (data.success && data.status === 'approved') {
                showSuccessModal();
            } else {
                showMsg(loginMsg, data.message || 'Invalid OTP!', true);
                btnVerifyPhoneOtp.textContent = originalText;
                btnVerifyPhoneOtp.disabled = false;
            }
        } catch (error) {
            showMsg(loginMsg, 'Error verifying OTP', true);
            btnVerifyPhoneOtp.textContent = originalText;
            btnVerifyPhoneOtp.disabled = false;
        }
    });

    // Login Method 3: Email & OTP
    window.emailCountdownInterval = null;

    function startEmailResendCountdown() {
        let timeLeft = 30;
        btnResendEmailOtp.style.pointerEvents = 'none';
        btnResendEmailOtp.style.color = 'var(--text-muted)';
        
        clearInterval(window.emailCountdownInterval);
        window.emailCountdownInterval = setInterval(() => {
            btnResendEmailOtp.textContent = `Resend Code (${timeLeft}s)`;
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(window.emailCountdownInterval);
                btnResendEmailOtp.textContent = 'Resend Code';
                btnResendEmailOtp.style.pointerEvents = 'auto';
                btnResendEmailOtp.style.color = 'var(--primary-color)';
            }
        }, 1000);
    }

    async function sendEmailOTP(email, isResend = false) {
        const btn = isResend ? btnResendEmailOtp : btnSendEmailOtp;
        const originalText = btn.textContent;
        
        if (!isResend) {
            btn.textContent = 'Sending...';
            btn.disabled = true;
        } else {
            btn.textContent = 'Sending...';
            btn.style.pointerEvents = 'none';
        }

        try {
            const res = await fetch('http://localhost:3000/send-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            
            if (data.success) {
                emailInputGroup.classList.add('hidden');
                emailOtpContainer.classList.remove('hidden');
                displayEmailId.textContent = email;
                emailOtpInput.required = true;
                btnSendEmailOtp.classList.add('hidden');
                btnVerifyEmailOtp.classList.remove('hidden');
                showMsg(loginMsg, 'Verification code sent to email!', false);
                startEmailResendCountdown();
            } else {
                showMsg(loginMsg, data.message || 'Failed to send code', true);
                if (!isResend) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                } else {
                    btn.textContent = 'Resend Code';
                    btn.style.pointerEvents = 'auto';
                }
            }
        } catch (error) {
            showMsg(loginMsg, 'Error connecting to server', true);
            if (!isResend) {
                btn.textContent = originalText;
                btn.disabled = false;
            } else {
                btn.textContent = 'Resend Code';
                btn.style.pointerEvents = 'auto';
            }
        }
    }

    btnSendEmailOtp.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (!email.endsWith('@gmail.com')) {
            showMsg(loginMsg, 'Please enter a valid @gmail.com address', true);
            return;
        }
        
        const user = checkUserExists('email', email);
        if (!user) {
            showMsg(loginMsg, 'Email not registered. Please register first.', true);
            return;
        }

        sendEmailOTP(email, false);
    });

    btnResendEmailOtp.addEventListener('click', (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        sendEmailOTP(email, true);
    });

    changeEmailId.addEventListener('click', (e) => {
        e.preventDefault();
        clearInterval(window.emailCountdownInterval);
        emailOtpContainer.classList.add('hidden');
        emailInputGroup.classList.remove('hidden');
        btnVerifyEmailOtp.classList.add('hidden');
        btnSendEmailOtp.classList.remove('hidden');
        btnSendEmailOtp.disabled = false;
        btnSendEmailOtp.textContent = 'Send Code';
        emailOtpInput.value = '';
        emailOtpInput.required = false;
        loginMsg.textContent = '';
        loginMsg.className = 'msg';
    });

    loginFormEmail.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredOtp = emailOtpInput.value.trim();
        const email = emailInput.value.trim();
        
        const originalText = btnVerifyEmailOtp.textContent;
        btnVerifyEmailOtp.textContent = 'Verifying...';
        btnVerifyEmailOtp.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/verify-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: enteredOtp })
            });
            const data = await res.json();
            
            if (data.success && data.status === 'approved') {
                showSuccessModal();
            } else {
                showMsg(loginMsg, data.message || 'Invalid Code!', true);
                btnVerifyEmailOtp.textContent = originalText;
                btnVerifyEmailOtp.disabled = false;
            }
        } catch (error) {
            showMsg(loginMsg, 'Error verifying Code', true);
            btnVerifyEmailOtp.textContent = originalText;
            btnVerifyEmailOtp.disabled = false;
        }
    });

    // Success Modal Handlers
    function showSuccessModal() {
        successModal.classList.remove('hidden');
    }

    btnLogout.addEventListener('click', () => {
        successModal.classList.add('hidden');
        // Reset everything
        loginFormUp.reset();
        loginFormPhone.reset();
        loginFormEmail.reset();
        
        // Reset Mobile UI
        if (phoneOtpContainer) phoneOtpContainer.classList.add('hidden');
        phoneInputGroup.classList.remove('hidden');
        phoneOtpInput.required = false;
        clearInterval(window.phoneCountdownInterval);
        btnSendPhoneOtp.disabled = false;
        btnSendPhoneOtp.textContent = 'Send OTP';
        btnSendPhoneOtp.classList.remove('hidden');
        btnVerifyPhoneOtp.classList.add('hidden');
        phoneInput.disabled = false;
        
        // Reset Email UI
        if (emailOtpContainer) emailOtpContainer.classList.add('hidden');
        emailInputGroup.classList.remove('hidden');
        emailOtpInput.required = false;
        clearInterval(window.emailCountdownInterval);
        btnSendEmailOtp.disabled = false;
        btnSendEmailOtp.textContent = 'Send Code';
        btnVerifyEmailOtp.classList.add('hidden');
        emailInput.disabled = false;
        
        // Switch to username tab
        tabBtns[0].click();
        
        loginMsg.textContent = '';
        loginMsg.className = 'msg';
    });
});
