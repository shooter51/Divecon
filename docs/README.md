# Elite Adventures Belize - Conference Lead Capture System

A production-ready, cost-optimized conference lead capture application with mobile-first PWA, offline support, and admin dashboard.

## 🏗️ Architecture

- **Frontend**: Static HTML/JS PWA hosted on S3 (HTTP static website)
- **Backend**: API Gateway (HTTP API) + AWS Lambda (Node.js 20.x)
- **Data**: DynamoDB (on-demand), S3 (raw data, exports, QR codes)
- **Auth**: Amazon Cognito User Pool (admin interface only)
- **Security**: WAFv2, KMS encryption, least-privilege IAM
- **IaC**: Terraform for complete infrastructure management

### Why HTTP for the static site?

The static site is served via S3 static website hosting (HTTP-only) to minimize costs. All API calls use HTTPS via API Gateway, ensuring form submissions are encrypted in transit. This is clearly communicated to users via a banner message.

## 📋 Prerequisites

- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials
- **Terraform** >= 1.5.0
- **Node.js** >= 18.x (for building frontend and Lambdas)
- **Bash** shell (macOS, Linux, or WSL on Windows)

## 🚀 Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd Divecon

# Copy environment template
cp .env.sample .env

# Edit .env with your settings
nano .env
```

### 2. Deploy Infrastructure

```bash
# This will:
# - Install dependencies
# - Build the application
# - Deploy Terraform infrastructure
# - Upload frontend to S3
# - Configure everything automatically

./scripts/deploy.sh
```

The deployment takes approximately 5-10 minutes and outputs:
- Website URL (S3 static website endpoint)
- API URL (API Gateway endpoint)
- Cognito configuration (Pool ID, Client ID, Domain)

### 3. Create Sample Data (Optional)

```bash
./scripts/seed.sh
```

This creates a sample conference and 5 test leads.

### 4. Access the Application

**Public Form:**
```
http://<bucket-name>.s3-website-<region>.amazonaws.com
http://<bucket-name>.s3-website-<region>.amazonaws.com/?conference=<conference-id>
```

**Admin Interface:**
```
http://<bucket-name>.s3-website-<region>.amazonaws.com/#admin
```

## 🔐 Authentication & Users

### Creating Admin Users

Admin users must be created in Cognito:

**Option 1: Via AWS Console**
1. Go to Amazon Cognito → User Pools
2. Select your user pool: `elite-adventures-leads-prod-admin`
3. Click "Create user"
4. Add user to the "Admin" group

**Option 2: Via AWS CLI**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id <POOL_ID> \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-add-user-to-group \
  --user-pool-id <POOL_ID> \
  --username admin@example.com \
  --group-name Admin
```

**Option 3: Automated (during Terraform deployment)**
Set the `admin_email` variable in `infra/terraform/terraform.tfvars`:
```hcl
admin_email = "admin@yourdomain.com"
```

The temporary password will be displayed after deployment (marked as sensitive).

### User Groups

- **Admin**: Full access to all leads, export, and conference management
- **Staff**: Read-only access to leads (not yet implemented in Lambda logic)

## 📊 Features

### Public Form (PWA)
- ✅ Mobile-first responsive design
- ✅ Offline support with background sync
- ✅ Auto-save as you type (localStorage)
- ✅ Client-side validation
- ✅ Honeypot anti-spam
- ✅ E.164 phone validation
- ✅ Success screen with .ics download
- ✅ UTM parameter capture
- ✅ Conference-specific forms via QR code

### Admin Dashboard
- ✅ Cognito authentication (OAuth 2.0 implicit flow)
- ✅ Lead listing with pagination
- ✅ Lead detail view
- ✅ Lead status management (new/contacted/qualified/disqualified)
- ✅ Tags and admin notes
- ✅ Export to CSV/JSON
- ✅ Filter by conference, date, status, business type
- ✅ Real-time updates

### Backend APIs
- ✅ POST /leads - Submit lead (public)
- ✅ GET /leads - List leads with filters (admin)
- ✅ GET /leads/{id} - Get lead details (admin)
- ✅ PATCH /leads/{id} - Update lead (admin)
- ✅ POST /export - Export leads to S3 (admin)
- ✅ GET /conference/{id} - Get conference config (public)
- ✅ POST /conference - Create/update conference (admin)
- ✅ GET /qr/{id} - Generate/retrieve QR code (public)

