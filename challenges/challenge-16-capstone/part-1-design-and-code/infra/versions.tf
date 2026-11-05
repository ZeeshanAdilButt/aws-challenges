# OpenTofu 1.13.2 (and Terraform 1.17) read this file. The AWS provider is major version 6.
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# The toolkit wrapper writes provider_override.tf.json next to this file. It adds the fake keys, allowed_account_ids
# (the two emulator accounts) and an endpoint for every service that points at the emulator. Do not add real keys here.
provider "aws" {
  region = var.region
}
