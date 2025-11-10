# DynamoDB table for leads
resource "aws_dynamodb_table" "leads" {
  name           = "${var.project_name}-${var.environment}-leads"
  billing_mode   = var.ddb_billing_mode
  hash_key       = "PK"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "ConferenceID"
    type = "S"
  }

  attribute {
    name = "CreatedAt"
    type = "S"
  }

  attribute {
    name = "Email"
    type = "S"
  }

  # GSI1: Query by conference and creation date
  global_secondary_index {
    name            = "GSI1-ConferenceDate"
    hash_key        = "ConferenceID"
    range_key       = "CreatedAt"
    projection_type = "ALL"
  }

  # GSI2: Lookup/dedupe by email
  global_secondary_index {
    name            = "GSI2-EmailLookup"
    hash_key        = "Email"
    range_key       = "CreatedAt"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.main.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  ttl {
    attribute_name = "TTL"
    enabled        = false
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-leads"
  }
}

# DynamoDB table for conference configuration
resource "aws_dynamodb_table" "conferences" {
  name         = "${var.project_name}-${var.environment}-conferences"
  billing_mode = var.ddb_billing_mode
  hash_key     = "ConferenceID"

  attribute {
    name = "ConferenceID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.main.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-conferences"
  }
}