### Security Features
- ✅ WAFv2 with AWS Managed Rules (SQL injection, XSS, known bad inputs)
- ✅ Rate limiting (100 requests per 5 minutes per IP)
- ✅ KMS encryption for S3 and DynamoDB
- ✅ Least-privilege IAM roles
- ✅ JWT authentication for admin endpoints
- ✅ CORS configuration
- ✅ Input validation and sanitization

## 📁 Project Structure

```
.
├── app/
│   ├── public/                # Static assets
│   │   ├── index.html
│   │   ├── manifest.json
│   │   ├── sw.js             # Service Worker
│   │   └── config.js         # Generated during deployment
│   ├── src/
│   │   └── index.js          # Main application code
│   ├── package.json
│   └── build.js              # Build script
│
├── lambdas/
│   ├── leads/                # Lead management Lambda
│   │   ├── index.js
│   │   └── package.json
│   ├── exports/              # Export Lambda
│   │   ├── index.js
│   │   └── package.json
│   └── conference/           # Conference & QR Lambda
│       ├── index.js
│       └── package.json
│
├── infra/terraform/          # Infrastructure as Code
│   ├── main.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── s3_site.tf           # S3 buckets
│   ├── ddb.tf               # DynamoDB tables
│   ├── cognito.tf           # Authentication
│   ├── iam.tf               # IAM roles & policies
│   ├── lambdas.tf           # Lambda functions
│   ├── apigw.tf             # API Gateway
│   └── waf.tf               # Web Application Firewall
│
├── scripts/
│   ├── deploy.sh            # Main deployment script
│   ├── seed.sh              # Sample data creation
│   └── test-api.sh          # API testing examples
│
├── docs/
│   ├── README.md            # This file
│   └── OPERATIONS.md        # Operations guide
│
├── .env.sample
├── .gitignore
└── README.md
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Project Configuration
PROJECT_NAME=elite-adventures-leads
ENVIRONMENT=prod

# Optional: WAF Configuration
ENABLE_WAF=true

# Optional: Cost Controls
DDB_BILLING_MODE=PAY_PER_REQUEST
S3_LIFECYCLE_GLACIER_DAYS=90
S3_EXPORT_RETENTION_DAYS=365

# Optional: Admin User (created during deployment)
# ADMIN_EMAIL=admin@yourdomain.com
```

### Terraform Variables

You can also create `infra/terraform/terraform.tfvars`:

```hcl
project_name = "elite-adventures-leads"
environment  = "prod"
aws_region   = "us-east-1"

cors_allowed_origins = [
  "http://localhost:3000",
  "http://localhost:8000"
]

enable_waf = true
s3_lifecycle_glacier_days = 90
s3_export_retention_days = 365

admin_email = "admin@yourdomain.com"  # Optional
```

## 🧪 Testing

### Test API Endpoints

```bash
# View all available API test commands
./scripts/test-api.sh

# Test public lead submission
curl -X POST 'https://your-api-url.execute-api.us-east-1.amazonaws.com/leads' \
  -H 'Content-Type: application/json' \
  -d '{
    "conferenceId": "test-conference",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "company": "Example Corp",
    "consentContact": true
  }'
```

### Local Development

```bash
# Build frontend
cd app
npm run build

# Serve locally for testing
npm run dev
# Visit http://localhost:8000
```

## 📦 Data Schema

### DynamoDB - Leads Table

```javascript
{
  "PK": "conference-123#01ARZ3NDEKTSV4RRFFQ69G5FAV",  // Hash key
  "LeadID": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "ConferenceID": "conference-123",  // GSI1 hash key
  "Email": "john@example.com",       // GSI2 hash key
  "CreatedAt": "2024-01-15T10:30:00Z",  // GSI1 & GSI2 range key
  "UpdatedAt": "2024-01-15T10:30:00Z",
  "FirstName": "John",
  "LastName": "Doe",
  "Company": "Example Corp",
  "Role": "CEO",
  "Phone": "+15551234567",
  "BusinessType": "travel-agency",
  "Interests": ["diving", "luxury"],
  "TripWindow": "3-6-months",
  "GroupSize": 20,
  "Notes": "Client notes...",
  "ConsentContact": true,
  "ConsentMarketing": true,
  "Status": "new",  // new|contacted|qualified|disqualified
  "Tags": ["hot-lead", "priority"],
  "AdminNotes": "Admin notes...",
  "UTM": {
    "source": "email",
    "medium": "campaign",
    "campaign": "winter2024"
  },
  "UserAgent": "Mozilla/5.0...",
  "SourceIP": "192.0.2.1"
}
```

