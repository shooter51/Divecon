# Package Lambda functions
data "archive_file" "leads_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambdas/leads"
  output_path = "${path.module}/../../lambdas/leads.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "exports_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambdas/exports"
  output_path = "${path.module}/../../lambdas/exports.zip"
  excludes    = ["*.zip"]
}

data "archive_file" "conference_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambdas/conference"
  output_path = "${path.module}/../../lambdas/conference.zip"
  excludes    = ["*.zip"]
}

# Leads Lambda Function
resource "aws_lambda_function" "leads" {
  filename         = data.archive_file.leads_lambda.output_path
  function_name    = "${var.project_name}-${var.environment}-leads"
  role            = aws_iam_role.leads_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.leads_lambda.output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      LEADS_TABLE_NAME       = aws_dynamodb_table.leads.name
      DATA_BUCKET_NAME       = aws_s3_bucket.data.id
      AWS_ACCOUNT_ID         = data.aws_caller_identity.current.account_id
      KMS_KEY_ID             = aws_kms_key.main.key_id
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-leads"
  }
}

resource "aws_lambda_permission" "leads_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.leads.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# CloudWatch Log Group for Leads Lambda
resource "aws_cloudwatch_log_group" "leads_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.leads.function_name}"
  retention_in_days = 14

  # KMS encryption disabled for CloudWatch Logs to avoid permission issues
  # kms_key_id = aws_kms_key.main.arn
}

# Exports Lambda Function
resource "aws_lambda_function" "exports" {
  filename         = data.archive_file.exports_lambda.output_path
  function_name    = "${var.project_name}-${var.environment}-exports"
  role            = aws_iam_role.exports_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.exports_lambda.output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 300
  memory_size     = 512

  environment {
    variables = {
      LEADS_TABLE_NAME = aws_dynamodb_table.leads.name
      DATA_BUCKET_NAME = aws_s3_bucket.data.id
      AWS_ACCOUNT_ID   = data.aws_caller_identity.current.account_id
      KMS_KEY_ID       = aws_kms_key.main.key_id
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-exports"
  }
}

resource "aws_lambda_permission" "exports_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.exports.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# CloudWatch Log Group for Exports Lambda
resource "aws_cloudwatch_log_group" "exports_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.exports.function_name}"
  retention_in_days = 14

  # KMS encryption disabled for CloudWatch Logs to avoid permission issues
  # kms_key_id = aws_kms_key.main.arn
}

# Conference Lambda Function
resource "aws_lambda_function" "conference" {
  filename         = data.archive_file.conference_lambda.output_path
  function_name    = "${var.project_name}-${var.environment}-conference"
  role            = aws_iam_role.conference_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.conference_lambda.output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      CONFERENCES_TABLE_NAME = aws_dynamodb_table.conferences.name
      DATA_BUCKET_NAME       = aws_s3_bucket.data.id
      AWS_ACCOUNT_ID         = data.aws_caller_identity.current.account_id
      KMS_KEY_ID             = aws_kms_key.main.key_id
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-conference"
  }
}

resource "aws_lambda_permission" "conference_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.conference.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# CloudWatch Log Group for Conference Lambda
resource "aws_cloudwatch_log_group" "conference_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.conference.function_name}"
  retention_in_days = 14

  # KMS encryption disabled for CloudWatch Logs to avoid permission issues
  # kms_key_id = aws_kms_key.main.arn
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}
