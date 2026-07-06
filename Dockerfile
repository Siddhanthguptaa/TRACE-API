# Stage 1: Builder
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runner
FROM python:3.11-slim
WORKDIR /app

# Create non-root user
RUN useradd -m traceapp

# Copy python packages
COPY --from=builder /root/.local /home/traceapp/.local
ENV PATH=/home/traceapp/.local/bin:$PATH

COPY . .

RUN chown -R traceapp:traceapp /app
USER traceapp

ENV WORKERS=1
EXPOSE 8000

# Use shell form so $WORKERS is expanded at runtime
CMD gunicorn api.main:app \
    --workers ${WORKERS} \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --graceful-timeout 30
