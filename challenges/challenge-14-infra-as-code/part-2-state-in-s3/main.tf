# One small resource, so there is a state to store.
resource "aws_s3_bucket" "notes" {
  bucket = "daftar-notes-iac"
}
