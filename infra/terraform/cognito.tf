# Cognito User Pool for admin authentication
resource "aws_cognito_user_pool" "admin" {
  name = "${var.project_name}-${var.environment}-admin"

  # Allow email sign-in
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # MFA configuration (optional, disabled for simplicity)
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # User pool schema
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false

    string_attribute_constraints {
      min_length = 5
      max_length = 256
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-admin-pool"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "admin" {
  name         = "${var.project_name}-${var.environment}-admin-client"
  user_pool_id = aws_cognito_user_pool.admin.id

  generate_secret                      = false
  refresh_token_validity               = 30
  access_token_validity                = 60
  id_token_validity                    = 60
  token_validity_units {
    refresh_token = "days"
    access_token  = "minutes"
    id_token      = "minutes"
  }

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Cognito requires HTTPS URLs. CloudFront provides HTTPS by default.
  callback_urls = [
    "https://${var.domain_name}",
    "https://www.${var.domain_name}",
    "https://${aws_cloudfront_distribution.site.domain_name}",
    "http://localhost:3000",
    "http://localhost:8000"
  ]

  logout_urls = [
    "https://${var.domain_name}",
    "https://www.${var.domain_name}",
    "https://${aws_cloudfront_distribution.site.domain_name}",
    "http://localhost:3000",
    "http://localhost:8000"
  ]

  supported_identity_providers = ["COGNITO"]

  prevent_user_existence_errors = "ENABLED"

  # Disable self-service signup
  read_attributes  = ["email", "email_verified"]
  write_attributes = ["email"]
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "admin" {
  domain       = "${var.project_name}-${var.environment}-${random_string.cognito_domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.admin.id
}

resource "random_string" "cognito_domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Cognito Groups
resource "aws_cognito_user_group" "admin" {
  name         = "Admin"
  user_pool_id = aws_cognito_user_pool.admin.id
  description  = "Administrator group with full access"
  precedence   = 1
}

resource "aws_cognito_user_group" "staff" {
  name         = "Staff"
  user_pool_id = aws_cognito_user_pool.admin.id
  description  = "Staff group with read-only access"
  precedence   = 2
}

# Optional: Create initial admin user if email provided
resource "aws_cognito_user" "admin" {
  count        = var.admin_email != "" ? 1 : 0
  user_pool_id = aws_cognito_user_pool.admin.id
  username     = var.admin_email

  attributes = {
    email          = var.admin_email
    email_verified = true
  }

  temporary_password = random_password.admin_temp[0].result

  lifecycle {
    ignore_changes = [
      attributes,
      temporary_password
    ]
  }
}

resource "random_password" "admin_temp" {
  count   = var.admin_email != "" ? 1 : 0
  length  = 16
  special = true
}

resource "aws_cognito_user_in_group" "admin" {
  count        = var.admin_email != "" ? 1 : 0
  user_pool_id = aws_cognito_user_pool.admin.id
  group_name   = aws_cognito_user_group.admin.name
  username     = aws_cognito_user.admin[0].username
}
