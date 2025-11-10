// Configuration - will be injected during deployment
const CONFIG = {
  API_URL: window.CONFIG?.API_URL || 'https://api.example.com',
  COGNITO_POOL_ID: window.CONFIG?.COGNITO_POOL_ID || '',
  COGNITO_CLIENT_ID: window.CONFIG?.COGNITO_CLIENT_ID || '',
  COGNITO_DOMAIN: window.CONFIG?.COGNITO_DOMAIN || '',
  AWS_REGION: window.CONFIG?.AWS_REGION || 'us-east-1'
};

// State management
let state = {
  conferenceId: null,
  formData: {},
  isOffline: !navigator.onLine,
  isAdmin: false,
  authToken: null,
  leads: [],
  filters: {},
  sortField: 'CreatedAt',
  sortDirection: 'desc',
  selectedLeads: new Set()
};

// Initialize app
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Get conference ID from URL
  const params = new URLSearchParams(window.location.search);
  state.conferenceId = params.get('conference') || params.get('conf');

  // Check if admin route
  if (window.location.hash === '#admin') {
    initAdmin();
  } else {
    initPublicForm();
  }

  // Offline/online detection
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Hash change detection for admin login
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
      initAdmin();
    } else {
      initPublicForm();
    }
  });
}

// ==================== PUBLIC FORM ====================

function initPublicForm() {
  const app = document.getElementById('app');
  app.innerHTML = renderPublicForm();

  // Load saved form data
  loadFormData();

  // Event listeners
  document.getElementById('lead-form').addEventListener('submit', handleSubmit);
  document.getElementById('lead-form').addEventListener('input', handleFormInput);
}

function renderPublicForm() {
  return `
    <div class="container">
      <div class="header">
        <img src="/logo.avif" alt="Elite Adventures Belize" class="header-logo" />
        <h1>Elite Adventures Belize</h1>
        <p>Connect with us for unforgettable Belize adventures</p>
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
          <a href="https://eliteadventuresbelize.com" target="_blank" rel="noopener">Visit our website →</a>
          <a href="/menu.html" target="_blank" rel="noopener" style="background: #fff; color: #667eea; padding: 8px 16px; border-radius: 20px; font-weight: 600;">View Pricing Menu 💰</a>
        </div>
      </div>

      <form id="lead-form">
        <div class="form-group">
          <label>First Name <span class="required">*</span></label>
          <input type="text" name="firstName" required maxlength="100" autocomplete="given-name">
        </div>

        <div class="form-group">
          <label>Last Name <span class="required">*</span></label>
          <input type="text" name="lastName" required maxlength="100" autocomplete="family-name">
        </div>

        <div class="form-group">
          <label>Email <span class="required">*</span></label>
          <input type="email" name="email" required maxlength="256" autocomplete="email">
          <div class="error" id="error-email"></div>
        </div>

        <div class="form-group">
          <label>Phone (optional)</label>
          <input type="tel" name="phone" placeholder="+1234567890" maxlength="20" autocomplete="tel">
          <div class="error" id="error-phone"></div>
        </div>

        <div class="form-group">
          <label>Company <span class="required">*</span></label>
          <input type="text" name="company" required maxlength="200" autocomplete="organization">
        </div>

        <div class="form-group">
          <label>Role/Title (optional)</label>
          <input type="text" name="role" maxlength="100" autocomplete="organization-title">
        </div>

        <div class="form-group">
          <label>Business Type (optional)</label>
          <select name="businessType">
            <option value="">Select...</option>
            <option value="travel-agency">Travel Agency</option>
            <option value="tour-operator">Tour Operator</option>
            <option value="dmc">DMC (Destination Management)</option>
            <option value="hotel-resort">Hotel/Resort</option>
            <option value="corporate">Corporate</option>
            <option value="event-planner">Event Planner</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label>Interests (select all that apply)</label>
          <div class="interests-grid">
            <label><input type="checkbox" name="interests" value="diving"> Diving</label>
            <label><input type="checkbox" name="interests" value="snorkeling"> Snorkeling</label>
            <label><input type="checkbox" name="interests" value="adventure"> Adventure</label>
            <label><input type="checkbox" name="interests" value="eco-tours"> Eco Tours</label>
            <label><input type="checkbox" name="interests" value="cultural"> Cultural</label>
            <label><input type="checkbox" name="interests" value="luxury"> Luxury</label>
            <label><input type="checkbox" name="interests" value="groups"> Groups</label>
            <label><input type="checkbox" name="interests" value="weddings"> Weddings</label>
          </div>
        </div>

        <div class="form-group">
          <label>Preferred Trip Window (optional)</label>
          <select name="tripWindow">
            <option value="">Select...</option>
            <option value="next-3-months">Next 3 Months</option>
            <option value="3-6-months">3-6 Months</option>
            <option value="6-12-months">6-12 Months</option>
            <option value="12+ -months">12+ Months</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>

        <div class="form-group">
          <label>Estimated Group Size (optional)</label>
          <input type="number" name="groupSize" min="0" max="10000">
        </div>

        <div class="form-group">
          <label>Additional Notes (optional)</label>
          <textarea name="notes" rows="4" maxlength="1000"></textarea>
        </div>

        <!-- Honeypot fields (hidden) -->
        <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
        <input type="text" name="url" style="display:none" tabindex="-1" autocomplete="off">

        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" name="consentContact" id="consent-contact" required>
            <label for="consent-contact">
              I consent to be contacted about Elite Adventures Belize services <span class="required">*</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" name="consentMarketing" id="consent-marketing">
            <label for="consent-marketing">
              I would like to receive marketing materials and updates
            </label>
          </div>
        </div>

        <button type="submit" class="btn" id="submit-btn">Submit</button>
      </form>

      <div id="admin-login">
        <a href="#admin">Admin Login</a>
      </div>
    </div>
  `;
}

