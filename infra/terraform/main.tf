# Main Terraform configuration
# This file serves as the entry point and documents the infrastructure

# The infrastructure is organized into the following modules:
# - providers.tf: AWS provider and backend configuration
# - variables.tf: Input variables
# - s3_site.tf: S3 buckets for static site and data storage
# - ddb.tf: DynamoDB tables for leads and conferences
# - cognito.tf: Cognito user pool and authentication
# - iam.tf: IAM roles and policies for Lambda functions
# - lambdas.tf: Lambda functions and CloudWatch logs
# - apigw.tf: API Gateway HTTP API and routes
# - waf.tf: WAFv2 Web ACL and security rules
# - outputs.tf: Output values for deployment

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors API Gateway 5xx errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = {
    leads      = aws_lambda_function.leads.function_name
    exports    = aws_lambda_function.exports.function_name
    conference = aws_lambda_function.conference.function_name
  }

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors ${each.key} Lambda errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  for_each = {
    leads      = aws_lambda_function.leads.function_name
    exports    = aws_lambda_function.exports.function_name
    conference = aws_lambda_function.conference.function_name
  }

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ${each.key} Lambda throttles"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }
}
