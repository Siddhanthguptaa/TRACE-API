# TRACE Infrastructure — Terraform
#
# This provides a starting point for IaC. Customize for your cloud provider.
# Currently configured for a generic Docker-based deployment.
#
# Usage:
#   cd terraform/
#   terraform init
#   terraform plan
#   terraform apply

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }

  # For production, use a remote backend:
  # backend "s3" {
  #   bucket = "trace-terraform-state"
  #   key    = "prod/terraform.tfstate"
  #   region = "ap-northeast-1"
  # }
}

provider "docker" {}
