# Production Fixes - November 9, 2025

## Summary

Fixed three critical production bugs that were preventing core functionality from working.

---

## Bug #1: DELETE Operations Failing (500 Internal Server Error)

### Symptoms
Every DELETE request to remove leads returned:
```
DELETE https://...amazonaws.com/leads/{id}?conferenceId=default 500 (Internal Server Error)
```

### Root Cause
Lambda IAM role was missing `dynamodb:DeleteItem` permission.

CloudWatch logs showed:
```
AccessDeniedException: User arn:aws:sts::235208472010:assumed-role/elite-adventures-leads-prod-leads-lambda/elite-adventures-leads-prod-leads is not authorized to perform: dynamodb:DeleteItem
```

### Fix Applied
**File**: `/infra/terraform/iam.tf` (line 36)

Added `dynamodb:DeleteItem` to the IAM policy:
```hcl
Action = [
  "dynamodb:PutItem",
  "dynamodb:GetItem",
  "dynamodb:UpdateItem",
  "dynamodb:DeleteItem",  // ← ADDED
  "dynamodb:Query",
  "dynamodb:Scan"
]
```

**Deployment**:
```bash
cd /Users/tomgibson/source/Divecon/infra/terraform
terraform apply -auto-approve
```

**Status**: ✅ FIXED - DELETE operations now work in production

---

## Bug #2: POST Operations Failing (500 Internal Server Error)

### Symptoms
After deploying the DELETE fix, all POST requests to create leads started failing:
```
POST https://...amazonaws.com/leads 500 (Internal Server Error)
```

CloudWatch logs showed:
```
Runtime.ImportModuleError: Error: Cannot find module 'ulid'
```

### Root Cause
Terraform configuration excluded `node_modules` from Lambda deployment packages.

**File**: `/infra/terraform/lambdas.tf` (lines 5, 12, 19)
```hcl
excludes = ["*.zip", "node_modules"]  // ← PROBLEM: excludes dependencies
```

When Terraform redeployed the Lambda for the IAM fix, it packaged the code without dependencies.

### Fix Applied
**File**: `/infra/terraform/lambdas.tf`

Removed `node_modules` from excludes for all Lambda functions:
```hcl
# Before:
excludes = ["*.zip", "node_modules"]

# After:
excludes = ["*.zip"]
```

**Deployment**:
```bash
cd /Users/tomgibson/source/Divecon/infra/terraform
terraform apply -auto-approve
```

**Verification**:
```bash
curl -X POST https://...amazonaws.com/leads -d '{...}'
# Response: {"success":true,"leadId":"01K9NHHGGEP4A9RXQT8ZEG6SKP"}
```

**Status**: ✅ FIXED - POST operations now work in production

---

## Bug #3: Service Worker Cache Error for DELETE Requests

### Symptoms
Browser console showed:
```
Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache': Request method 'DELETE' is unsupported
    at sw.js:52:21
```

### Root Cause
Service worker was attempting to cache all successful HTTP responses, including DELETE requests. The Cache API only supports caching GET and HEAD methods.

**File**: `/app/public/sw.js` (line 52)
```javascript
// Before: Attempted to cache all 200 responses
if (response.status === 200) {
  cache.put(event.request, responseToCache);
}
```

### Fix Applied
**File**: `/app/public/sw.js` (line 52)

Added method check to only cache GET requests:
```javascript
// After: Only cache GET requests
if (event.request.method === 'GET' && response.status === 200) {
  cache.put(event.request, responseToCache);
}
```

**Deployment**:
```bash
cd /Users/tomgibson/source/Divecon/app
npm run build
aws s3 sync public/ s3://elite-adventures-leads-prod-site/ --delete
aws cloudfront create-invalidation --distribution-id E24GN2PC57IREK --paths "/*"
```

**Status**: ✅ FIXED - Service worker no longer throws errors

---

## Verification

All core functionality now working in production at https://diveelitebelize.com:

✅ **Public Form**
- Users can submit new leads via the public form
- POST /leads endpoint returns 200 with leadId

✅ **Admin Dashboard**
- Admins can view all leads
- GET /leads endpoint returns lead data

✅ **Delete Functionality**
- Admins can delete leads from dashboard
- DELETE /leads/{id} endpoint returns 200

✅ **Service Worker**
- No console errors
- Only caches appropriate GET requests
- DELETE/POST/PATCH requests not cached

---

## Files Modified

1. `/infra/terraform/iam.tf` - Added DeleteItem permission
2. `/infra/terraform/lambdas.tf` - Removed node_modules from excludes
3. `/app/public/sw.js` - Added GET method check for caching
4. `/tests/DELETE_ERROR_ANALYSIS.md` - Updated with fix details

---

## Deployment Timeline

- **19:39 UTC** - Initial DELETE fix deployed (IAM permission)
- **20:05 UTC** - Lambda redeployed (introduced POST bug due to missing dependencies)
- **20:07 UTC** - POST fix deployed (included node_modules)
- **20:11 UTC** - Service worker fix deployed (cache method check)

All fixes verified and operational.
