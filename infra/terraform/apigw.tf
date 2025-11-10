# API Gateway HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = concat(
      var.cors_allowed_origins,
      [
        "http://${aws_s3_bucket.site.bucket}.s3-website-${var.aws_region}.amazonaws.com",
        "https://${aws_cloudfront_distribution.site.domain_name}",
        "https://${var.domain_name}",
        "https://www.${var.domain_name}"
      ]
    )
    allow_methods = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Api-Key"]
    expose_headers = ["*"]
    max_age = 3600
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-api"
  }
}

# JWT Authorizer for Cognito
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.admin.id}"
  }
}

# API Stage
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
      authorizerError = "$context.authorizer.error"
    })
  }

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-api-stage"
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = 14

  # KMS encryption disabled for CloudWatch Logs to avoid permission issues
  # kms_key_id = aws_kms_key.main.arn
}

# ==================== LEADS ROUTES ====================

# POST /leads (public)
resource "aws_apigatewayv2_integration" "leads_post" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.leads.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "leads_post" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /leads"
  target    = "integrations/${aws_apigatewayv2_integration.leads_post.id}"
}

# GET /leads (admin)
resource "aws_apigatewayv2_integration" "leads_get" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.leads.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "leads_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /leads"
  target             = "integrations/${aws_apigatewayv2_integration.leads_get.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# GET /leads/{id} (admin)
resource "aws_apigatewayv2_integration" "leads_get_id" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.leads.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "leads_get_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /leads/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.leads_get_id.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# PATCH /leads/{id} (admin)
resource "aws_apigatewayv2_integration" "leads_patch" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.leads.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "leads_patch" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PATCH /leads/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.leads_patch.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# DELETE /leads/{id} (admin)
resource "aws_apigatewayv2_integration" "leads_delete" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.leads.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "leads_delete" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /leads/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.leads_delete.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ==================== EXPORTS ROUTES ====================

# POST /export (admin)
resource "aws_apigatewayv2_integration" "export_post" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.exports.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds = 30000
}

resource "aws_apigatewayv2_route" "export_post" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /export"
  target             = "integrations/${aws_apigatewayv2_integration.export_post.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ==================== CONFERENCE ROUTES ====================

# GET /conference/{id} (public)
resource "aws_apigatewayv2_integration" "conference_get" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.conference.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "conference_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /conference/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.conference_get.id}"
}

# POST /conference (admin)
resource "aws_apigatewayv2_integration" "conference_post" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.conference.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "conference_post" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /conference"
  target             = "integrations/${aws_apigatewayv2_integration.conference_post.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# GET /qr/{id} (public)
resource "aws_apigatewayv2_integration" "qr_get" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.conference.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "qr_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /qr/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.qr_get.id}"
}
