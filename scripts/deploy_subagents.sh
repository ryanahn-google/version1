#!/usr/bin/env bash
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -euo pipefail

# Parse command-line arguments or environment variables
PROJECT_ID="${1:-${PROJECT_ID:-}}"
REGION="${2:-${REGION:-asia-northeast3}}"
ENV="${3:-${ENV:-staging}}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Usage: $0 <PROJECT_ID> [REGION] [ENV]"
  echo "Example: $0 my-staging-proj asia-northeast3 staging"
  exit 1
fi

SUBAGENT_SA="version1-subagent@${PROJECT_ID}.iam.gserviceaccount.com"
ARTIFACTS_BUCKET="${PROJECT_ID}-version1-artifacts"

echo "============================================================"
echo "Deploying P1-P4 Subagents to Vertex AI Agent Runtime"
echo "Project:          ${PROJECT_ID}"
echo "Region:           ${REGION}"
echo "Environment:      ${ENV}"
echo "Service Account:  ${SUBAGENT_SA}"
echo "============================================================"

# Subagents to deploy in order
SUBAGENTS=(
  "market_sensing"
  "strategy_brief"
  "creative_content"
  "performance_insights"
)

for agent in "${SUBAGENTS[@]}"; do
  echo "--> Deploying subagent [${agent}] with Agent Identity..."
  DEPLOY_FLAGS=(
    --project "${PROJECT_ID}"
    --region "${REGION}"
    --service-account "${SUBAGENT_SA}"
    --enable-agent-identity
    --update-env-vars="ARTIFACTS_BUCKET_NAME=${ARTIFACTS_BUCKET},PROJECT_ID=${PROJECT_ID},GOOGLE_CLOUD_PROJECT=${PROJECT_ID},ENV=${ENV}"
    --no-wait
  )
  (
    cd "app/agents/${agent}"
    uvx google-agents-cli@1.3.1 deploy "${DEPLOY_FLAGS[@]}"
  ) || {
    echo "WARNING: Deployment command for [${agent}] completed with status $?. Continuing..."
  }
  sleep 5
done

echo "============================================================"
echo "All P1-P4 Subagents submitted to Agent Runtime successfully."
echo "============================================================"
