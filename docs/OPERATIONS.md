# Operations Guide - Elite Adventures Belize Lead Capture System

This document provides operational procedures for monitoring, maintaining, and troubleshooting the production system.

## 📊 Monitoring & Alarms

### CloudWatch Alarms

The following alarms are automatically configured:

#### API Gateway Alarms
- **API 5xx Errors**: Triggers when > 10 errors in 5 minutes
  - **Action**: Check Lambda logs, review recent deployments
  - **Log Group**: `/aws/apigateway/elite-adventures-leads-prod`

#### Lambda Alarms (per function)
- **Lambda Errors**: Triggers when > 5 errors in 5 minutes
  - **Functions**: leads, exports, conference
  - **Action**: Check function logs, review code changes
  - **Log Groups**:
    - `/aws/lambda/elite-adventures-leads-prod-leads`
    - `/aws/lambda/elite-adventures-leads-prod-exports`
    - `/aws/lambda/elite-adventures-leads-prod-conference`

- **Lambda Throttles**: Triggers when > 10 throttles in 5 minutes
  - **Action**: Consider increasing concurrency limits or optimizing function performance

#### WAF Alarms
- **Blocked Requests**: Triggers when > 100 requests blocked in 5 minutes
  - **Action**: Review WAF logs, investigate potential attack patterns
  - **Metrics**: AWS/WAFV2 → BlockedRequests

### Viewing Logs

#### Real-time Lambda Logs
```bash
# Leads Lambda
aws logs tail /aws/lambda/elite-adventures-leads-prod-leads --follow

# Exports Lambda
aws logs tail /aws/lambda/elite-adventures-leads-prod-exports --follow

# Conference Lambda
aws logs tail /aws/lambda/elite-adventures-leads-prod-conference --follow

# Filter for errors only
aws logs tail /aws/lambda/elite-adventures-leads-prod-leads --follow --filter-pattern "ERROR"
```

#### API Gateway Logs
```bash
aws logs tail /aws/apigateway/elite-adventures-leads-prod --follow
```

#### WAF Logs
```bash
# Enable WAF logging (if not already enabled)
aws wafv2 put-logging-configuration \
  --logging-configuration ResourceArn=arn:aws:wafv2:REGION:ACCOUNT:regional/webacl/NAME/ID,LogDestinationConfigs=arn:aws:logs:REGION:ACCOUNT:log-group:aws-waf-logs-elite-adventures

# View logs
aws logs tail aws-waf-logs-elite-adventures --follow
```

### Key Metrics to Monitor

#### Daily Checks
- [ ] Total leads submitted (CloudWatch Metrics)
- [ ] API error rate (should be < 1%)
- [ ] Lambda error rate (should be < 0.1%)
- [ ] WAF blocked requests (investigate spikes)
- [ ] S3 storage costs

#### Weekly Checks
- [ ] DynamoDB consumed capacity
- [ ] Lambda invocation costs
- [ ] Failed authentication attempts
- [ ] Export file sizes

#### Monthly Checks
- [ ] Total AWS costs (should be < $20/month for normal usage)
- [ ] S3 lifecycle transitions
- [ ] Data retention compliance
- [ ] User access audit

## 🔄 Backup & Restore

### DynamoDB Point-in-Time Recovery (PITR)

PITR is **already enabled** for both tables:
- `elite-adventures-leads-prod-leads`
- `elite-adventures-leads-prod-conferences`

**Restoring from PITR:**
```bash
# Restore Leads table to specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name elite-adventures-leads-prod-leads \
  --target-table-name elite-adventures-leads-prod-leads-restored \
  --restore-date-time 2024-01-15T10:30:00Z
```

### S3 Versioning

S3 versioning is **enabled** on all buckets. To restore a deleted/overwritten file:

```bash
# List versions
aws s3api list-object-versions \
  --bucket elite-adventures-leads-prod-data \
  --prefix raw/2024/01/15/

# Restore specific version
aws s3api copy-object \
  --copy-source elite-adventures-leads-prod-data/raw/2024/01/15/file.json?versionId=VERSION_ID \
  --bucket elite-adventures-leads-prod-data \
  --key raw/2024/01/15/file.json
```

