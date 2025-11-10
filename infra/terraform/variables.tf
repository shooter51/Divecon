variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "elite-adventures-leads"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Application = "LeadCapture"
    Owner       = "EliteAdventures"
  }
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins (will include S3 website URL)"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:8000"]
}

variable "enable_waf" {
  description = "Enable WAFv2 protection"
  type        = bool
  default     = false  # HTTP API Gateway v2 doesn't support WAF associations
}

variable "s3_lifecycle_glacier_days" {
  description = "Days before transitioning raw data to Glacier"
  type        = number
  default     = 90
}

variable "s3_export_retention_days" {
  description = "Days to retain export files"
  type        = number
  default     = 365
}

variable "domain_name" {
  description = "Custom domain name for the application"
  type        = string
  default     = "diveelitebelize.com"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
  default     = "Z046305210QCK604QXYUY"
}

variable "ddb_billing_mode" {
  description = "DynamoDB billing mode"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "admin_email" {
  description = "Email address for initial admin user (optional)"
  type        = string
  default     = "admin@eliteadventuresbelize.com"
}
