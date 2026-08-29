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

SHELL := bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := help

export UV_DEFAULT_INDEX := https://pypi.org/simple
export UV_INDEX_URL := https://pypi.org/simple

PROMPT ?= "Hello"

.PHONY: help install lint format format-check typecheck test-unit test-integration test quality run playground sim eval deploy ci build-frontend dev-frontend typecheck-frontend generate-api server dev dev-live

help: ## Show this help message
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install and synchronize all project dependencies with uv
	uv sync

lint: ## Check code quality with ruff and codespell
	uv run ruff check .
	uv run codespell

format: ## Format code with ruff
	uv run ruff format .

format-check: ## Verify code formatting with ruff
	uv run ruff format --check .

typecheck: ## Run static type checking with ty
	uv run ty check

test-unit: ## Run deterministic unit tests
	uv run pytest tests/unit

test-integration: ## Run integration tests
	uv run pytest tests/integration

test: ## Run full test suite (unit + integration)
	uv run pytest tests/unit tests/integration

quality: format-check lint typecheck test ## Composite quality gate (format, lint, typecheck, tests)

pre-commit-install: ## Install pre-commit hook into .git/hooks
	@mkdir -p .git/hooks
	@cp .githooks/pre-commit .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Pre-commit hook installed successfully into .git/hooks/pre-commit"

run: ## Smoke-test the agent locally with agents-cli run
	uv run agents-cli run $(PROMPT)

playground: ## Launch interactive agent playground in web browser
	uv run agents-cli playground

sim: ## Run end-to-end multi-agent campaign planning DAG simulation
	uv run python scripts/test_local_flow.py

eval: ## Run agent evaluations using agents-cli eval
	uv run agents-cli eval run

deploy: ## Deploy agent using agents-cli deploy
	uv run agents-cli deploy --no-confirm-project

ci: quality ## Run full CI checks locally
 
generate-api: ## Generate TypeScript types from api/openapi.yaml
	cd frontend && npm run generate:api

typecheck-frontend: ## Run TypeScript typecheck on frontend
	cd frontend && npm run typecheck

build-frontend: ## Build frontend SPA into frontend/dist
	cd frontend && npm run build

dev-frontend: ## Run frontend local development server with Vite
	cd frontend && npm run dev

server: ## Run local FastAPI orchestrator backend (Method C)
	uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000 --reload

dev: build-frontend ## Build frontend and run full local server with UI (http://localhost:8000/mvc)
	uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000 --reload

dev-live: ## Run FastAPI backend (port 8000) and Vite frontend (port 5173) with hot reload
	@echo "Starting FastAPI backend (:8000) and Vite frontend (:5173) with hot-reload..."
	@trap 'kill 0' EXIT; \
	uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000 --reload & \
	(cd frontend && npm run dev) & \
	wait