function loadFormData() {
  try {
    const saved = localStorage.getItem('leadFormData');
    if (saved) {
      state.formData = JSON.parse(saved);
      const form = document.getElementById('lead-form');

      Object.keys(state.formData).forEach(key => {
        const element = form.elements[key];
        if (element) {
          if (element.type === 'checkbox' && key !== 'interests') {
            element.checked = state.formData[key];
          } else if (key === 'interests') {
            state.formData[key].forEach(value => {
              const checkbox = form.querySelector(`input[name="interests"][value="${value}"]`);
              if (checkbox) checkbox.checked = true;
            });
          } else {
            element.value = state.formData[key];
          }
        }
      });
    }
  } catch (err) {
    console.error('Error loading form data:', err);
  }
}

function handleFormInput(e) {
  const form = e.target.form;
  const formData = new FormData(form);
  const data = {};

  for (let [key, value] of formData.entries()) {
    if (key === 'interests') {
      data[key] = data[key] || [];
      data[key].push(value);
    } else if (form.elements[key]?.type === 'checkbox') {
      data[key] = form.elements[key].checked;
    } else {
      data[key] = value;
    }
  }

  state.formData = data;
  localStorage.setItem('leadFormData', JSON.stringify(data));
}

async function handleSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  // Clear previous errors
  document.querySelectorAll('.error').forEach(el => el.textContent = '');

  const formData = new FormData(form);
  const data = {
    conferenceId: state.conferenceId || 'default',
    utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
    utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
    utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || ''
  };

  for (let [key, value] of formData.entries()) {
    if (key === 'interests') {
      data[key] = data[key] || [];
      data[key].push(value);
    } else if (form.elements[key]?.type === 'checkbox') {
      data[key] = form.elements[key].checked;
    } else if (key === 'groupSize') {
      data[key] = parseInt(value) || 0;
    } else {
      data[key] = value;
    }
  }

  try {
    const response = await fetch(`${CONFIG.API_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Submission failed');
    }

    const result = await response.json();

    // Clear form and localStorage
    form.reset();
    localStorage.removeItem('leadFormData');
    state.formData = {};

    // Show success
    showSuccess(result.leadId);
  } catch (error) {
    console.error('Submit error:', error);

    if (!navigator.onLine) {
      // Queue for later
      await queueSubmission(data);
      showSuccess(null, true);
    } else {
      alert(`Error: ${error.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  }
}

async function queueSubmission(data) {
  try {
    const db = await openDB();
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    await store.add({
      url: `${CONFIG.API_URL}/leads`,
      data: data,
      timestamp: Date.now()
    });

    // Request background sync
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('lead-submissions');
    }
  } catch (err) {
    console.error('Error queuing submission:', err);
  }
}

