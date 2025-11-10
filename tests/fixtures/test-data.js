/**
 * Test data fixtures for Elite Adventures Belize tests
 */

// Valid test lead data
export const validLead = {
  conferenceId: 'playwright-test-conf',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+15551234567',
  company: 'Acme Corp',
  role: 'CEO',
  businessType: 'travel-agency',
  interests: ['diving', 'snorkeling'],
  tripWindow: 'next-3-months',
  groupSize: 10,
  notes: 'Looking for a corporate retreat',
  consentContact: true,
  consentMarketing: true
};

// Invalid test data for validation tests
export const invalidLeads = {
  missingFirstName: {
    ...validLead,
    firstName: ''
  },
  missingLastName: {
    ...validLead,
    lastName: ''
  },
  invalidEmail: {
    ...validLead,
    email: 'not-an-email'
  },
  missingCompany: {
    ...validLead,
    company: ''
  },
  noConsent: {
    ...validLead,
    consentContact: false
  }
};

// Admin credentials (from Terraform output)
export const adminCredentials = {
  username: 'admin@eliteadventuresbelize.com',
  // This will be read from environment variable in CI
  password: process.env.ADMIN_PASSWORD || 'SN!V*!_amih0FynI',
  // New password for after first login
  newPassword: process.env.ADMIN_NEW_PASSWORD || 'NewSecureP@ssw0rd123!'
};

// Test conference data
export const testConference = {
  id: 'test-conference-2024',
  name: 'Belize Dive Expo 2024',
  description: 'Annual diving conference in Belize'
};

// API endpoints
export const apiEndpoints = {
  leads: '/leads',
  export: '/export',
  conference: '/conference'
};

// Selectors (CSS selectors for common elements)
export const selectors = {
  // Public form
  publicForm: {
    firstName: 'input[name="firstName"]',
    lastName: 'input[name="lastName"]',
    email: 'input[name="email"]',
    phone: 'input[name="phone"]',
    company: 'input[name="company"]',
    role: 'input[name="role"]',
    businessType: 'select[name="businessType"]',
    tripWindow: 'select[name="tripWindow"]',
    groupSize: 'input[name="groupSize"]',
    notes: 'textarea[name="notes"]',
    consentContact: 'input[name="consentContact"]',
    consentMarketing: 'input[name="consentMarketing"]',
    submitButton: '#submit-btn',
    successMessage: 'text=Thank You!'
  },

  // Admin dashboard
  admin: {
    loginButton: 'text=Admin Login',
    cognitoUsername: 'input[name="username"]',
    cognitoPassword: 'input[name="password"]',
    cognitoSignIn: 'input[type="submit"]',
    refreshButton: 'text=Refresh',
    exportCsvButton: 'text=Export CSV',
    exportJsonButton: 'text=Export JSON',
    deleteButton: '#delete-btn',
    logoutButton: 'text=Logout',
    selectAllCheckbox: '#select-all',
    leadsTable: 'table',
    leadRow: 'tbody tr',
    viewButton: 'text=View',
    modal: '#lead-modal',
    closeModalButton: 'button:has-text("Close")'
  },

  // Table headers (for sorting)
  tableHeaders: {
    date: 'th:has-text("Date")',
    name: 'th:has-text("Name")',
    email: 'th:has-text("Email")',
    company: 'th:has-text("Company")',
    status: 'th:has-text("Status")'
  }
};

// Wait times (in milliseconds)
export const waitTimes = {
  short: 1000,
  medium: 3000,
  long: 5000,
  apiResponse: 10000,
  cognitoRedirect: 15000
};