### Manual Backup Procedures

#### Export All Leads
```bash
# Via API (requires admin token)
curl -X POST 'https://API_URL/export' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"format": "json"}'

# Download the presigned URL from response
```

#### DynamoDB Export to S3
```bash
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:REGION:ACCOUNT:table/elite-adventures-leads-prod-leads \
  --s3-bucket elite-adventures-leads-prod-data \
  --s3-prefix backups/$(date +%Y-%m-%d)/ \
  --export-format DYNAMODB_JSON
```

## 🗄️ Data Retention & Lifecycle

### Configured Policies

**S3 Lifecycle Rules:**
1. **Raw Data** (`/raw/*`)
   - Transition to Glacier Instant Retrieval after 90 days
   - No expiration (permanent retention)

2. **Exports** (`/exports/*`)
   - Expire after 365 days
   - No transition

3. **QR Codes** (`/qr/*`)
   - No lifecycle (keep indefinitely, minimal storage cost)

### Manual Cleanup

#### Delete Old Exports
```bash
# Delete exports older than 1 year
aws s3 rm s3://elite-adventures-leads-prod-data/exports/ \
  --recursive \
  --exclude "*" \
  --include "202[0-2]/*"
```

#### Archive Old Leads (if needed)
```bash
# Export leads older than 2 years to archive bucket
# (Custom script required - see data retention policy)
```

## 👥 User Management

### Creating Admin Users

**Via AWS Console:**
1. AWS Console → Cognito → User Pools
2. Select: `elite-adventures-leads-prod-admin`
3. Users and groups → Create user
4. Username: email@domain.com
5. Set temporary password
6. Add to group: **Admin**

**Via AWS CLI:**
```bash
# Create user
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@domain.com \
  --user-attributes \
    Name=email,Value=admin@domain.com \
    Name=email_verified,Value=true \
  --temporary-password "Temp123!@#" \
  --message-action SUPPRESS

# Add to Admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@domain.com \
  --group-name Admin
```

### Disabling Users
```bash
aws cognito-idp admin-disable-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@domain.com
```

### Resetting Passwords
```bash
aws cognito-idp admin-reset-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@domain.com
```

### Enabling MFA (Recommended)
```bash
aws cognito-idp admin-set-user-mfa-preference \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@domain.com \
  --software-token-mfa-settings Enabled=true,PreferredMfa=true
```

## 🔧 Maintenance Procedures

### Updating Lambda Code

```bash
# 1. Update code in lambdas/*/index.js
# 2. Redeploy
cd infra/terraform
terraform apply -target=aws_lambda_function.leads

# Or redeploy everything
./scripts/deploy.sh
```

### Updating Frontend

```bash
# 1. Update code in app/src/
# 2. Rebuild and deploy
cd app
npm run build

# 3. Upload to S3
aws s3 sync public/ s3://BUCKET_NAME/ --delete
```

### Rotating KMS Keys

```bash
# Enable automatic key rotation (already enabled in Terraform)
aws kms enable-key-rotation --key-id KEY_ID

# Check rotation status
aws kms get-key-rotation-status --key-id KEY_ID
```

### Updating WAF Rules

```bash
cd infra/terraform

# Edit waf.tf to add/modify rules
# Example: Block specific country
# Add to geo_match_statement country_codes

terraform plan
terraform apply
```

## 🚨 Incident Response

### High Error Rate

**Symptoms**: CloudWatch alarm for API/Lambda errors

**Investigation Steps:**
1. Check CloudWatch Logs for error messages
2. Identify error pattern (specific endpoint, time range)
3. Review recent deployments
4. Check DynamoDB capacity/throttling
5. Verify IAM permissions

**Resolution:**
```bash
# Rollback deployment if recent change
cd infra/terraform
terraform state list
terraform state show aws_lambda_function.leads

# Revert to previous version
git checkout HEAD~1 lambdas/leads/index.js
terraform apply
```

### DDoS or Spam Attack

**Symptoms**: High WAF blocked requests, unusual traffic patterns