### S3 Data Structure

```
s3://elite-adventures-leads-prod-data/
├── raw/                           # Raw lead data (archived)
│   └── 2024/
│       └── 01/
│           └── 15/
│               └── conference-123/
│                   └── 01ARZ3NDEKTSV4RRFFQ69G5FAV.json
├── exports/                       # Generated exports
│   └── 2024/
│       └── 01/
│           └── 15/
│               ├── export-2024-01-15T10-30-00.csv
│               └── export-2024-01-15T10-30-00.json
└── qr/                            # QR codes
    ├── conference-123.png
    └── conference-456.svg
```

## 🌐 CORS Configuration

The application handles CORS for cross-origin requests between the HTTP static site and HTTPS API:

**API Gateway CORS Configuration:**
- Allowed Origins: S3 website endpoint + localhost (for dev)
- Allowed Methods: GET, POST, PATCH, OPTIONS
- Allowed Headers: Content-Type, Authorization, X-Api-Key
- Max Age: 3600 seconds

**S3 Bucket CORS (for QR code access):**
- Allowed Origins: Same as API Gateway
- Allowed Methods: GET, HEAD
- Max Age: 3600 seconds

## 💰 Cost Optimization

### Estimated Monthly Costs (1,000 leads/month)

- **S3 Storage**: ~$0.10
- **DynamoDB (on-demand)**: ~$1-2
- **API Gateway**: ~$3.50 (1M requests)
- **Lambda**: ~$0.20 (under free tier)
- **Cognito**: Free (under 50,000 MAU)
- **WAF**: ~$6 (1 ACL + 5 rules)
- **CloudWatch Logs**: ~$0.50
- **Data Transfer**: ~$0.50

**Total**: ~$12-15/month

### Cost Reduction Tips

1. **Disable WAF in development** (set `enable_waf = false`)
2. **Use lifecycle policies** (already configured)
3. **Reduce CloudWatch log retention** (set to 7 days for dev)
4. **Delete old exports** from S3 regularly

## 🔒 Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate Cognito admin passwords** regularly
3. **Enable MFA** for admin users
4. **Review CloudWatch logs** for suspicious activity
5. **Keep Lambda dependencies** updated
6. **Monitor WAF metrics** for attack patterns
7. **Use least-privilege IAM** (already implemented)
8. **Enable S3 versioning** (already enabled)
9. **Enable DynamoDB PITR** (Point-in-Time Recovery, already enabled)

## 🚨 Troubleshooting

### Deployment Fails

```bash
# Check Terraform state
cd infra/terraform
terraform state list

# Re-run with verbose logging
TF_LOG=DEBUG terraform apply

# Check AWS credentials
aws sts get-caller-identity
```

### CORS Errors in Browser

1. Check API Gateway CORS configuration
2. Verify S3 bucket CORS settings
3. Ensure correct origin is whitelisted
4. Check browser console for specific CORS error

### Authentication Issues

1. Verify Cognito user is in correct group (Admin or Staff)
2. Check JWT token expiration (60 minutes)
3. Ensure correct Cognito domain/client ID in config.js
4. Review CloudWatch logs for authorization errors

### Lambda Timeout/Errors

```bash
# View Lambda logs
aws logs tail /aws/lambda/elite-adventures-leads-prod-leads --follow

# Check Lambda metrics
aws lambda get-function --function-name elite-adventures-leads-prod-leads
```

## 📚 Additional Resources

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Cognito Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [API Gateway HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## 🤝 Support

For issues, questions, or contributions:
1. Check the documentation in `/docs`
2. Review example cURL commands in `scripts/test-api.sh`
3. Check CloudWatch logs for errors
4. Create an issue with detailed error logs

## 📄 License

Proprietary - Elite Adventures Belize

---

**Built with ❤️ for Elite Adventures Belize**
