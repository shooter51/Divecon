output "site_url" {
  description = "Custom domain URL (HTTPS)"
  value       = "https://${var.domain_name}"
}

output "www_site_url" {
  description = "WWW subdomain URL (HTTPS)"
  value       = "https://www.${var.domain_name}"
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "s3_website_url" {
  description = "S3 static website URL (HTTP - for reference)"
  value       = "http://${aws_s3_bucket.site.bucket}.s3-website-${var.aws_region}.amazonaws.com"
}

output "site_bucket_name" {
  description = "S3 site bucket name"
  value       = aws_s3_bucket.site.id
}

output "data_bucket_name" {
  description = "S3 data bucket name"
  value       = aws_s3_bucket.data.id
}

output "api_url" {
  description = "API Gateway base URL (HTTPS)"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.admin.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.admin.id
}

output "cognito_domain" {
  description = "Cognito Hosted UI domain"
  value       = "https://${aws_cognito_user_pool_domain.admin.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "leads_table_name" {
  description = "DynamoDB Leads table name"
  value       = aws_dynamodb_table.leads.name
}

output "conferences_table_name" {
  description = "DynamoDB Conferences table name"
  value       = aws_dynamodb_table.conferences.name
}

output "kms_key_id" {
  description = "KMS key ID for encryption"
  value       = aws_kms_key.main.key_id
}

output "admin_temp_password" {
  description = "Temporary password for admin user (if created)"
  value       = var.admin_email != "" ? random_password.admin_temp[0].result : "N/A - No admin user created"
  sensitive   = true
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = var.enable_waf ? aws_wafv2_web_acl.api[0].arn : "N/A - WAF disabled"
}

output "deployment_config" {
  description = "Configuration for app deployment"
  value = {
    API_URL             = aws_apigatewayv2_api.main.api_endpoint
    COGNITO_POOL_ID     = aws_cognito_user_pool.admin.id
    COGNITO_CLIENT_ID   = aws_cognito_user_pool_client.admin.id
    COGNITO_DOMAIN      = "https://${aws_cognito_user_pool_domain.admin.domain}.auth.${var.aws_region}.amazoncognito.com"
    SITE_URL            = "https://${var.domain_name}"
    AWS_REGION          = var.aws_region
  }
}
