document.addEventListener('DOMContentLoaded', () => {
    // Auth DOM Elements
    const authContainer = document.getElementById('auth-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    const toRegisterLink = document.getElementById('to-register');
    const toLoginLink = document.getElementById('to-login');

    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const btnLoginSubmit = document.getElementById('btn-login-submit');

    const registerForm = document.getElementById('register-form');
    const registerUsernameInput = document.getElementById('register-username');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
    const btnRegisterSubmit = document.getElementById('btn-register-submit');

    const btnLogout = document.getElementById('btn-logout');
    const brandTitle = document.getElementById('brand-title');

    // Dashboard DOM Elements
    const visitCountEl = document.getElementById('visit-count');
    const podHostnameEl = document.getElementById('pod-hostname');
    const appVersionEl = document.getElementById('app-version');
    const dbStatusTextEl = document.getElementById('db-status-text');
    const btnVisit = document.getElementById('btn-visit');
    const btnRefresh = document.getElementById('btn-refresh');
    const logsBody = document.getElementById('logs-body');

    // Toast Notification System
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <span class="toast-close">&times;</span>
        `;
        container.appendChild(toast);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto close after 4s
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-10px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // Toggle Forms smooth transition
    toRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
    });

    toLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    // Helper to format ISO timestamp into readable local string
    function formatTimestamp(isoString) {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (e) {
            return isoString;
        }
    }

    // Show auth screen
    function showAuthScreen() {
        dashboardContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        loginForm.reset();
        registerForm.reset();
        loginContainer.classList.remove('hidden');
        registerContainer.classList.add('hidden');
    }

    // Show dashboard screen
    function showDashboardScreen(username) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        brandTitle.innerHTML = `Welcome to Pavan's Demo App, <span class="text-gradient">${username}</span>!`;
    }

    // Main fetch function for Visits API
    async function updateDashboard(isPost = false) {
        const url = '/api/visits';
        const options = {
            method: isPost ? 'POST' : 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        try {
            btnRefresh.disabled = true;
            btnVisit.disabled = true;

            const response = await fetch(url, options);
            
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                showAuthScreen();
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 1. Update Core Metric Metrics
            visitCountEl.textContent = data.visit_count.toLocaleString();
            podHostnameEl.textContent = data.hostname;
            appVersionEl.textContent = data.version;
            
            // DB Status Badge
            dbStatusTextEl.textContent = data.db_status.toUpperCase();
            dbStatusTextEl.style.color = data.db_status === 'healthy' ? 'var(--accent-emerald)' : 'var(--accent-rose)';

            // 2. Render Live Logs Feed
            if (data.recent_visits && data.recent_visits.length > 0) {
                const logsHtml = data.recent_visits.map((visit, index) => {
                    const isNewest = isPost && index === 0;
                    const animationClass = isNewest ? 'class="log-row-animate"' : '';
                    
                    return `
                        <tr ${animationClass}>
                            <td>#${visit.id}</td>
                            <td>${formatTimestamp(visit.visited_at)}</td>
                            <td><span class="pod-badge">${visit.hostname}</span></td>
                            <td><span class="version-badge">${visit.version}</span></td>
                        </tr>
                    `;
                }).join('');
                
                logsBody.innerHTML = logsHtml;
            } else {
                logsBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="no-logs">No database logs registered yet.</td>
                    </tr>
                `;
            }

        } catch (error) {
            console.error('Failed to sync metrics:', error);
            dbStatusTextEl.textContent = 'UNHEALTHY';
            dbStatusTextEl.style.color = 'var(--accent-rose)';
            logsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-logs" style="color: var(--accent-rose)">
                        Error connecting to API context: ${error.message}
                    </td>
                </tr>
            `;
        } finally {
            btnRefresh.disabled = false;
            btnVisit.disabled = false;
        }
    }

    // Auth Actions: Check Status
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            if (response.ok) {
                const data = await response.json();
                if (data.logged_in) {
                    showDashboardScreen(data.username);
                    updateDashboard(false); // fetch initial visits logs
                } else {
                    showAuthScreen();
                }
            } else {
                showAuthScreen();
            }
        } catch (err) {
            console.error('Error fetching auth status:', err);
            showAuthScreen();
        }
    }

    // Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value;

        if (!username || !password) {
            showToast('Username and password are required', 'error');
            return;
        }

        try {
            btnLoginSubmit.disabled = true;
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (response.ok) {
                showToast(`Welcome back, ${data.username}!`, 'success');
                showDashboardScreen(data.username);
                // Register a visit automatically on login success
                updateDashboard(true);
            } else {
                showToast(data.error || 'Invalid credentials', 'error');
            }
        } catch (err) {
            showToast('Failed to connect to authentication server', 'error');
            console.error(err);
        } finally {
            btnLoginSubmit.disabled = false;
        }
    });

    // Register Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = registerUsernameInput.value.trim();
        const password = registerPasswordInput.value;
        const confirmPassword = registerConfirmPasswordInput.value;

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        try {
            btnRegisterSubmit.disabled = true;
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (response.ok) {
                showToast('Registration successful! Please log in.', 'success');
                // Switch back to login form
                registerContainer.classList.add('hidden');
                loginContainer.classList.remove('hidden');
                loginUsernameInput.value = username;
                loginPasswordInput.value = '';
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Failed to connect to authentication server', 'error');
            console.error(err);
        } finally {
            btnRegisterSubmit.disabled = false;
        }
    });

    // Logout Action
    btnLogout.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            if (response.ok) {
                showToast('Successfully logged out', 'success');
                showAuthScreen();
            } else {
                showToast('Logout request failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showAuthScreen();
        }
    });

    // Dashboard Interaction Listeners
    btnVisit.addEventListener('click', () => updateDashboard(true));
    btnRefresh.addEventListener('click', () => updateDashboard(false));

    // Initialize Page: Check Status
    checkAuthStatus();
});