function showSuccess(leadId, offline = false) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      <div class="success-screen">
        <div class="icon">✅</div>
        <h2>Thank You!</h2>
        <p>Your information has been ${offline ? 'saved and will be submitted when you\'re online' : 'submitted successfully'}.</p>
        ${leadId ? `<p><small>Reference ID: ${leadId}</small></p>` : ''}
        <p>A representative from Elite Adventures Belize will contact you soon.</p>
        <button class="btn" onclick="window.location.href='/'">Submit Another</button>
        ${leadId ? `<button class="btn btn-secondary" onclick="downloadICS('${leadId}')">📅 Add to Calendar</button>` : ''}
      </div>
    </div>
  `;
}

window.downloadICS = function(leadId) {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Elite Adventures Belize//Lead Capture//EN
BEGIN:VEVENT
UID:${leadId}@eliteadventuresbelize.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}
SUMMARY:Follow-up: Elite Adventures Belize
DESCRIPTION:Follow-up regarding your interest in Elite Adventures Belize
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'elite-adventures-followup.ics';
  a.click();
  URL.revokeObjectURL(url);
};

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// ==================== ADMIN INTERFACE ====================

function initAdmin() {
  // Check if already authenticated
  const token = sessionStorage.getItem('authToken');
  if (token) {
    state.authToken = token;
    state.isAdmin = true;
    renderAdminDashboard();
  } else {
    renderAdminLogin();
  }
}

function renderAdminLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Admin Login</h1>
        <p>Elite Adventures Belize - Lead Management</p>
      </div>

      <div style="max-width: 400px; margin: 2rem auto; text-align: center;">
        <p style="margin-bottom: 1.5rem;">Sign in with your Cognito credentials</p>
        <button class="btn" onclick="loginWithCognito()">Sign In with Cognito</button>
        <button class="btn btn-secondary" onclick="window.location.href='/'">Back to Form</button>
      </div>
    </div>
  `;
}

window.loginWithCognito = function() {
  // Store that we want to go to admin after login
  sessionStorage.setItem('pendingAdminLogin', 'true');
  const redirectUri = encodeURIComponent(window.location.origin + '/');
  const loginUrl = `${CONFIG.COGNITO_DOMAIN}/login?client_id=${CONFIG.COGNITO_CLIENT_ID}&response_type=token&scope=email+openid+profile&redirect_uri=${redirectUri}`;
  window.location.href = loginUrl;
};

// Parse token from URL hash (OAuth implicit flow)
if (window.location.hash.includes('id_token=')) {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const idToken = params.get('id_token');
  if (idToken) {
    sessionStorage.setItem('authToken', idToken);
    state.authToken = idToken;
    state.isAdmin = true;
    // Clear the pending admin login flag
    sessionStorage.removeItem('pendingAdminLogin');
    // Redirect to admin
    window.location.href = window.location.origin + '/#admin';
  }
}

// Check if we have a pending admin login (coming back from Cognito)
if (sessionStorage.getItem('pendingAdminLogin') === 'true' && sessionStorage.getItem('authToken')) {
  sessionStorage.removeItem('pendingAdminLogin');
  window.location.hash = '#admin';
}

