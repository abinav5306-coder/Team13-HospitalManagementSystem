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

    async function checkUserExists(key, value) {
        try {
            const res = await fetch(`http://localhost:3000/api/users/check?field=${key}&value=${value}`);
            const data = await res.json();
            return data.user || null;
        } catch (e) {
            console.error('Error fetching users:', e);
            return null;
        }
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
    registerForm.addEventListener('submit', async (e) => {
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
        if (await checkUserExists('username', username)) {
            showMsg(regMsg, 'Username already taken!', true);
            return;
        }
        if (await checkUserExists('email', email)) {
            showMsg(regMsg, 'Email already registered! Please log in.', true);
            return;
        }
        if (await checkUserExists('mobile', mobile)) {
            showMsg(regMsg, 'Mobile number already registered! Please log in.', true);
            return;
        }

        const newUser = { fullname, email, mobile, dob, gender, username, password };
        
        try {
            const response = await fetch('http://localhost:3000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }
            
            showMsg(regMsg, 'Registration successful! Please log in.', false);
            registerForm.reset();
            
            setTimeout(() => {
                goToLogin.click();
            }, 1500);
        } catch (e) {
            showMsg(regMsg, e.message || 'Error registering user!', true);
        }
    });

    // Login Method 1: Username & Password
    loginFormUp.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        const user = await checkUserExists('username', username);
        if (!user) {
            showMsg(loginMsg, 'User not found. Please register first.', true);
            return;
        }
        if (user.password !== password) {
            showMsg(loginMsg, 'Incorrect password!', true);
            return;
        }

        // Login Success
        showSuccessModal(user.username);
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

    btnSendPhoneOtp.addEventListener('click', async () => {
        const mobile = phoneInput.value.trim();
        if (!/^\d{10}$/.test(mobile)) {
            showMsg(loginMsg, 'Mobile number must be exactly 10 digits', true);
            return;
        }
        
        const user = await checkUserExists('mobile', mobile);
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
                const user = await checkUserExists('mobile', mobile);
                showSuccessModal(user.username);
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

    btnSendEmailOtp.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email.endsWith('@gmail.com')) {
            showMsg(loginMsg, 'Please enter a valid @gmail.com address', true);
            return;
        }
        
        const user = await checkUserExists('email', email);
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
                const user = await checkUserExists('email', email);
                showSuccessModal(user.username);
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
    async function showSuccessModal(username) {
        successModal.classList.remove('hidden');
        const list = document.getElementById('patient-medications-list');
        list.innerHTML = 'Loading...';
        
        try {
            const res = await fetch(`http://localhost:3000/api/medications/${username}`);
            const meds = await res.json();
            
            if (meds.length === 0) {
                list.innerHTML = '<p style="color: #666;">No medications scheduled.</p>';
            } else {
                list.innerHTML = '';
                meds.forEach(med => {
                    const div = document.createElement('div');
                    div.style.padding = '10px';
                    div.style.marginBottom = '8px';
                    div.style.background = 'white';
                    div.style.borderRadius = '4px';
                    div.style.border = '1px solid #ddd';
                    div.style.display = 'flex';
                    div.style.justifyContent = 'space-between';
                    div.style.alignItems = 'center';
                    
                    let statusHtml = med.taken ? 
                        '<span style="color: green; font-weight: bold;">✓ Taken</span>' :
                        `<button class="btn primary-btn" style="padding: 5px 10px; font-size: 0.8rem;" onclick="markMedicineTaken('${med.id}', '${username}')">Mark as Taken</button>`;
                    
                    div.innerHTML = `
                        <div>
                            <strong>${med.medicineName}</strong> - ${med.dosage}<br>
                            <small>Time: ${med.scheduleTime}</small>
                        </div>
                        <div>
                            ${statusHtml}
                        </div>
                    `;
                    list.appendChild(div);
                });
            }
        } catch (e) {
            list.innerHTML = '<p style="color: red;">Error loading medications.</p>';
        }
    }

    window.markMedicineTaken = async function(id, username) {
        try {
            const res = await fetch(`http://localhost:3000/api/medications/${id}/taken`, {
                method: 'PUT'
            });
            const data = await res.json();
            if (data.success) {
                showSuccessModal(username);
            }
        } catch (e) {
            alert('Error updating status');
        }
    };

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

    // --- Admin Logic ---
    const goToAdmin = document.getElementById('go-to-admin');
    const adminLoginSection = document.getElementById('admin-login-section');
    const adminBackToLogin = document.getElementById('admin-back-to-login');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginMsg = document.getElementById('admin-login-msg');
    const adminDashboardSection = document.getElementById('admin-dashboard-section');
    
    goToAdmin.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.add('hidden');
        adminLoginSection.classList.remove('hidden');
    });

    adminBackToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        adminLoginSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;
        
        try {
            const res = await fetch('http://localhost:3000/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                adminLoginSection.classList.add('hidden');
                adminDashboardSection.classList.remove('hidden');
                loadPatientsForAdmin();
            } else {
                showMsg(adminLoginMsg, data.message, true);
            }
        } catch(err) {
            showMsg(adminLoginMsg, 'Error connecting to server', true);
        }
    });

    // Admin Dashboard Tabs
    const tabAdminRegisterBtn = document.getElementById('tab-admin-register-btn');
    const tabAdminMedsBtn = document.getElementById('tab-admin-meds-btn');
    const adminRegisterTab = document.getElementById('admin-register-tab');
    const adminMedsTab = document.getElementById('admin-meds-tab');
    
    tabAdminRegisterBtn.addEventListener('click', () => {
        tabAdminRegisterBtn.classList.add('active');
        tabAdminMedsBtn.classList.remove('active');
        adminRegisterTab.classList.add('active');
        adminMedsTab.classList.remove('active');
    });

    tabAdminMedsBtn.addEventListener('click', () => {
        tabAdminMedsBtn.classList.add('active');
        tabAdminRegisterBtn.classList.remove('active');
        adminMedsTab.classList.add('active');
        adminRegisterTab.classList.remove('active');
        loadPatientsForAdmin();
    });

    document.getElementById('admin-logout-btn').addEventListener('click', async () => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            await fetch('http://localhost:3000/api/admin/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(e => console.error(e));
            localStorage.removeItem('adminToken');
        }
        adminDashboardSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        adminLoginForm.reset();
    });

    // Admin Patient Management Table and Modal
    const adminPatientModal = document.getElementById('admin-patient-modal');
    const adminAddPatientBtn = document.getElementById('admin-add-patient-btn');
    const adminClosePatientModal = document.getElementById('admin-close-patient-modal');
    const adminRegisterForm = document.getElementById('admin-register-form');
    const adminRegMsg = document.getElementById('admin-reg-msg');
    const adminPatientsTbody = document.getElementById('admin-patients-tbody');
    const adminPatientModalTitle = document.getElementById('admin-patient-modal-title');
    const adminRegSubmitBtn = document.getElementById('admin-reg-submit-btn');

    async function loadAdminPatientsTable() {
        try {
            const token = localStorage.getItem('adminToken');
            const [res, medsRes] = await Promise.all([
                fetch('http://localhost:3000/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:3000/api/admin/medications', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const users = await res.json();
            const allMeds = await medsRes.json();
            
            adminPatientsTbody.innerHTML = '';
            users.forEach(user => {
                const userMeds = allMeds.filter(m => m.patientUsername === user.username);
                const medsText = userMeds.length > 0 ? userMeds.map(m => m.medicineName).join(', ') : 'None';
                const schedText = userMeds.length > 0 ? userMeds.map(m => m.scheduleTime).join(', ') : '-';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.fullname || ''}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.email || ''}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.mobile || ''}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.dob || ''}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.gender || ''}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.username || ''}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${medsText}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${schedText}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; white-space: nowrap;">
                        <button class="btn primary-btn btn-edit-patient" data-id="${user.id}" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px;">Edit</button>
                        <button class="btn btn-delete-patient" data-id="${user.id}" style="padding: 5px 10px; font-size: 0.8rem; background: #e74c3c; color: white;">Delete</button>
                    </td>
                `;
                adminPatientsTbody.appendChild(tr);
            });

            document.querySelectorAll('.btn-edit-patient').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const user = users.find(u => u.id == id);
                    if (user) {
                        document.getElementById('admin-reg-id').value = user.id;
                        document.getElementById('admin-reg-fullname').value = user.fullname || '';
                        document.getElementById('admin-reg-email').value = user.email || '';
                        document.getElementById('admin-reg-mobile').value = user.mobile || '';
                        document.getElementById('admin-reg-dob').value = user.dob || '';
                        document.getElementById('admin-reg-gender').value = user.gender || '';
                        document.getElementById('admin-reg-username').value = user.username || '';
                        document.getElementById('admin-reg-password').value = '';
                        document.getElementById('admin-reg-confirm-password').value = '';
                        document.getElementById('admin-reg-password').required = false;
                        document.getElementById('admin-reg-confirm-password').required = false;
                        
                        adminPatientModalTitle.textContent = 'Edit Patient';
                        adminRegSubmitBtn.textContent = 'Save Changes';
                        adminRegMsg.textContent = '';
                        adminPatientModal.classList.remove('hidden');
                    }
                });
            });

            document.querySelectorAll('.btn-delete-patient').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this patient?')) {
                        try {
                            const token = localStorage.getItem('adminToken');
                            const res = await fetch(`http://localhost:3000/api/admin/users/${id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                                loadAdminPatientsTable();
                            } else {
                                alert('Failed to delete patient');
                            }
                        } catch (err) {
                            alert('Error deleting patient');
                        }
                    }
                });
            });

        } catch (e) {
            adminPatientsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Error loading patients</td></tr>';
        }
    }

    adminAddPatientBtn.addEventListener('click', () => {
        adminRegisterForm.reset();
        document.getElementById('admin-reg-id').value = '';
        document.getElementById('admin-reg-password').required = true;
        document.getElementById('admin-reg-confirm-password').required = true;
        adminPatientModalTitle.textContent = 'Add Patient';
        adminRegSubmitBtn.textContent = 'Register Patient';
        adminRegMsg.textContent = '';
        adminPatientModal.classList.remove('hidden');
    });

    adminClosePatientModal.addEventListener('click', () => {
        adminPatientModal.classList.add('hidden');
    });

    adminRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-reg-id').value;
        const fullname = document.getElementById('admin-reg-fullname').value.trim();
        const email = document.getElementById('admin-reg-email').value.trim();
        const mobile = document.getElementById('admin-reg-mobile').value.trim();
        const dob = document.getElementById('admin-reg-dob').value;
        const gender = document.getElementById('admin-reg-gender').value;
        const username = document.getElementById('admin-reg-username').value.trim();
        const password = document.getElementById('admin-reg-password').value;
        const confirmPassword = document.getElementById('admin-reg-confirm-password').value;

        if (password && password !== confirmPassword) {
            showMsg(adminRegMsg, 'Passwords do not match!', true);
            return;
        }

        const patientData = { fullname, email, mobile, dob, gender, username };
        if (password) {
            patientData.password = password;
        }
        
        try {
            const token = localStorage.getItem('adminToken');
            let url = 'http://localhost:3000/api/admin/users';
            let method = 'POST';

            if (id) {
                url = `http://localhost:3000/api/admin/users/${id}`;
                method = 'PUT';
            } else {
                if (await checkUserExists('username', username)) {
                    showMsg(adminRegMsg, 'Username already taken!', true);
                    return;
                }
                if (await checkUserExists('email', email)) {
                    showMsg(adminRegMsg, 'Email already registered!', true);
                    return;
                }
                if (await checkUserExists('mobile', mobile)) {
                    showMsg(adminRegMsg, 'Mobile number already registered!', true);
                    return;
                }
            }

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(patientData)
            });
            
            if (res.ok) {
                showMsg(adminRegMsg, id ? 'Patient updated successfully!' : 'Patient registered successfully!', false);
                setTimeout(() => {
                    adminPatientModal.classList.add('hidden');
                    loadAdminPatientsTable();
                    loadPatientsForAdmin(); // Refresh medication dropdown
                }, 1000);
            } else {
                const errorData = await res.json();
                showMsg(adminRegMsg, errorData.error || 'Error saving patient', true);
            }
        } catch (err) {
            showMsg(adminRegMsg, 'Error connecting to server', true);
        }
    });

    // Admin Assign Medication
    async function loadPatientsForAdmin() {
        const select = document.getElementById('med-patient');
        loadAdminPatientsTable();
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch('http://localhost:3000/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await res.json();
            select.innerHTML = '<option value="" disabled selected>Select Patient</option>';
            users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.username;
                opt.textContent = `${u.fullname} (${u.username})`;
                select.appendChild(opt);
            });
        } catch(e) {
            select.innerHTML = '<option value="" disabled>Error loading patients</option>';
        }
    }

    const adminMedsForm = document.getElementById('admin-meds-form');
    const adminMedsMsg = document.getElementById('admin-meds-msg');
    
    adminMedsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            patientUsername: document.getElementById('med-patient').value,
            medicineName: document.getElementById('med-name').value.trim(),
            dosage: document.getElementById('med-dosage').value.trim(),
            scheduleTime: document.getElementById('med-time').value
        };
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch('http://localhost:3000/api/admin/medications', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showMsg(adminMedsMsg, 'Medication assigned successfully!', false);
                document.getElementById('med-name').value = '';
                document.getElementById('med-dosage').value = '';
                document.getElementById('med-time').value = '';
            }
        } catch(err) {
            showMsg(adminMedsMsg, 'Error assigning medication', true);
        }
    });
});
async function adminLogin() {
    const username = document.getElementById("adminUsername").value;
    const password = document.getElementById("adminPassword").value;
    const message = document.getElementById("adminLoginMessage");

    if (!username || !password) {
        message.textContent = "Please enter username and password.";
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/admin-login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            message.textContent = "Admin login successful!";

            // Store admin login status
            localStorage.setItem("adminLoggedIn", "true");
            localStorage.setItem("adminId", data.admin.id);

            // Later we'll redirect to Admin Dashboard
        } else {
            message.textContent = data.message;
        }

    } catch (error) {
        console.error(error);
        message.textContent = "Unable to connect to server.";
    }
}
function showAdminLogin() {
    document.getElementById("adminLoginPage").style.display = "block";
}

function showPatientLogin() {
    document.getElementById("adminLoginPage").style.display = "none";
}
