# Elite Adventures Belize - E2E Tests

Comprehensive Playwright test suite for the Elite Adventures Belize lead capture application.

## Setup

```bash
cd tests
npm install
npm run setup  # Install Playwright browsers
```

## Environment Variables

Create a `.env` file in the tests directory (optional):

```env
BASE_URL=https://diveelitebelize.com
API_URL=https://cl0mwk78pj.execute-api.us-east-2.amazonaws.com
ADMIN_PASSWORD=your-admin-password
ADMIN_NEW_PASSWORD=your-new-password
```

## Running Tests

```bash
# Run all tests
npm test

# Run with UI mode
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test e2e/01-public-form.spec.js

# Run specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run mobile tests
npm run test:mobile

# Run API tests only
npm run test:api

# Debug mode
npm run test:debug
```

## Test Organization

- `01-public-form.spec.js` - Public lead submission form tests
- `02-admin-auth.spec.js` - Admin authentication and Cognito flow
- `03-admin-dashboard.spec.js` - Admin dashboard and lead management
- `04-sorting.spec.js` - Table sorting functionality
- `05-delete.spec.js` - Multi-select and delete operations
- `06-export.spec.js` - CSV/JSON export functionality
- `07-api.spec.js` - API integration tests

## Test Reports

```bash
# View HTML report
npm run report
```

## Authentication

Admin tests use a saved authentication state to avoid logging in for every test. The first time you run tests, the auth setup will:

1. Navigate to the login page
2. Authenticate with Cognito
3. Save the session to `.auth/admin.json`
4. Reuse this session for subsequent tests

## CI/CD Integration

Tests are configured to work in CI environments:

- Automatic retries on failure
- Screenshots and videos on failure
- JSON and HTML reports
- Parallel execution disabled in CI for stability

## Troubleshooting

### Tests timing out
- Increase timeout in `playwright.config.js`
- Check network connectivity
- Verify API is responding

### Authentication failing
- Delete `.auth/admin.json` and re-run
- Verify admin credentials in environment variables
- Check Cognito callback URLs

### Flaky tests
- Use `test.retry()` for specific tests
- Add appropriate wait times
- Check for race conditions
