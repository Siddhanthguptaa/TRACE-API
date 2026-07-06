variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "api_image" {
  description = "Docker image for the TRACE API"
  type        = string
  default     = "trace-api:latest"
}

variable "api_workers" {
  description = "Number of Gunicorn workers"
  type        = number
  default     = 2
}

variable "redis_image" {
  description = "Docker image for Redis"
  type        = string
  default     = "redis:7-alpine"
}

variable "database_url" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_key" {
  description = "Supabase anon key"
  type        = string
  sensitive   = true
}

variable "supabase_jwt_secret" {
  description = "Supabase JWT secret"
  type        = string
  sensitive   = true
}

variable "razorpay_key_id" {
  description = "Razorpay key ID"
  type        = string
  sensitive   = true
}

variable "razorpay_key_secret" {
  description = "Razorpay key secret"
  type        = string
  sensitive   = true
}

variable "razorpay_webhook_secret" {
  description = "Razorpay webhook secret"
  type        = string
  sensitive   = true
}
