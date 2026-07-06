# Redis
resource "docker_image" "redis" {
  name = var.redis_image
}

resource "docker_container" "redis" {
  name  = "trace-redis-${var.environment}"
  image = docker_image.redis.image_id

  ports {
    internal = 6379
    external = 6379
  }

  restart = "always"
}

# TRACE API
resource "docker_image" "api" {
  name = var.api_image
}

resource "docker_container" "api" {
  name  = "trace-api-${var.environment}"
  image = docker_image.api.image_id

  ports {
    internal = 8000
    external = 8000
  }

  env = [
    "WORKERS=${var.api_workers}",
    "DATABASE_URL=${var.database_url}",
    "SUPABASE_URL=${var.supabase_url}",
    "SUPABASE_KEY=${var.supabase_key}",
    "SUPABASE_JWT_SECRET=${var.supabase_jwt_secret}",
    "RAZORPAY_KEY_ID=${var.razorpay_key_id}",
    "RAZORPAY_KEY_SECRET=${var.razorpay_key_secret}",
    "RAZORPAY_WEBHOOK_SECRET=${var.razorpay_webhook_secret}",
    "CELERY_BROKER_URL=redis://${docker_container.redis.name}:6379/0",
    "REDIS_URL=redis://${docker_container.redis.name}:6379/1",
  ]

  depends_on = [docker_container.redis]
  restart    = "always"

  healthcheck {
    test     = ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
    interval = "30s"
    timeout  = "10s"
    retries  = 3
  }
}

# Celery Worker
resource "docker_container" "celery_worker" {
  name    = "trace-worker-${var.environment}"
  image   = docker_image.api.image_id
  command = ["celery", "-A", "api.worker.celery_app", "worker", "--loglevel=info"]

  env = [
    "DATABASE_URL=${var.database_url}",
    "SUPABASE_URL=${var.supabase_url}",
    "SUPABASE_KEY=${var.supabase_key}",
    "SUPABASE_JWT_SECRET=${var.supabase_jwt_secret}",
    "RAZORPAY_KEY_ID=${var.razorpay_key_id}",
    "RAZORPAY_KEY_SECRET=${var.razorpay_key_secret}",
    "RAZORPAY_WEBHOOK_SECRET=${var.razorpay_webhook_secret}",
    "CELERY_BROKER_URL=redis://${docker_container.redis.name}:6379/0",
    "REDIS_URL=redis://${docker_container.redis.name}:6379/1",
  ]

  depends_on = [docker_container.redis]
  restart    = "always"
}

output "api_url" {
  value = "http://localhost:8000"
}
