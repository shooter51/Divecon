# Getting Started - Elite Adventures Belize Lead Capture

## ⚡ Quick Start (5 minutes)

### 1️⃣ Configure Environment

```bash
# Copy the template
cp .env.sample .env

# Edit with your settings (minimum required)
cat > .env << 'ENVFILE'
AWS_REGION=us-east-1
AWS_PROFILE=default
PROJECT_NAME=elite-adventures-leads
ENVIRONMENT=prod
ENVFILE
```

### 2️⃣ Verify Prerequisites

```bash
./scripts/verify.sh
```

This checks:
- ✅ AWS CLI installed and configured
- ✅ Terraform installed (>= 1.5.0)
- ✅ Node.js installed (>= 18.x)
- ✅ All project files present

### 3️⃣ Deploy

```bash
./scripts/deploy.sh
```

**What happens:**
- Installs Lambda dependencies (~30 seconds)
- Builds frontend application (~10 seconds)
- Deploys AWS infrastructure (~5-8 minutes)
- Uploads static site to S3 (~5 seconds)
- Outputs URLs and credentials

**You'll see:**
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
   Domain:    https://elite-adventures-prod-abc12345.auth.us-east-1.amazoncognito.com
==========================================
```

### 4️⃣ Test with Sample Data

```bash
./scripts/seed.sh
```

Creates:
- 1 sample conference
- 5 diverse test leads

---

## 🎯 Next Steps

### Create Your First Admin User

**Option A: Via AWS CLI**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id <POOL_ID_FROM_OUTPUT> \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com \
  --temporary-password "TempPass123!"

aws cognito-idp admin-add-user-to-group \
  --user-pool-id <POOL_ID_FROM_OUTPUT> \
  --username admin@yourdomain.com \
  --group-name Admin
```

**Option B: Via AWS Console**
1. Go to AWS Console → Cognito → User Pools
2. Select: `elite-adventures-leads-prod-admin`
3. Users → Create user
4. Username: `admin@yourdomain.com`
5. Set temporary password
6. Groups → Add user to "Admin" group

### Access the Application

**Public Form:**
Visit your website URL to submit leads:
```
http://<bucket-name>.s3-website-us-east-1.amazonaws.com
```

**With Conference ID (via QR code):**
```
http://<bucket-name>.s3-website-us-east-1.amazonaws.com/?conference=conf-2024
```

**Admin Dashboard:**
```
http://<bucket-name>.s3-website-us-east-1.amazonaws.com/#admin
```

Login with your Cognito credentials.

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview & quick reference |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Detailed deployment guide |
| [docs/README.md](docs/README.md) | Complete technical documentation |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Operations & maintenance manual |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | File structure & data flow |
| [SUMMARY.md](SUMMARY.md) | Implementation summary |

---

## 🧪 Testing the Application

### Test Public Form Submission

```bash
# Get your API URL from deployment output
API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com"

# Submit a test lead
curl -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "conferenceId": "test-2024",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "company": "Test Company",
    "consentContact": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "leadId": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "message": "Lead captured successfully"
}
```

### Test Admin API (requires auth)

See [scripts/test-api.sh](scripts/test-api.sh) for all API examples.

---

## 🎨 Customization

### Change Project Name

Edit `.env`:
```bash
PROJECT_NAME=my-custom-name
```

Re-run deployment:
```bash
./scripts/deploy.sh
```

### Disable WAF (saves $6/month)

Edit `.env`:
```bash
ENABLE_WAF=false
```

### Adjust Data Retention

Edit `.env`:
```bash
S3_LIFECYCLE_GLACIER_DAYS=30    # Move to Glacier after 30 days
S3_EXPORT_RETENTION_DAYS=90     # Delete exports after 90 days
```

### Add Admin User During Deployment

Create `infra/terraform/terraform.tfvars`:
```hcl
admin_email = "admin@yourdomain.com"
```

Temporary password will be shown after deployment.

---

## 🐛 Troubleshooting

### "Bucket name already exists"

S3 bucket names must be globally unique. Change in `.env`:
```bash
PROJECT_NAME=elite-adventures-yourcompany
```

### "Access Denied" during deployment

Verify AWS credentials:
```bash
aws sts get-caller-identity
```

Ensure your IAM user/role has permissions for:
- S3, DynamoDB, Lambda, API Gateway
- Cognito, IAM, KMS, WAF, CloudWatch

### Terraform state locked

If deployment was interrupted:
```bash
cd infra/terraform
terraform force-unlock <LOCK_ID_FROM_ERROR>
```

### Can't login to admin dashboard

1. Check Cognito user exists and is in "Admin" group
2. Verify temporary password has been changed
3. Check JWT token hasn't expired (60 min)
4. Review CloudWatch logs for auth errors

---

## 💰 Cost Expectations

### Development (~100 leads/month)
- **$5-8/month** (without WAF)
- **$11-14/month** (with WAF)

### Production (~1,000 leads/month)
- **$12-15/month** (recommended)

### High Volume (~10,000 leads/month)
- **$30-40/month**

**What's included:**
- S3 storage & data transfer
- DynamoDB on-demand capacity
- API Gateway requests
- Lambda invocations
- WAF (optional)
- CloudWatch logs & metrics
- KMS encryption

---

## 🔄 Updating the Application

### Update Frontend Only

```bash
cd app
npm run build

aws s3 sync public/ s3://<BUCKET_NAME>/ --delete
```

### Update Lambda Code

```bash
cd infra/terraform
terraform apply -target=aws_lambda_function.leads
```

### Update Infrastructure

```bash
# Edit Terraform files in infra/terraform/
# Then apply changes
./scripts/deploy.sh
```

---

## 🗑️ Cleanup

To completely remove all infrastructure:

```bash
cd infra/terraform
terraform destroy
```

**⚠️ Warning:** This will permanently delete:
- All S3 buckets and data
- All DynamoDB tables and leads
- All Lambda functions
- Cognito User Pool and users
- All other AWS resources

**Backup data first!**

---

## 📞 Support

- **Documentation**: See `/docs` directory
- **API Examples**: `./scripts/test-api.sh`
- **Logs**: `aws logs tail /aws/lambda/FUNCTION_NAME --follow`
- **AWS Support**: https://console.aws.amazon.com/support/

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Website URL loads correctly
- [ ] Public form submits successfully
- [ ] Admin user created in Cognito
- [ ] Admin dashboard accessible
- [ ] Sample data created
- [ ] CloudWatch logs visible
- [ ] Costs tracking in AWS billing

**All set? Start capturing leads!** 🎉

---

**Need Help?**
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides
- Review [docs/README.md](docs/README.md) for complete documentation
- See [docs/OPERATIONS.md](docs/OPERATIONS.md) for operational procedures
