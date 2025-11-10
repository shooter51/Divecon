# Elite Adventures Belize - Conference Lead Capture System

> Production-ready, cost-optimized lead capture application with mobile-first PWA and admin dashboard.

[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-purple)](https://www.terraform.io/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## 🎯 Overview

A complete serverless application for capturing conference leads with:
- **Mobile-first PWA** with offline support and background sync
- **Admin dashboard** with Cognito authentication
- **RESTful API** on AWS Lambda + API Gateway
- **Infrastructure as Code** with Terraform
- **Security-first design** with WAF, KMS encryption, and IAM best practices

### Key Features

✅ **Public Form**
- Mobile-optimized responsive design
- Offline-first with service worker & IndexedDB
- Auto-save form data (localStorage)
- QR code support for conference-specific forms
- E.164 phone validation
- Honeypot anti-spam
- .ics calendar download

✅ **Admin Dashboard**
- Cognito OAuth 2.0 authentication
- Lead management (view, update, tag)
- Export to CSV/JSON with presigned URLs
- Filter by conference, status, date, business type
- Real-time pagination

✅ **Backend APIs**
- 8 RESTful endpoints (public + admin)
- DynamoDB for structured data
- S3 for raw archives & exports
- QR code generation (PNG/SVG)
- Comprehensive input validation

✅ **Security & Compliance**
- WAFv2 with AWS Managed Rules
- Rate limiting (100 req/5min/IP)
- KMS encryption at rest
- JWT authentication for admin routes
- Least-privilege IAM
- GDPR-ready data deletion

## 🚀 Quick Start

### Prerequisites

- AWS Account with admin permissions
- [AWS CLI](https://aws.amazon.com/cli/) configured
- [Terraform](https://www.terraform.io/) >= 1.5.0
- [Node.js](https://nodejs.org/) >= 18.x
- Bash shell (macOS/Linux/WSL)

### Deploy in 3 Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd Divecon

# 2. Configure environment
cp .env.sample .env
# Edit .env with your AWS region and project name

# 3. Deploy everything
./scripts/deploy.sh
```

**That's it!** 🎉

The script will:
1. Install dependencies for all Lambdas
2. Build the frontend application
3. Deploy infrastructure with Terraform (~5-10 minutes)
4. Upload frontend to S3
5. Output your website URL and API endpoint

### Test with Sample Data

```bash
./scripts/seed.sh
```

Creates a sample conference and 5 test leads.

## 📖 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[docs/README.md](docs/README.md)** - Complete guide including:
  - Architecture overview
  - API documentation
  - Configuration options
  - Data schemas
  - Troubleshooting
  - Security best practices

- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** - Operations manual including:
  - Monitoring & alarms
  - Backup & restore procedures
  - User management
  - Incident response
  - Maintenance procedures
  - Runbook checklists

- **[scripts/test-api.sh](scripts/test-api.sh)** - Example cURL commands for all API endpoints

## 🏗️ Architecture

```
┌─────────────────┐
│   Users (HTTP)  │
│   S3 Website    │
└────────┬────────┘
         │
         │ HTTPS API Calls
         │
    ┌────▼─────────────────┐
    │   API Gateway (HTTP) │
    │   + WAFv2           │
    └────┬─────────────────┘
         │
    ┌────▼─────────────────────┐
    │   AWS Lambda Functions   │
    │   ├─ leads              │
    │   ├─ exports            │
    │   └─ conference         │
    └────┬──────────┬─────────┘
         │          │
    ┌────▼──────┐ ┌▼─────────┐
    │ DynamoDB  │ │    S3    │
    │ (Leads)   │ │ (Raw +   │
    │           │ │ Exports) │
    └───────────┘ └──────────┘

    ┌──────────────┐
    │   Cognito    │
    │ (Admin Auth) │
    └──────────────┘
```

### Why HTTP for Static Site?

The static site uses S3 static website hosting (HTTP-only) to **minimize costs** (~$0.10/month vs $0.50+ for CloudFront). All API calls use **HTTPS via API Gateway**, ensuring form submissions are encrypted. Users see a clear banner explaining this.

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Vanilla JS + PWA | Mobile-first form & admin UI |
| API | API Gateway HTTP API | RESTful endpoints (HTTPS) |
| Compute | AWS Lambda (Node.js 20.x) | Serverless request handlers |
| Database | DynamoDB (on-demand) | Lead storage with GSIs |
| Storage | S3 (Standard + Glacier IR) | Raw data, exports, QR codes |
| Auth | Amazon Cognito | Admin authentication |
| Security | WAFv2 + KMS + IAM | Multi-layer protection |
| IaC | Terraform | Infrastructure automation |

## 💰 Cost Breakdown

**Estimated monthly cost for 1,000 leads/month**: **~$12-15**

| Service | Cost | Notes |
|---------|------|-------|
| S3 Storage | $0.10 | Static site + data |
| DynamoDB | $1-2 | On-demand billing |
| API Gateway | $3.50 | 1M requests tier |
| Lambda | $0.20 | Under free tier |
| Cognito | Free | < 50K MAU |
| WAF | $6 | 1 ACL + 5 rules |
| CloudWatch | $0.50 | Logs + metrics |
| Data Transfer | $0.50 | Minimal |
| **Total** | **~$12-15** | |

### Cost Optimization Tips

- Disable WAF in dev/staging (`enable_waf = false`)
- Reduce CloudWatch log retention (7 days for dev)
- Use lifecycle policies (already configured)
- Delete old exports regularly

## 🔒 Security Features

- ✅ **WAFv2** with managed rule sets (SQLi, XSS, known bad inputs)
- ✅ **Rate limiting** at 100 requests per 5 minutes per IP
- ✅ **KMS encryption** for S3 and DynamoDB
- ✅ **Least-privilege IAM** for all Lambda functions
- ✅ **JWT authentication** for admin endpoints
- ✅ **CORS** properly configured for cross-origin requests
- ✅ **Input validation** and sanitization on all inputs
- ✅ **Honeypot fields** for spam prevention
- ✅ **DynamoDB Point-in-Time Recovery** enabled
- ✅ **S3 versioning** enabled on all buckets

## 📊 Monitoring

### CloudWatch Alarms (Automatically Configured)

- API Gateway 5xx errors (> 10 in 5 min)
- Lambda errors (> 5 in 5 min)
- Lambda throttles (> 10 in 5 min)
- WAF blocked requests (> 100 in 5 min)

### View Logs

```bash
# Lambda logs (real-time)
aws logs tail /aws/lambda/elite-adventures-leads-prod-leads --follow

# API Gateway logs
aws logs tail /aws/apigateway/elite-adventures-leads-prod --follow

# Filter for errors
aws logs tail /aws/lambda/elite-adventures-leads-prod-leads --follow --filter-pattern "ERROR"
```

## 🧪 Testing

### API Testing

All endpoints have example cURL commands:

```bash
./scripts/test-api.sh
```

### Manual Testing

**Public Form:**
```bash
curl -X POST 'https://YOUR-API-URL/leads' \
  -H 'Content-Type: application/json' \
  -d '{
    "conferenceId": "test-2024",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "company": "Test Corp",
    "consentContact": true
  }'
```

**Admin Export (requires auth):**
```bash
curl -X POST 'https://YOUR-API-URL/export' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"format": "csv"}'
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
AWS_REGION=us-east-1
PROJECT_NAME=elite-adventures-leads
ENVIRONMENT=prod
ENABLE_WAF=true
S3_LIFECYCLE_GLACIER_DAYS=90
S3_EXPORT_RETENTION_DAYS=365
```

### Terraform Variables (terraform.tfvars)

```hcl
project_name = "elite-adventures-leads"
environment  = "prod"
enable_waf   = true
admin_email  = "admin@yourdomain.com"  # Optional
```

## 📁 Project Structure

```
.
├── app/                    # Frontend application
│   ├── public/            # Static assets + PWA
│   └── src/               # JavaScript source
├── lambdas/               # Backend Lambda functions
│   ├── leads/            # Lead management
│   ├── exports/          # CSV/JSON export
│   └── conference/       # Conference & QR codes
├── infra/terraform/       # Infrastructure as Code
│   ├── s3_site.tf        # S3 buckets
│   ├── ddb.tf            # DynamoDB tables
│   ├── cognito.tf        # Authentication
│   ├── apigw.tf          # API Gateway
│   ├── lambdas.tf        # Lambda functions
│   ├── waf.tf            # Web Application Firewall
│   └── iam.tf            # IAM roles & policies
├── scripts/               # Deployment & utilities
│   ├── deploy.sh         # Main deployment script
│   ├── seed.sh           # Sample data
│   └── test-api.sh       # API testing examples
└── docs/                  # Documentation
    ├── README.md         # Detailed guide
    └── OPERATIONS.md     # Ops manual
```

## 🎓 Common Tasks

### Deploy Infrastructure
```bash
./scripts/deploy.sh
```

### Update Frontend Only
```bash
cd app && npm run build
aws s3 sync public/ s3://YOUR-BUCKET/ --delete
```

### Update Lambda Code
```bash
cd infra/terraform
terraform apply -target=aws_lambda_function.leads
```

### Create Admin User
```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR-POOL-ID \
  --username admin@domain.com \
  --user-attributes Name=email,Value=admin@domain.com \
  --temporary-password "TempPass123!"

aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR-POOL-ID \
  --username admin@domain.com \
  --group-name Admin
```

### Export All Leads
```bash
# Via API (requires admin token)
curl -X POST 'https://YOUR-API-URL/export' \
  -H 'Authorization: Bearer TOKEN' \
  -d '{"format":"csv"}'
```

### Delete Infrastructure
```bash
cd infra/terraform
terraform destroy
```

## 🐛 Troubleshooting

### Deployment Issues

**Problem**: Terraform fails with "bucket already exists"
**Solution**: Ensure `PROJECT_NAME` is unique in `.env`

**Problem**: Lambda deployment fails
**Solution**: Run `npm install` in each Lambda directory

### Runtime Issues

**Problem**: CORS errors in browser
**Solution**: Check API Gateway CORS configuration includes your S3 website URL

**Problem**: 401 Unauthorized on admin endpoints
**Solution**: Verify JWT token is not expired (60 min lifetime)

**Problem**: Leads not appearing in admin dashboard
**Solution**: Check DynamoDB table and CloudWatch logs for errors

See **[docs/README.md](docs/README.md)** for comprehensive troubleshooting.

## 📚 Additional Resources

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## 🤝 Contributing

This is a proprietary project for Elite Adventures Belize. For questions or issues:

1. Check the documentation in `/docs`
2. Review CloudWatch logs
3. Contact the infrastructure team

## 📄 License

Proprietary - Elite Adventures Belize. All rights reserved.

---

**Built with ❤️ for Elite Adventures Belize**

*Ready to capture leads at your next conference!* 🌴🏖️