**Investigation:**
1. Check WAF logs for attack patterns
2. Identify source IPs/countries
3. Review blocked request types

**Mitigation:**
```bash
# Add IP-based blocking rule to WAF
# Edit infra/terraform/waf.tf

resource "aws_wafv2_ip_set" "blocked_ips" {
  name               = "blocked-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = [
    "192.0.2.0/24",
    "198.51.100.0/24"
  ]
}

# Add rule to reference IP set
# terraform apply
```

### Database Performance Issues

**Symptoms**: Slow API responses, DynamoDB throttling

**Investigation:**
```bash
# Check consumed capacity
aws dynamodb describe-table \
  --table-name elite-adventures-leads-prod-leads \
  --query 'Table.BillingModeSummary'

# Check for hot partitions
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=elite-adventures-leads-prod-leads \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Resolution:**
- Already using on-demand capacity (auto-scales)
- Optimize queries to use GSIs
- Add caching layer if needed (ElastiCache)

### Storage Costs Increasing

**Investigation:**
```bash
# Check S3 storage by prefix
aws s3 ls s3://elite-adventures-leads-prod-data/ --recursive --summarize

# Check storage class distribution
aws s3api list-objects-v2 \
  --bucket elite-adventures-leads-prod-data \
  --query 'Contents[].{Key:Key,StorageClass:StorageClass,Size:Size}' \
  --output table
```

**Resolution:**
- Review lifecycle policies
- Delete old exports manually
- Archive old raw data to Glacier Deep Archive

## 📈 Scaling Considerations

### Horizontal Scaling

The application **automatically scales** for most components:
- **Lambda**: Concurrent executions (default limit: 1,000)
- **DynamoDB**: On-demand capacity
- **API Gateway**: No hard limits (request throttling configurable)

### When to Upgrade

**Consider provisioned DynamoDB if:**
- Consistent, predictable traffic
- > 10,000 leads/day
- Cost analysis shows provisioned is cheaper

**Consider CloudFront if:**
- Need HTTPS for static site
- Global users (CDN benefits)
- Custom domain required

**Consider RDS instead of DynamoDB if:**
- Complex relational queries needed
- Strong consistency required
- Advanced reporting features

## 🔍 Auditing & Compliance

### Enable CloudTrail (recommended for production)

```bash
aws cloudtrail create-trail \
  --name elite-adventures-audit \
  --s3-bucket-name my-cloudtrail-bucket

aws cloudtrail start-logging --name elite-adventures-audit
```

### Export User Access Logs

```bash
# Cognito user activity
aws cognito-idp admin-list-user-auth-events \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@domain.com \
  --max-results 60
```

### GDPR Data Deletion

To delete a specific lead and all associated data:

```bash
# 1. Delete from DynamoDB
aws dynamodb delete-item \
  --table-name elite-adventures-leads-prod-leads \
  --key '{"PK": {"S": "conference-123#LEAD_ID"}}'

# 2. Delete raw data from S3
aws s3 rm s3://elite-adventures-leads-prod-data/raw/YYYY/MM/DD/conference-id/LEAD_ID.json

# 3. Purge from exports (if exists)
# (Manual review of export files required)
```

## 📞 Emergency Contacts

- **AWS Support**: https://console.aws.amazon.com/support/
- **Application Owner**: [your-email@domain.com]
- **Infrastructure Team**: [infra-team@domain.com]

## 📋 Runbook Checklist

### Daily Operations
- [ ] Check CloudWatch dashboard
- [ ] Review alarm notifications
- [ ] Monitor error rates

### Weekly Operations
- [ ] Review WAF logs
- [ ] Check storage costs
- [ ] Audit new users

### Monthly Operations
- [ ] Review AWS bill
- [ ] Update dependencies
- [ ] Test backup restoration
- [ ] Security patch review

### Quarterly Operations
- [ ] Full disaster recovery test
- [ ] Review access permissions
- [ ] Update documentation
- [ ] Performance optimization review

---

**Last Updated**: January 2024
**Document Owner**: Infrastructure Team
**Review Frequency**: Quarterly
