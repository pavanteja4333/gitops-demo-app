document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const visitCountEl = document.getElementById('visit-count');
    const podHostnameEl = document.getElementById('pod-hostname');
    const appVersionEl = document.getElementById('app-version');
    const dbStatusTextEl = document.getElementById('db-status-text');
    const btnVisit = document.getElementById('btn-visit');
    const btnRefresh = document.getElementById('btn-refresh');
    const logsBody = document.getElementById('logs-body');

    let previousCount = null;

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

    // Main fetch function
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
            // Add loading states
            btnRefresh.disabled = true;
            btnVisit.disabled = true;

            const response = await fetch(url, options);
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
                    // Check if this is the newest registered visit
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

            previousCount = data.visit_count;

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
            // Restore button actions
            btnRefresh.disabled = false;
            btnVisit.disabled = false;
        }
    }

    // Event Listeners
    btnVisit.addEventListener('click', () => updateDashboard(true));
    btnRefresh.addEventListener('click', () => updateDashboard(false));

    // Initial load: Register the visit automatically on load
    updateDashboard(true);
});