async function renderAdminDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container" style="max-width: 1400px;">
      <div class="header">
        <h1>Lead Management</h1>
        <p>Elite Adventures Belize - Admin Dashboard</p>
      </div>

      <div style="margin-bottom: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
        <button class="btn" style="flex: 1; min-width: 120px;" onclick="loadLeads()">Refresh</button>
        <button class="btn" style="flex: 1; min-width: 120px;" onclick="exportLeads('csv')">Export CSV</button>
        <button class="btn" style="flex: 1; min-width: 120px;" onclick="exportLeads('json')">Export JSON</button>
        <button class="btn" style="flex: 1; min-width: 120px; background: #dc3545;" onclick="deleteSelected()" id="delete-btn" disabled>Delete Selected</button>
        <button class="btn btn-secondary" style="flex: 1; min-width: 120px;" onclick="logout()">Logout</button>
      </div>

      <div id="leads-container">
        <p style="text-align: center; padding: 2rem;">Loading leads...</p>
      </div>
    </div>
  `;

  await loadLeads();
}

window.loadLeads = async function() {
  try {
    const response = await fetch(`${CONFIG.API_URL}/leads`, {
      headers: {
        'Authorization': `Bearer ${state.authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load leads');
    }

    const data = await response.json();
    state.leads = data.leads || [];

    renderLeadsTable();
  } catch (error) {
    console.error('Error loading leads:', error);
    document.getElementById('leads-container').innerHTML = `
      <div class="alert alert-error">Error loading leads: ${error.message}</div>
    `;
  }
};

