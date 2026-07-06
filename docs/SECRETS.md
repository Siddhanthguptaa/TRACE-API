# Secrets Management for TRACE

## Current State
Secrets are stored in `.env` files (never committed to git).

## Recommended Production Setup

### Option 1: Doppler (Simplest)
```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Login and setup
doppler login
doppler setup

# Run your app with injected secrets
doppler run -- gunicorn api.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Update your Dockerfile CMD:
```dockerfile
CMD doppler run -- gunicorn api.main:app ...
```

### Option 2: AWS Secrets Manager
```python
# Add to requirements.txt: boto3>=1.34.0

import boto3
import json

def load_secrets():
    client = boto3.client("secretsmanager", region_name="ap-northeast-1")
    response = client.get_secret_value(SecretId="trace/prod")
    secrets = json.loads(response["SecretString"])
    
    for key, value in secrets.items():
        os.environ[key] = value

# Call before Settings() initialization
load_secrets()
```

### Option 3: GCP Secret Manager
```python
# Add to requirements.txt: google-cloud-secret-manager>=2.20.0

from google.cloud import secretmanager

def load_secrets():
    client = secretmanager.SecretManagerServiceClient()
    secrets = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_JWT_SECRET",
               "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]
    
    for name in secrets:
        resource = f"projects/trace-prod/secrets/{name}/versions/latest"
        response = client.access_secret_version(request={"name": resource})
        os.environ[name] = response.payload.data.decode("UTF-8")
```

### Option 4: HashiCorp Vault
```python
# Add to requirements.txt: hvac>=2.3.0

import hvac

def load_secrets():
    client = hvac.Client(url="https://vault.trace.ai:8200", token=os.getenv("VAULT_TOKEN"))
    secrets = client.secrets.kv.v2.read_secret_version(path="trace/prod")
    
    for key, value in secrets["data"]["data"].items():
        os.environ[key] = value
```

## Terraform Integration
All Terraform variables for secrets are marked `sensitive = true` in `terraform/variables.tf`.
Use a `.tfvars` file (never committed) or CI environment variables:

```bash
# terraform.tfvars (add to .gitignore)
database_url        = "postgresql+asyncpg://..."
supabase_url        = "https://..."
supabase_key        = "..."
supabase_jwt_secret = "..."
razorpay_key_id     = "..."
razorpay_key_secret = "..."
razorpay_webhook_secret = "..."
```
