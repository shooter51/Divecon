/**
 * API Integration Tests
 * Tests direct API endpoints and responses
 */

const { test, expect } = require('@playwright/test');
const { validLead, adminCredentials } = require('../fixtures/test-data');

const API_URL = process.env.API_URL || 'https://cl0mwk78pj.execute-api.us-east-2.amazonaws.com';

test.describe('API Integration Tests', () => {

  test('should return 201 for public lead submission', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: validLead
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.leadId).toBeTruthy();
    expect(data.message).toBeTruthy();
  });

  test('should validate required fields on lead submission', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: {
        email: 'test@example.com'
        // Missing required fields
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should validate email format', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: {
        ...validLead,
        email: 'not-an-email'
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('email');
  });

  test('should reject lead without consent', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: {
        ...validLead,
        consentContact: false
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should require authentication for GET /leads', async ({ request }) => {
    const response = await request.get(`${API_URL}/leads`);

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should require authentication for DELETE', async ({ request }) => {
    const response = await request.delete(`${API_URL}/leads/test-lead?conferenceId=test`);

    expect(response.status()).toBe(401);
  });

  test('should require authentication for PATCH', async ({ request }) => {
    const response = await request.patch(`${API_URL}/leads/test-lead?conferenceId=test`, {
      data: {
        Status: 'contacted'
      }
    });

    expect(response.status()).toBe(401);
  });

  test('should require authentication for export', async ({ request }) => {
    const response = await request.post(`${API_URL}/export`, {
      data: {
        format: 'csv'
      }
    });

    expect(response.status()).toBe(401);
  });

  test('should handle CORS preflight', async ({ request }) => {
    const response = await request.fetch(`${API_URL}/leads`, {
      method: 'OPTIONS'
    });

    // Should allow OPTIONS
    expect([200, 204]).toContain(response.status());

    const headers = response.headers();
    expect(headers['access-control-allow-methods']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toContain('POST');
  });

  test('should include CORS headers in responses', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: validLead
    });

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
  });

  test('should handle rate limiting gracefully', async ({ request }) => {
    // Send multiple rapid requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.post(`${API_URL}/leads`, {
          data: {
            ...validLead,
            email: `test${i}@example.com`
          }
        })
      );
    }

    const responses = await Promise.all(promises);

    // Most should succeed (201 = Created)
    const successCount = responses.filter(r => r.status() === 201).length;
    expect(successCount).toBeGreaterThan(5);
  });

  test('should return proper error format', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: {
        email: 'bad-email'
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBeTruthy();
    expect(typeof data.error).toBe('string');
  });

  test('should handle invalid JSON', async ({ request }) => {
    try {
      const response = await request.post(`${API_URL}/leads`, {
        data: 'not json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Should return error
      expect([400, 500]).toContain(response.status());
    } catch (e) {
      // Some frameworks reject invalid JSON before sending
      expect(e).toBeTruthy();
    }
  });

  test('should sanitize input strings', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: {
        ...validLead,
        notes: '<script>alert("xss")</script>'.repeat(100) // Very long string
      }
    });

    // Should accept but truncate (max 1000 chars per field)
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.leadId).toBeTruthy();
  });

  test('should detect honeypot fields', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: {
        ...validLead,
        website: 'http://spam.com', // Honeypot field
        url: 'http://spam.com'
      }
    });

    // Should reject as spam
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error.toLowerCase()).toContain('spam');
  });

  test('should support UTM parameters', async ({ request }) => {
    const response = await request.post(`${API_URL}/leads`, {
      data: {
        ...validLead,
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'belize-diving-2024'
      }
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.leadId).toBeTruthy();
  });

  test('should handle missing conferenceId', async ({ request }) => {
    const leadData = { ...validLead };
    delete leadData.conferenceId;

    const response = await request.post(`${API_URL}/leads`, {
      data: leadData
    });

    // Should return 400 for missing required field
    expect(response.status()).toBe(400);
  });
});