function renderLeadsTable() {
  const container = document.getElementById('leads-container');

  if (state.leads.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">No leads found.</p>';
    return;
  }

  // Sort leads
  const sortedLeads = [...state.leads].sort((a, b) => {
    let aVal = a[state.sortField];
    let bVal = b[state.sortField];

    // Handle dates
    if (state.sortField === 'CreatedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle strings
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (state.sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const sortIcon = (field) => {
    if (state.sortField !== field) return '↕';
    return state.sortDirection === 'asc' ? '↑' : '↓';
  };

  const table = `
    <div style="margin-bottom: 1rem; color: #666;">
      ${state.leads.length} lead${state.leads.length !== 1 ? 's' : ''}
      ${state.selectedLeads.size > 0 ? `| ${state.selectedLeads.size} selected` : ''}
    </div>
    <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: var(--shadow);">
      <thead>
        <tr style="background: var(--primary-color); color: white;">
          <th style="padding: 0.75rem; text-align: center; width: 40px;">
            <input type="checkbox" id="select-all" onchange="toggleSelectAll()" style="cursor: pointer;">
          </th>
          <th style="padding: 0.75rem; text-align: left; cursor: pointer;" onclick="sortBy('CreatedAt')">
            Date ${sortIcon('CreatedAt')}
          </th>
          <th style="padding: 0.75rem; text-align: left; cursor: pointer;" onclick="sortBy('FirstName')">
            Name ${sortIcon('FirstName')}
          </th>
          <th style="padding: 0.75rem; text-align: left; cursor: pointer;" onclick="sortBy('Email')">
            Email ${sortIcon('Email')}
          </th>
          <th style="padding: 0.75rem; text-align: left; cursor: pointer;" onclick="sortBy('Company')">
            Company ${sortIcon('Company')}
          </th>
          <th style="padding: 0.75rem; text-align: left; cursor: pointer;" onclick="sortBy('Status')">
            Status ${sortIcon('Status')}
          </th>
          <th style="padding: 0.75rem; text-align: center;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sortedLeads.map(lead => {
          const leadKey = `${lead.LeadID}-${lead.ConferenceID}`;
          return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem; text-align: center;">
              <input type="checkbox" class="lead-checkbox" data-lead-id="${leadKey}"
                ${state.selectedLeads.has(leadKey) ? 'checked' : ''}
                onchange="toggleLeadSelection('${leadKey}')" style="cursor: pointer;">
            </td>
            <td style="padding: 0.75rem;">${new Date(lead.CreatedAt).toLocaleDateString()}</td>
            <td style="padding: 0.75rem;">${lead.FirstName || ''} ${lead.LastName || ''}</td>
            <td style="padding: 0.75rem;"><a href="mailto:${lead.Email}">${lead.Email}</a></td>
            <td style="padding: 0.75rem;">${lead.Company || '-'}</td>
            <td style="padding: 0.75rem;">
              <span style="padding: 0.25rem 0.5rem; background: ${getStatusColor(lead.Status)}; color: white; border-radius: 3px; font-size: 0.85rem;">
                ${lead.Status || 'new'}
              </span>
            </td>
            <td style="padding: 0.75rem; text-align: center;">
              <button onclick="viewLead('${lead.LeadID}', '${lead.ConferenceID}')" style="padding: 0.25rem 0.75rem; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer;">View</button>
            </td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = table;
}

function getStatusColor(status) {
  const colors = {
    'new': '#6c757d',
    'contacted': '#007bff',
    'qualified': '#28a745',
    'disqualified': '#dc3545'
  };
  return colors[status] || colors['new'];
}

window.sortBy = function(field) {
  if (state.sortField === field) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortField = field;
    state.sortDirection = 'asc';
  }
  renderLeadsTable();
};

window.toggleSelectAll = function() {
  const checked = document.getElementById('select-all').checked;
  state.selectedLeads.clear();

  if (checked) {
    state.leads.forEach(lead => {
      state.selectedLeads.add(`${lead.LeadID}-${lead.ConferenceID}`);
    });
  }

  renderLeadsTable();
  updateDeleteButton();
};

window.toggleLeadSelection = function(leadKey) {
  if (state.selectedLeads.has(leadKey)) {
    state.selectedLeads.delete(leadKey);
  } else {
    state.selectedLeads.add(leadKey);
  }
  updateDeleteButton();
  // Update the counter
  const counterDiv = document.querySelector('#leads-container > div');
  if (counterDiv) {
    counterDiv.textContent = `${state.leads.length} lead${state.leads.length !== 1 ? 's' : ''}${state.selectedLeads.size > 0 ? ` | ${state.selectedLeads.size} selected` : ''}`;
  }
};

function updateDeleteButton() {
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.disabled = state.selectedLeads.size === 0;
  }
}

window.deleteSelected = async function() {
  if (state.selectedLeads.size === 0) return;

  const count = state.selectedLeads.size;
  if (!confirm(`Are you sure you want to delete ${count} lead${count !== 1 ? 's' : ''}? This action cannot be undone.`)) {
    return;
  }

  try {
    const leadKeys = Array.from(state.selectedLeads);
    const BATCH_SIZE = 5; // Process 5 deletes at a time to avoid Lambda throttling
    let allResults = [];

    // Process in batches
    for (let i = 0; i < leadKeys.length; i += BATCH_SIZE) {
      const batch = leadKeys.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (leadKey) => {
        // Split leadKey correctly: LeadID doesn't contain dashes, but ConferenceID can
        const dashIndex = leadKey.indexOf('-');
        const leadId = leadKey.substring(0, dashIndex);
        const conferenceId = leadKey.substring(dashIndex + 1);

        try {
          const response = await fetch(`${CONFIG.API_URL}/leads/${leadId}?conferenceId=${conferenceId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${state.authToken}`
            }
          });

          if (!response.ok) {
            return { success: false, leadId, error: `HTTP ${response.status}` };
          }
          return { success: true, leadId };
        } catch (error) {
          return { success: false, leadId, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      allResults = allResults.concat(batchResults);

      // Small delay between batches to be gentle on the API
      if (i + BATCH_SIZE < leadKeys.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Count successes and failures
    const successful = allResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = allResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    // Clear selections and reload
    state.selectedLeads.clear();
    await loadLeads();

    if (failed === 0) {
      alert(`Successfully deleted ${successful} lead${successful !== 1 ? 's' : ''}`);
    } else {
      alert(`Deleted ${successful} lead${successful !== 1 ? 's' : ''}, ${failed} failed`);
    }
  } catch (error) {
    console.error('Error deleting leads:', error);
    alert(`Error deleting leads: ${error.message}`);
  }
};

window.viewLead = async function(leadId, conferenceId) {
  try {
    const response = await fetch(`${CONFIG.API_URL}/leads/${leadId}?conferenceId=${conferenceId}`, {
      headers: {
        'Authorization': `Bearer ${state.authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load lead details');
    }

    const lead = await response.json();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'lead-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;';

    modal.innerHTML = `
      <div style="background: white; border-radius: 8px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; color: var(--primary-color);">Lead Details</h2>
          <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
        </div>
        <div style="padding: 1.5rem;">
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">Contact Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Name:</td><td>${lead.FirstName || ''} ${lead.LastName || ''}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Email:</td><td><a href="mailto:${lead.Email}">${lead.Email}</a></td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Phone:</td><td>${lead.Phone || 'N/A'}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Company:</td><td>${lead.Company || 'N/A'}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Role:</td><td>${lead.Role || 'N/A'}</td></tr>
            </table>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">Trip Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Business Type:</td><td>${lead.BusinessType || 'N/A'}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Interests:</td><td>${Array.isArray(lead.Interests) ? lead.Interests.join(', ') : 'N/A'}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Trip Window:</td><td>${lead.TripWindow || 'N/A'}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Group Size:</td><td>${lead.GroupSize || 'N/A'}</td></tr>
            </table>
          </div>

          ${lead.Notes ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">Notes</h3>
            <p style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin: 0;">${lead.Notes}</p>
          </div>
          ` : ''}

          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">Metadata</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Lead ID:</td><td>${lead.LeadID}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Conference:</td><td>${lead.ConferenceID}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Created:</td><td>${new Date(lead.CreatedAt).toLocaleString()}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Status:</td><td><span style="padding: 0.25rem 0.5rem; background: ${getStatusColor(lead.Status)}; color: white; border-radius: 3px; font-size: 0.85rem;">${lead.Status || 'new'}</span></td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Marketing Consent:</td><td>${lead.ConsentMarketing ? 'Yes' : 'No'}</td></tr>
              <tr><td style="padding: 0.5rem 0; font-weight: bold;">Contact Consent:</td><td>${lead.ConsentContact ? 'Yes' : 'No'}</td></tr>
            </table>
          </div>

          ${lead.UTM?.source || lead.UTM?.medium || lead.UTM?.campaign ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">UTM Parameters</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${lead.UTM?.source ? `<tr><td style="padding: 0.5rem 0; font-weight: bold;">Source:</td><td>${lead.UTM.source}</td></tr>` : ''}
              ${lead.UTM?.medium ? `<tr><td style="padding: 0.5rem 0; font-weight: bold;">Medium:</td><td>${lead.UTM.medium}</td></tr>` : ''}
              ${lead.UTM?.campaign ? `<tr><td style="padding: 0.5rem 0; font-weight: bold;">Campaign:</td><td>${lead.UTM.campaign}</td></tr>` : ''}
            </table>
          </div>
          ` : ''}
        </div>
        <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
          <button onclick="closeModal()" class="btn" style="min-width: 100px;">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  } catch (error) {
    console.error('Error viewing lead:', error);
    alert(`Error loading lead details: ${error.message}`);
  }
};

window.closeModal = function() {
  const modal = document.getElementById('lead-modal');
  if (modal) {
    modal.remove();
  }
};

window.exportLeads = async function(format) {
  try {
    const response = await fetch(`${CONFIG.API_URL}/export`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        format: format,
        filters: state.filters
      })
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const data = await response.json();
    window.open(data.downloadUrl, '_blank');
  } catch (error) {
    console.error('Export error:', error);
    alert(`Export failed: ${error.message}`);
  }
};

window.logout = function() {
  sessionStorage.removeItem('authToken');
  state.authToken = null;
  state.isAdmin = false;
  window.location.href = '/';
};

// ==================== UTILITIES ====================

function handleOnline() {
  state.isOffline = false;
  document.getElementById('offline-indicator').classList.remove('show');
}

function handleOffline() {
  state.isOffline = true;
  document.getElementById('offline-indicator').classList.add('show');
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LeadCaptureDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
