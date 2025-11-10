# Quick Deployment Guide

## 🚀 Zero to Production in 10 Minutes

### Step 1: Prerequisites Check

Ensure you have:
- [x] AWS Account with admin access
- [x] AWS CLI installed and configured (`aws configure`)
- [x] Terraform >= 1.5.0 (`terraform --version`)
- [x] Node.js >= 18.x (`node --version`)

### Step 2: Clone & Configure

```bash
# Clone repository
git clone <repository-url>
cd Divecon

# Create environment file
cp .env.sample .env

# Edit .env (minimum required)
cat > .env << 'EOF'
AWS_REGION=us-east-1
AWS_PROFILE=default
PROJECT_NAME=elite-adventures-leads
ENVIRONMENT=prod
EOF
```

### Step 3: Deploy

```bash
# One command to deploy everything
./scripts/deploy.sh
```

**This will:**
1. Install Lambda dependencies (3 functions)
2. Build frontend application
3. Initialize Terraform
4. Deploy infrastructure (~5-10 minutes):
   - S3 buckets (site + data)
   - DynamoDB tables (leads + conferences)
   - API Gateway + routes
   - Lambda functions
   - Cognito User Pool
   - WAF Web ACL
   - IAM roles & policies
5. Upload frontend to S3
6. Display your URLs and credentials

### Step 4: Test

```bash
# Create sample conference and 5 test leads
./scripts/seed.sh
```

## 📋 What You Get

After deployment completes, you'll see:

```
✅ Deployment complete!

==========================================
📊 Deployment Information
==========================================

🌐 Website URL:
   http://elite-adventures-leads-prod-site.s3-website-us-east-1.amazonaws.com

🔗 API URL:
   https://abc123xyz.execute-api.us-east-1.amazonaws.com

🔐 Cognito Configuration:
   Pool ID:   us-east-1_XXXXXXXXX
   Client ID: 1234567890abcdefghij
   Domain:    https://elite-adventures-leads-prod-abc12345.auth.us-east-1.amazoncognito.com

==========================================
```

## 🎯 Next Steps

### 1. Test Public Form

Visit your website URL:
```
http://YOUR-BUCKET.s3-website-us-east-1.amazonaws.com
```

Fill out the form and submit. Check DynamoDB for the new lead.

### 2. Create Admin User

**Via AWS Console:**
1. Go to Amazon Cognito → User Pools
2. Select: `elite-adventures-leads-prod-admin`
3. Users and groups → Create user
4. Username: `admin@yourdomain.com`
5. Set temporary password
6. Add to group: **Admin**

**Via AWS CLI:**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com \
  --temporary-password "TempPass123!"

aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@yourdomain.com \
  --group-name Admin
```

### 3. Access Admin Dashboard

```
http://YOUR-BUCKET.s3-website-us-east-1.amazonaws.com/#admin
```

Login with your Cognito credentials. You'll be prompted to change your temporary password.

### 4. Test API

```bash
./scripts/test-api.sh
```

View example cURL commands for all endpoints.

## 🔧 Common Customizations

### Change Project Name

Edit `.env`:
```bash
PROJECT_NAME=my-custom-name
```

Then redeploy:
```bash
./scripts/deploy.sh
```

### Disable WAF (saves ~$6/month)

Edit `.env`:
```bash
ENABLE_WAF=false
```

Or edit `infra/terraform/terraform.tfvars`:
```hcl
enable_waf = false
```

### Add Admin User During Deployment

Edit `infra/terraform/terraform.tfvars`:
```hcl
admin_email = "admin@yourdomain.com"
```

Temporary password will be shown after deployment.

### Change AWS Region

Edit `.env`:
```bash
AWS_REGION=us-west-2
```

## 🗑️ Cleanup

To completely remove all infrastructure:

```bash
cd infra/terraform
terraform destroy
```

**Warning**: This will delete:
- All S3 buckets (and their contents)
- All DynamoDB tables (and data)
- All Lambda functions
- Cognito User Pool (and users)
- All other AWS resources

Make sure to export/backup data before destroying!

## 🐛 Troubleshooting

### "Bucket name already exists"

S3 bucket names must be globally unique. Change `PROJECT_NAME` in `.env`:
```bash
PROJECT_NAME=elite-adventures-leads-yourname
```

### "AccessDenied" errors

Ensure your AWS credentials have sufficient permissions:
```bash
aws sts get-caller-identity
```

You need permissions for: S3, DynamoDB, Lambda, API Gateway, Cognito, IAM, KMS, WAF, CloudWatch

### Terraform state locked

If deployment was interrupted:
```bash
cd infra/terraform
terraform force-unlock <LOCK_ID>
```

### Lambda deployment fails

Install dependencies manually:
```bash
cd lambdas/leads && npm install
cd ../exports && npm install
cd ../conference && npm install
```

Then redeploy:
```bash
./scripts/deploy.sh
```

## 📚 Documentation

- **[README.md](README.md)** - Project overview
- **[docs/README.md](docs/README.md)** - Complete documentation
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** - Operations manual
- **[scripts/test-api.sh](scripts/test-api.sh)** - API examples

## 💰 Estimated Costs

| Scenario | Monthly Cost |
|----------|-------------|
| Development (no WAF, 100 leads/month) | ~$5-8 |
| Production (with WAF, 1,000 leads/month) | ~$12-15 |
| High traffic (10,000 leads/month) | ~$30-40 |

**Free Tier Benefits** (first 12 months):
- Lambda: 1M requests/month free
- DynamoDB: 25GB storage + 200M requests free
- API Gateway: 1M requests free
- S3: 5GB storage free

## 🎉 Success Checklist

- [ ] Deployment completed without errors
- [ ] Website URL is accessible
- [ ] API URL returns valid responses
- [ ] Sample data created successfully
- [ ] Admin user created
- [ ] Admin dashboard accessible
- [ ] Form submission works
- [ ] Export functionality tested
- [ ] CloudWatch logs visible
- [ ] Cost alerts configured (optional)

---

**Need help?** Check the detailed documentation in `/docs` or review CloudWatch logs for errors.

**Ready to capture leads!** 🌴
