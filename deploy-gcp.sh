#!/bin/bash
set -e

# ─── Config ────────────────────────────────────────────────────────────────
PROJECT_ID="${google_cloud_id:-project-99297e72-ae44-49d0-a20}"
REGION="us-central1"
API_SERVICE="interview-ai-api"
WEB_SERVICE="interview-ai-web"
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

echo "🚀 Deploying G Hire to GCP project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Commit: $COMMIT_SHA"

# ─── Check required env vars ────────────────────────────────────────────────
required_vars=("DATABASE_URL" "Gemini_API_Key")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Required env var $var is not set"
    exit 1
  fi
done

# ─── Enable required APIs ───────────────────────────────────────────────────
echo "📋 Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  sqladmin.googleapis.com \
  --project="$PROJECT_ID" --quiet

# ─── Configure Docker for GCR ───────────────────────────────────────────────
gcloud auth configure-docker --quiet

# ─── Build & push API image ─────────────────────────────────────────────────
echo "🔨 Building API server image..."
docker build -f Dockerfile.api \
  -t "gcr.io/$PROJECT_ID/$API_SERVICE:$COMMIT_SHA" \
  -t "gcr.io/$PROJECT_ID/$API_SERVICE:latest" .

echo "📤 Pushing API image..."
docker push "gcr.io/$PROJECT_ID/$API_SERVICE:$COMMIT_SHA"

# ─── Deploy API to Cloud Run ─────────────────────────────────────────────────
echo "🚀 Deploying API to Cloud Run..."
gcloud run deploy "$API_SERVICE" \
  --image="gcr.io/$PROJECT_ID/$API_SERVICE:$COMMIT_SHA" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=${DATABASE_URL},Gemini_API_Key=${Gemini_API_Key},SESSION_SECRET=${SESSION_SECRET:-$(openssl rand -hex 32)}" \
  --project="$PROJECT_ID" \
  --quiet

# ─── Get API URL ──────────────────────────────────────────────────────────────
API_URL=$(gcloud run services describe "$API_SERVICE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')
echo "✅ API deployed at: $API_URL"

# ─── Build & push Web image ──────────────────────────────────────────────────
echo "🔨 Building web frontend image..."
docker build -f Dockerfile.web \
  --build-arg "VITE_GEMINI_API_KEY=${Gemini_API_Key}" \
  --build-arg "VITE_API_BASE_URL=${API_URL}/api" \
  -t "gcr.io/$PROJECT_ID/$WEB_SERVICE:$COMMIT_SHA" \
  -t "gcr.io/$PROJECT_ID/$WEB_SERVICE:latest" .

echo "📤 Pushing web image..."
docker push "gcr.io/$PROJECT_ID/$WEB_SERVICE:$COMMIT_SHA"

# ─── Deploy Web to Cloud Run ─────────────────────────────────────────────────
echo "🚀 Deploying frontend to Cloud Run..."
gcloud run deploy "$WEB_SERVICE" \
  --image="gcr.io/$PROJECT_ID/$WEB_SERVICE:$COMMIT_SHA" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --project="$PROJECT_ID" \
  --quiet

WEB_URL=$(gcloud run services describe "$WEB_SERVICE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')

echo ""
echo "✅ ─── Deployment Complete ──────────────────────────────"
echo "   🌐 Web App:    $WEB_URL"
echo "   🔧 API Server: $API_URL"
echo "   📊 GCP Console: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "────────────────────────────────────────────────────────"
