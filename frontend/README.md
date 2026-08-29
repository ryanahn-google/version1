# Marketing Value Creator (MVC) — Frontend

Enterprise 3-Panel Campaign Console for Nova Electronics Corp, built with React 19, TypeScript, Vite, and Tailwind CSS.

## Features
- **3-Panel Command Center**:
  - **Left**: Campaign parameter configuration (Brand, Product, Objective, Budget, Channels) & Golden Scenario pre-fill.
  - **Center**: 4-Stage Multi-Agent DAG pipeline stepper ([P1] Market Sensing $\to$ [P2] Strategy & Brief $\to$ [P3] Creative Content $\to$ [P4] Performance & Insights) with live SSE thought logs.
  - **Right**: Deliverable inspector with custom views for structured briefs, Imagen 3 visual lightbox, budget tables, and raw JSON.
- **Human-in-the-Loop (HITL) Gate**: Sticky review action bar with approval transition and targeted revision feedback modal.
- **Contract-First & Zero-Drift**: All TypeScript models are generated from `api/openapi.yaml` via `openapi-typescript`.
- **Single-Origin Deployment**: Built bundle is served directly from FastAPI (`/static/` & `/mvc`) on Cloud Run.

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Types from OpenAPI Contract
```bash
npm run generate:api
```

### 3. Local Development Server
```bash
npm run dev
```
Runs Vite dev server on `http://localhost:5173`, proxying `/api`, `/healthz`, `/meta`, `/run_sse` to backend `http://localhost:8000`.

### 4. Build for Production
```bash
npm run build
```
Outputs static bundle to `dist/`.

### 5. Typecheck
```bash
npm run typecheck
```
