# CV Optimizer (JobCV) 🚀

AI-powered CV tailoring for job descriptions. Built with **Next.js 16**, **LangGraph**, **LangChain**, and **OpenAI**.

## Features

- **Job type agent** — Classifies roles (software engineering, warehouse, business analyst, etc.) and applies standards (STAR/CAR bullets, required sections)
- **Role intelligence** — Deep job description analysis (archetype, seniority, hidden expectations)
- **Semantic matching** — Multi-dimensional explainable fit scoring (not keyword-only)
- **AI interview** — Probe queue for dates (month/year), JD gaps, implicit traits (leadership, etc.), and section fill-ins (projects, certifications)
- **CV generation** — Section-aware output (projects, certifications, portfolio when required) with measured bullets and provenance guardrails
- **Session workflows** — Resumable LangGraph pipelines via `/api/sessions`

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Redux Toolkit (client UI state)
- **@langchain/langgraph** + **@langchain/openai**
- OpenAI `gpt-4o` / `gpt-4o-mini` + `text-embedding-3-small`
- Redis (optional) or in-memory session store
- Tailwind CSS v4

## Setup

```bash
npm install
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local
npm run dev
npm test          # unit tests (job type standards, date gaps, interview planner)
```

### Required env

```env
OPENAI_API_KEY=sk-...
```

### Optional

```env
REDIS_URL=redis://localhost:6379
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=jobcv-platform
```

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/sessions` | Create workflow session |
| `POST /api/sessions/:id/run` | Run analyze or generate pipeline |
| `POST /api/sessions/:id/message` | Interview turn (or `init: true`) |
| `GET /api/sessions/:id/state` | Poll workflow state |
| `GET /api/sessions/:id/stream` | SSE token stream |
| `POST /api/cv/analyze` | Legacy analyze endpoint |
| `POST /api/cv/generate` | Legacy CV generation |
| `GET /api/health/openai` | OpenAI connectivity check |

## Architecture

```
src/ai/
  agents/       # Job analyzer, scorer, interview, generator, validators
  graphs/       # cvWorkflow.graph, interview.graph
  schemas/      # Zod types (RoleProfile, MatchReport, etc.)
  tools/        # Embeddings, resume parsing
  evals/        # Golden-pair regression harness
src/infrastructure/
  llm/          # OpenAI client (lazy init)
  storage/      # Session store (Redis or memory)
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run eval   # Golden-pair evals (requires OPENAI_API_KEY)
```

## Phase 2

See [src/ai/phase2/README.md](src/ai/phase2/README.md) for Postgres, pgvector, OCR, and auth plans.
