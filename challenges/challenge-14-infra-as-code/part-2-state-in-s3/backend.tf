# Remote state: OpenTofu keeps its record of what it built in an S3 bucket, not on one person's disk.
# use_lockfile writes a small ".tflock" object next to the state with a conditional write ("create only if it does not exist yet").
# While that object exists, a second apply stops with a lock error. OpenTofu has had this since 1.10; DynamoDB locking is not needed.
# The state bucket is created first with the SDK (state-in-s3.mjs), because a backend cannot create its own bucket.
terraform {
  backend "s3" {
    bucket       = "daftar-tfstate"
    key          = "network/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true

    # Only for the emulator. The container reaches it by its Compose service name.
    endpoints = {
      s3 = "http://moto:5000"
      sts = "http://moto:5000"
    }
    access_key                  = "test"
    secret_key                  = "test"
    use_path_style              = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
  }
}
