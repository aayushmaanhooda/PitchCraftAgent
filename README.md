# PitchCraft

Turns an RFP into a polished sales response — paste the RFP text and get back an Excel compliance matrix and a tailored PowerPoint pitch deck.

The Excel agent drafts a questionnaire-style response grid; the PPT agent researches the prospect with Tavily, plans each slide's layout and visuals via an LLM, generates images (OpenAI / FLUX), and renders a branded `.pptx`.

For a deep dive into the agentic pipeline, see [`FLOW.md`](./FLOW.md).

---

## Stack

| Layer    | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| Frontend | React 19 · TypeScript · Vite · TailwindCSS · Radix UI · React Router |
| Backend  | FastAPI · SQLModel · LangChain · LangGraph · Pydantic                |
| Storage  | Neon Postgres · AWS S3 (presigned URLs)                              |
| LLMs     | OpenAI (GPT-4o, gpt-image-1) · Anthropic (Claude Sonnet 4) · Tavily  |

---

## Repository layout

```
pitchCraft2/
├── frontend/      React + Vite SPA
├── backend/       FastAPI app + agent pipelines
├── FLOW.md        End-to-end agentic flow walkthrough
└── graphify-out/  Knowledge graph of the backend (HTML / JSON / report)
```

---

## Frontend

A Vite-powered React SPA in `frontend/`. Pages: landing, login/signup, dashboard, and per-project view. Talks to the backend over HTTP with JWT cookie auth and renders the structured JSON preview alongside a download button for the generated artifact.

```bash
cd frontend
npm install
npm run dev      # local dev on :5173
npm run build    # type-check + production bundle into dist/
```

---

## Backend

A FastAPI service in `backend/` that exposes a `/v1` API for auth, customers, and the two agent endpoints. Persistence is SQLModel against Neon Postgres; generated `.xlsx` / `.pptx` bytes are uploaded to S3 and returned to the client as 15-minute presigned URLs.

```bash
cd backend
uv sync
uv run uvicorn main:app --reload    # local dev on :8000
```

Required env vars (see `backend/src/app/core/config.py`): `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `AWS_*`, `S3_BUCKET`, optional `IMAGE_PROVIDER` (`openai` | `flux`).

### Key endpoints

| Method | Path                       | Purpose                                  |
| ------ | -------------------------- | ---------------------------------------- |
| POST   | `/v1/auth/register`        | Email/password signup                    |
| POST   | `/v1/auth/login`           | Issues JWT cookie                        |
| POST   | `/v1/agent/generate-excel` | Run the Excel agent → `.xlsx` + preview  |
| POST   | `/v1/agent/generate-ppt`   | Run the PPT agent → `.pptx` + preview    |

---

## Agents

Three agents drive the pipeline. Both flows follow the same shape: a research stage produces structured JSON, then a LangGraph workflow consumes it and emits the artifact.

- **Research Agent** — ReAct agent (`langchain.agents.create_agent`) with Tavily `search` + `extract` tools. Produces either a `QuestionnaireOutput` (Excel branch, GPT-4o) or a `SalesPPTEnvelope` (PPT branch, Claude Sonnet 4) via Pydantic-validated structured output.
- **Excel Agent** — LangGraph chain that takes `QuestionnaireOutput` and writes a multi-sheet `.xlsx` with `xlsxwriter` (one summary sheet + seven category sheets, frozen headers, coloured priority bands).
- **PPT Agent** — Three-node LangGraph: `visual_planner` → (conditional) `image_generator` → `ppt_renderer`. Structure is deterministic via `expand.py`; the LLM only chooses per-slide visuals under server-side guardrails. Images render in parallel (OpenAI or FLUX), and `python-pptx` composes the deck through a layout registry with swappable themes (`corporate_blue`, `warm_earth`).

All cross-cutting contracts live in a single `ppt_agent/schema.py` — the top god nodes in the codebase are all Pydantic classes.

---

## Deployment

- **Frontend** — Deployed on **Vercel**. SPA fallback configured in `frontend/vercel.json`. Push to main triggers a build + deploy.
- **Backend** — Deployed on **FastAPI Cloud** (`fastapi-cloud-cli`). The entry point is `backend/main.py`, which prepends `src/` to `sys.path` and re-exports `app.main:app`.
- **Database** — Neon Postgres (managed). Connection string via `DATABASE_URL`.
- **Object storage** — AWS S3. Generated artifacts are uploaded under `customers/<user_id>/<customer_id>/{questionnaire.xlsx,deck.pptx}` and served to the frontend as short-lived presigned URLs.
