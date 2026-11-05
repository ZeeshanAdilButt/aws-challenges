# S3 for the notes and exports, SQS for jobs (with a dead-letter queue).
resource "aws_s3_bucket" "notes" {
  bucket = "daftar-capstone-notes"
  tags   = { team = "api", env = "prod", service = "daftar-api" }
}

resource "aws_s3_bucket_public_access_block" "notes" {
  bucket                  = aws_s3_bucket.notes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "notes" {
  bucket = aws_s3_bucket.notes.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "notes" {
  bucket = aws_s3_bucket.notes.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_sqs_queue" "jobs_dlq" {
  name                      = "daftar-jobs-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "jobs" {
  name                       = "daftar-jobs"
  visibility_timeout_seconds = 60
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.jobs_dlq.arn
    maxReceiveCount     = 3
  })
}
