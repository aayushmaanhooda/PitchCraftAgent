# PitchCraft — End-to-End Agentic Flow

> Built with assistance from a knowledge graph of the backend
> (`graphify-out/graph.json`, 362 nodes / 891 edges / 31 communities).
> Community labels, god-node list, and cross-community bridges all come
> from that graph; the walkthrough below is organized around them.

This document describes the full agentic pipeline inside PitchCraft. It
covers every hop an RFP takes — from the HTTP entry point, through the
research / questionnaire / visual-planning stages, all the way to the
`.xlsx` or `.pptx` artifact that ends up in S3 — and it names each
subsystem the way the extracted graph clusters them.

---

## Table of contents

1. [Three MVP agents at a glance](#1-three-mvp-agents-at-a-glance)
2. [Top-level flow](#2-top-level-flow--what-happens-when-an-rfp-lands)
3. [The FastAPI surface (Community 2)](#3-the-fastapi-surface-community-2)
4. [Research Agent — RFP → structured JSON (Communities 5, 11, 14, 20)](#4-research-agent--rfp--structured-json)
5. [Excel Agent — questionnaire → .xlsx (Community 5)](#5-excel-agent--questionnaire--xlsx-community-5)
6. [PPT Agent — SalesPPTOutput → .pptx (Communities 0, 1, 4, 6, 8, 9)](#6-ppt-agent--salespptoutput--pptx)
   - [6.1 LangGraph shape](#61-langgraph-shape)
   - [6.2 `expand.py` — deterministic backbone](#62-expandpy--deterministic-backbone)
   - [6.3 `visual_planner` — LLM visuals, server-side guardrails](#63-visual_planner--llm-visuals-server-side-guardrails)
   - [6.4 `image_generator` — prompt writer + pixel fan-out](#64-image_generator--prompt-writer--pixel-fan-out)
   - [6.5 `ppt_renderer` — pure dispatch](#65-ppt_renderer--pure-dispatch)
   - [6.6 Theme / Design system (Communities 12, 13)](#66-theme--design-system)
   - [6.7 Icon CDN subsystem (Community 8)](#67-icon-cdn-subsystem-community-8)
7. [Data contracts — the `schema.py` hub (Community 7)](#7-data-contracts--the-schemapy-hub)
8. [Persistence & delivery](#8-persistence--delivery)
9. [Module map](#9-module-map)
10. [Graph insights](#10-graph-insights-what-graphify-surfaced)
11. [TL;DR](#11-tldr)

---

## 1. Three MVP agents at a glance

| Agent          | Framework                                      | Output                                          | Graph community                         |
| -------------- | ---------------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| Research Agent | `langchain.agents.create_agent` (ReAct)        | `SalesPPTEnvelope` / `QuestionnaireOutput` JSON | C5 (Excel/QRA), C2 (PPT Research)       |
| Excel Agent    | LangGraph `StateGraph` + direct LLM            | `.xlsx` bytes                                   | C5 (Excel & Questionnaire Research)     |
| PPT Agent      | LangGraph `StateGraph` (3 nodes, 1 cond. edge) | `.pptx` bytes                                   | C0 Core · C1 Layouts · C4 Planner · C6 Image Gen · C8 Icons · C9 Renderer |

The Excel and PPT agents are completely decoupled from each other — the
frontend decides which to invoke (or both) by calling two different API
endpoints. They share only (a) the FastAPI router layer, (b) S3
persistence, and (c) the `pipeline.llm.LLM` factory.

---

## 2. Top-level flow — "what happens when an RFP lands"

**Both flows follow the same two-stage shape: Research Agent (produces
structured JSON) → LangGraph Workflow (consumes JSON, produces artifact).**
The research step is mandatory on both branches; neither flow writes a
file directly from the RFP.

```
                        ┌──────────────────────────┐
                        │  Frontend (React/Vite)   │
                        │  submits RFP + customer  │
                        └──────────────┬───────────┘
                                       │ HTTP + JWT cookie
                                       ▼
                        ┌──────────────────────────┐
                        │  FastAPI  /v1/agent/*    │   routers/agent.py
                        └─────┬──────────────┬─────┘
                              │              │
                 /generate-excel      /generate-ppt
                              │              │
                              ▼              ▼
            ┌──────────── STAGE 1: RESEARCH (RFP → structured JSON) ─────────────┐
            │                                                                    │
            │  ┌────────────────────────────┐   ┌────────────────────────────┐   │
            │  │ Questionnaire Research     │   │ Sales PPT Research (C2)    │   │
            │  │ (C5) excel_agent.py        │   │ ppt_agent/reserach_agent   │   │
            │  │ generate_questionnaire_    │   │ run_research_agent(rfp)    │   │
            │  │   from_rfp(rfp)            │   │ ReAct + Tavily (sonnet-4)  │   │
            │  │ gpt-4o + structured_output │   │ tools: search, extract     │   │
            │  └──────────┬─────────────────┘   └─────────┬──────────────────┘   │
            │             │                                │                     │
            │             ▼  QuestionnaireOutput           ▼  SalesPPTEnvelope   │
            └─────────────┬───────────────────────────────┬─────────────────────┘
                          │                               │
            ┌──────── STAGE 2: LANGGRAPH WORKFLOW (JSON → artifact bytes) ───────┐
            │                                                                    │
            │  ┌────────────────────────────┐   ┌────────────────────────────┐   │
            │  │ Excel LangGraph (C5)       │   │ PPT LangGraph (C0/4/6/9)   │   │
            │  │ excel_agent.py chain       │   │ ppt_agent.py build_graph() │   │
            │  │                            │   │                            │   │
            │  │ START                      │   │ START                      │   │
            │  │   │                        │   │   │                        │   │
            │  │   ▼                        │   │   ▼                        │   │
            │  │ build_excel                │   │ visual_planner (C4)        │   │
            │  │   │   xlsxwriter →         │   │   expand + Claude +        │   │
            │  │   │   Summary sheet +      │   │   merge + budget           │   │
            │  │   │   7 category sheets    │   │   │                        │   │
            │  │   │                        │   │   ▼  (cond. _needs_images) │   │
            │  │   ▼ (cond. check_beauty)   │   │ image_generator (C6)       │   │
            │  │ beautify_excel (passthru)  │   │   Claude prompts +         │   │
            │  │   │                        │   │   parallel OpenAI/FLUX     │   │
            │  │   ▼                        │   │   │                        │   │
            │  │ END                        │   │   ▼                        │   │
            │  │                            │   │ ppt_renderer (C9)          │   │
            │  │                            │   │   LAYOUT_REGISTRY dispatch │   │
            │  │                            │   │   → layouts (C1)           │   │
            │  │                            │   │   → icons (C8)             │   │
            │  │                            │   │   → theme (C0/12/13)       │   │
            │  │                            │   │   │                        │   │
            │  │                            │   │   ▼                        │   │
            │  │                            │   │ END                        │   │
            │  └──────────┬─────────────────┘   └─────────┬──────────────────┘   │
            │             │  .xlsx bytes                   │  .pptx bytes        │
            └─────────────┬───────────────────────────────┬─────────────────────┘
                          │                               │
                          └───────────────┬───────────────┘
                                          ▼
                                ┌─────────────────────┐
                                │  S3 upload          │
                                │  + presigned URL    │
                                │  + DB key/JSON save │
                                └─────────────────────┘
```

### Symmetry between the two flows

| Stage | Excel branch                                | PPT branch                                     |
| ----- | ------------------------------------------- | ---------------------------------------------- |
| 1. Research | `generate_questionnaire_from_rfp(rfp)` | `run_research_agent(rfp)`                      |
| 1. Model    | `gpt-4o` + `with_structured_output`    | `claude-sonnet-4` ReAct + Tavily               |
| 1. JSON out | `QuestionnaireOutput`                  | `SalesPPTEnvelope { sales_ppt: SalesPPTOutput }` |
| 2. Workflow | `excel_agent.chain` (LangGraph)         | `ppt_agent.build_graph()` (LangGraph)          |
| 2. Nodes    | `build_excel` → (cond.) → `beautify_excel` | `visual_planner` → (cond.) → `image_generator` → `ppt_renderer` |
| 2. Artifact | `.xlsx` bytes                           | `.pptx` bytes                                  |

**Key difference — how "research" is implemented:**
- The **PPT branch** uses a full ReAct agent with Tavily search/extract
  tools so Claude can look up domain-specific context before producing
  the sales payload.
- The **Excel branch** uses a single LLM call with
  `with_structured_output(QuestionnaireOutput)` — no tools, no ReAct
  loop. It's still the "research/JSON-generation stage" conceptually;
  it just doesn't need the web to produce a discovery questionnaire.
- A CLI-only version of the Excel side (`research_agent.py` in
  `pipeline/agents/`) *does* use the full ReAct + Tavily pattern, but
  the API does not call it.

---

## 3. The FastAPI surface (Community 2)

`backend/src/app/routers/agent.py`

This is the one-and-only mediator between the frontend and the agents.
Two endpoints exist, each with an identical outer recipe:

1. `Depends(get_current_user)` — validate JWT, load `User` row.
2. `get_customer_owned(session, user_id, customer_id)` — authz guard.
3. Run the agent pipeline → get structured JSON + artifact bytes.
4. Compute a deterministic `s3_key` from `(user_id, customer_id)`.
5. `upload_bytes(bytes, key, mime)` (`app/aws/s3.py`).
6. Persist `s3_key` + structured JSON onto the `Customer` row
   (`services/customer.py: set_excel_key` / `set_ppt_key` /
   `set_questionnaire_json` / `set_sales_ppt_json`).
7. Return a `*Response` with `generate_presigned_url(key, 900)` so the
   client can download for 15 minutes, plus a `preview` of the raw
   JSON so the UI can render a summary without another round trip.

### S3 key patterns (authoritative)

```
customers/<user_id>/<customer_id>/questionnaire.xlsx
customers/<user_id>/<customer_id>/deck.pptx
```

### Graph view

Community 2 clusters together: `agent.py` router, `customer.py` router,
`services/customer.py`, `aws/s3.py`, `core/config.py`, and — notably —
`ppt_agent/reserach_agent.py`. The router is the bridge point; it's
where the auth / persistence layer meets the agent layer.

---

## 4. Research Agent — RFP → structured JSON

Two variants of the same pattern exist, one per artifact target. Both
use `langchain.agents.create_agent` (a ReAct-style tool-calling agent)
with Tavily `search` + `extract` tools, and a Pydantic `response_format`
that forces structured output on the final message.

### 4a. Questionnaire Research Agent (Community 5 + C14)

`backend/src/pipeline/agents/research_agent.py`

```
  rfp_text ──▶ create_agent(
                   model           = gpt-4o-mini,
                   tools           = [tavily_search, tavily_extract],
                   system_prompt   = research(),             (prompts/research_prompt.py)
                   response_format = ToolStrategy(QuestionnaireOutput),
               )
           ──▶ agent.stream(..., stream_mode=["messages", "values"])   (ReAct loop)
           ──▶ final_state["structured_response"]: QuestionnaireOutput
```

- **Output** — `QuestionnaireOutput` (`app/schemas/excel.py`): seven
  fixed categories (`Functional`, `Technical`, `Design_UX`, `Data`,
  `Security_Compliance`, `Delivery_Governance`, `Commercial_Assumptions`),
  each with 5–15 `Question` objects (`question`, `why_it_matters`,
  `priority` ∈ {High, Medium, Low}, `risk_if_unanswered`).
- **Tools** — `pipeline/tools/web_search.py` wraps
  `langchain_tavily.TavilySearch` (max_results=5, advanced depth) and
  `TavilyExtract` (basic depth).
- **Graph note** — community 14 is a 2-node cluster (the prompt module
  and its `research()` function) — isolated because it's only imported
  by `research_agent.py`.
- **Used from** — the CLI entry point of `research_agent.py` (not the
  API hot path). The API path calls `generate_questionnaire_from_rfp`
  directly instead, skipping Tavily/ReAct to save tokens.

### 4b. Sales-PPT Research Agent (Community 2 + C11)

`backend/src/pipeline/agents/ppt_agent/reserach_agent.py`

```
  rfp_text ──▶ create_agent(
                   model           = claude-sonnet-4-20250514,
                   tools           = [tavily_search, tavily_extract],   (ppt_agent/tools.py)
                   system_prompt   = research(),                        (ppt_agent/prompt.py)
                   response_format = SalesPPTEnvelope,
               )
           ──▶ agent.stream(...)                                        (ReAct loop)
           ──▶ SalesPPTEnvelope { sales_ppt: SalesPPTOutput }
```

- **Output** — `SalesPPTEnvelope { sales_ppt: SalesPPTOutput }`.
  `SalesPPTOutput` is the single largest god node in the graph
  (degree 64). Its fields: `deck_title`, `executive_summary`,
  `proposed_solution_theme`, `why_aziro[]` (≥3), `differentiators[]`
  (≥3), `recommended_agenda[]`, `slides[]` (≥5), `use_cases[]` (≥1).
- **Prompt** — community 11 (`prompt.py` + `research()` +
  `visual_planner()`). `research()` tells Claude to scout the industry
  via Tavily and produce the full sales payload; `visual_planner()` is
  an alternate prompt retained from earlier iteration but the active
  planner lives in `nodes/visual_planner.py` with its own prompt.
- **Why streaming?** Both research agents consume
  `agent.stream(...)` in `["messages", "values"]` mode to print token
  deltas and tool calls to stdout for observability. The final
  `structured_response` is pulled from the terminal `values` payload.
- **Graph note** — this file lives in Community 2 (FastAPI Surface)
  because it is imported directly by the router.

### Research agent state-machine shape

```
  ┌───────────────┐     tool_calls       ┌──────────────┐
  │  model step   ├────────────────────▶ │  tool step   │
  │  (LLM)        │                      │  (Tavily)    │
  └──────┬────────┘ ◀──── tool_result ───┴──────────────┘
         │
         │ when response_format satisfied
         ▼
  structured_response (pydantic-validated)
```

---

## 5. Excel Agent — questionnaire → `.xlsx` (Community 5)

`backend/src/pipeline/agents/excel_agent.py`

Community 5 ties together `excel_agent.py`, `research_agent.py`, and
`pipeline/llm.py` — they co-cluster because the Excel agent re-uses the
same LLM factory and calls into the same `QuestionnaireOutput` schema
that the Questionnaire Research Agent produces.

### 5.1 Hot path (used by `/generate-excel`)

```
  rfp_text
     │
     ▼
  generate_questionnaire_from_rfp(rfp_text)                      excel_agent.py
     │   llm = gpt-4o (via pipeline.llm.LLM.openai())
     │   structured_llm = llm.with_structured_output(QuestionnaireOutput)
     │   structured_llm.invoke([EXCEL_SYSTEM_PROMPT, rfp])       prompts/excel_prompt.py
     ▼
  QuestionnaireOutput  (Pydantic — seven categories of Question)
     │
     ▼
  generate_excel_from_questionnaire(questionnaire)
     │   _write_excel_to_buffer(questionnaire)
     │       xlsxwriter.Workbook(buf, in_memory=True)
     │         ├─ Summary sheet: Category | Question Count
     │         └─ one sheet per category (name truncated to 31 chars):
     │              columns: # | Question | Why It Matters | Priority |
     │                       Risk If Unanswered
     │       header_format: bold, bg #D9EAF7, border
     │       priority_format: centered, border
     │       text_format: wrapped, top-aligned, border
     │       freeze_panes(1, 0)
     ▼
  io.BytesIO  (xlsx bytes)
     │
     ▼
  upload_bytes(buf.getvalue(), key="customers/<user>/<customer>/questionnaire.xlsx", mime=xlsx)
  set_excel_key(session, customer, key)
  set_questionnaire_json(session, customer, questionnaire.model_dump())
     │
     ▼
  GenerateExcelResponse { customer_id, excel_s3_key, excel_url (presigned), preview }
```

Note: the hot path **does not** use Tavily / ReAct. It goes straight
to an LLM call via `with_structured_output` for determinism and cost.
The full ReAct + Tavily flow is reserved for the CLI
`python research_agent.py <rfp.txt>` entry point.

### 5.2 LangGraph file-to-file flow (CLI only)

Retained for batch / offline usage on disk. Not hit by the API.

```
  State(TypedDict) { input_json_path, output_excel_path, beautify_excel }

  START ──▶ build_excel ──┬──── check_beauty_input == "Yes" ──▶ beautify_excel ──▶ END
                          └──── "No" ──────────────────────────────────────────▶ END
```

- `build_excel`: load `QuestionnaireOutput` JSON from disk → write xlsx.
- `beautify_excel`: current identity passthrough — reserved placeholder.
- `check_beauty_input`: conditional edge reading `state.beautify_excel`.

---

## 6. PPT Agent — `SalesPPTOutput` → `.pptx`

Compiled LangGraph `StateGraph` with three nodes and one conditional
edge. The state is a `PipelineState` TypedDict carrying `content`,
`design_name`, `logical_slides`, `blueprint`, `image_paths`,
`output_bytes`.

**Entry**: `ppt_agent.run(content: SalesPPTOutput, design_name) -> (bytes, int)`

### 6.1 LangGraph shape

```
  START
    │
    ▼
  visual_planner_node            nodes/visual_planner.py       ── Community 4
    │   1. expand(content)                     — deterministic structure
    │   2. image_budget = floor(N * 0.5)
    │   3. Claude sonnet-4 ─▶ PlannerChoices   — visuals only
    │   4. _merge_choices(logical, choices)    — server-side merge
    │       └─ HARDWIRED layout per content_source wins
    │   5. _enforce_image_budget(blueprints, budget)
    │   ──▶ (logical_slides, DeckBlueprint)
    │
    ▼
  ┌─ _needs_images(state) ─┐
  │ blueprint.total_images │
  │      > 0 ?             │
  └─────────┬──────────────┘
            │
   yes ─────┼───── no
            │             │
            ▼             ▼
  image_generator_node    │   nodes/image_generator.py          ── Community 6
    │   a. Claude writes FLUX prompts (design-aware palette)
    │       hardcoded cover + summary_solution templates,
    │       LLM-written for the rest (main_slide hero_image)
    │   b. Parallel pixel generation (ThreadPoolExecutor)
    │       provider = IMAGE_PROVIDER env var
    │           openai → gpt-image-1   (max_workers=3, retry on 429)
    │           flux   → Modal FLUX    (max_workers=10)
    │   c. Write PNGs to agent/output/tmp/slide_<pos>.png
    │   d. Attach generated_image_path back to each SlideBlueprint
    │
    └────────────▶
                   ▼
  ppt_renderer_node            nodes/ppt_renderer.py            ── Community 9
    │   resolve Design via get_design(blueprint.design_name)
    │   Presentation() — 16:9
    │   for bp in blueprint.slide_blueprints (sorted by position):
    │       render_fn = LAYOUT_REGISTRY[bp.layout]
    │       render_fn(prs, content, bp, design)                 ── Community 1
    │       └─ each render_fn draws via layout_helpers / image_helpers / icon_helpers
    │   prs.save(buf) ──▶ pptx bytes
    │
    ▼
  END
```

**Verified call path** (from the graph):
`generate_ppt()` → `run()` → `ppt_agent.py` → `ppt_renderer_node()` → `render_deck()` → `LAYOUT_REGISTRY[layout].render()`.

### 6.2 `expand.py` — deterministic backbone

`scripts/content/expand.py` turns a `SalesPPTOutput` into an ordered
`list[LogicalSlide]`. This is the single source of truth for deck
structure; the LLM is never allowed to reorder or relabel slides.

Emission order (total = 5 + N_slides + M_use_cases):

| # | content_source             | content                                                 |
| - | -------------------------- | ------------------------------------------------------- |
| 1 | `deck_title`               | cover                                                   |
| 2 | `deck_summary_solution`    | merges `executive_summary` + `proposed_solution_theme`  |
| 3 | `deck_why_aziro`           | bullets from `why_aziro[]`                              |
| 4 | `deck_differentiators`     | bullets from `differentiators[]`                        |
| 5 | `main_slide` × N           | one per `content.slides[i]`                             |
| 6 | `use_case`   × M           | one per `content.use_cases[i]`                          |
| 7 | `deck_agenda`              | always last                                             |

Each `LogicalSlide` carries only `(position, content_source, content_index)`.
Because `theme` is rendered both on the cover AND the summary_solution
slide, it is not emitted as a standalone logical slide.

### 6.3 `visual_planner` — LLM visuals, server-side guardrails

The LLM (Claude Sonnet 4) only decides per-slide visuals: `layout`,
`image_source`, `icons`, `density_verdict`, and optional
`simplified_bullets`. It is **explicitly forbidden** from affecting
structure, and its structural output is discarded on merge.

Structural invariants are enforced server-side after the LLM returns:

**`HARDWIRED` table** (`visual_planner.py`):

| content_source            | layout             | image_source |
| ------------------------- | ------------------ | ------------ |
| `deck_title`              | `title_card`       | `generated`  |
| `deck_summary_solution`   | `summary_solution` | `generated`  |
| `deck_why_aziro`          | `icon_grid`        | `none`       |
| `deck_differentiators`    | `icon_grid`        | `none`       |
| `deck_agenda`             | `bullets_only`     | `none`       |
| `use_case`                | `two_column`       | `none`       |

If Claude picks something different for those, the HARDWIRED entry wins.

**`_MAIN_SLIDE_LAYOUTS`**: main_slides are constrained to
`{hero_image, icon_grid, bullets_only, cta}`; anything else falls back
to `bullets_only`. Consistency is enforced between layout and image:
- `hero_image` forces `image_source = generated`.
- `image_source = generated` forces `layout = hero_image`.

**`_enforce_image_budget`**: if Claude over-allocates beyond
`floor(N × 0.5)` generated images, excess `hero_image` main_slides are
downgraded to `bullets_only` (reverse-position order — later slides
first, on the theory that later main_slides are less visually
important). The two hardwired generated slots (`title_card` +
`summary_solution`) are untouchable.

Output: `DeckBlueprint { total_images, slide_blueprints[], design_name }`.

### 6.4 `image_generator` — prompt writer + pixel fan-out

This node runs only when `blueprint.total_images > 0` (conditional edge).

#### Step 1 — prompt writing

Split into two deterministic + LLM-assisted paths:

- **Cover (`deck_title`)** and **summary (`deck_summary_solution`)** —
  hardcoded templates `_COVER_PROMPT_TEMPLATE` /
  `_SUMMARY_PROMPT_TEMPLATE` fused with `design.palette_hint`. No LLM
  involved; the same deck + design always yields the same image prompt.
- **All other image slides** — sent to Claude sonnet-4 with a
  palette-aware system prompt (`_build_prompt_writer_system(design)`)
  that hard-requires verbatim phrasing for style + palette. Output is
  a `PlannerChoice`-style `ImagePromptsResult { prompts[] }`.

The LLM is told:

- Style words must appear verbatim (`minimalist flat vector
  illustration, editorial magazine style`, `bold simple shapes, thick
  clean outlines, generous negative space`, `one soft drop shadow per
  element`, `no gradients...`, `tack-sharp crisp edges...`).
- Palette phrase comes from `design.palette_hint` — no substitutes.
- One concrete central metaphor, 35–55 words, no people / text /
  faces / logos / hands / body parts.

#### Step 2 — pixel generation

```
  provider ∈ {openai, flux}        ← IMAGE_PROVIDER env var (default openai)
     │
     ▼
  _PROVIDER_MAX_WORKERS = { openai: 3, flux: 10 }
  ThreadPoolExecutor(max_workers)
     │
     ├─▶ _generate_openai(pos, prompt):
     │     client.images.generate(model="gpt-image-1", size=1024x1024, quality=high)
     │     b64 = result.data[0].b64_json
     │     write PNG to agent/output/tmp/slide_<pos>.png
     │     retry ≤ 5 times on RateLimitError honoring "try again in Xs" hint
     │
     └─▶ _generate_flux(pos, prompt):
           flux_client.generate_image(prompt, 1280x1280, steps=45) → bytes
           write PNG
           NB: flux_client.py is "FLUX-shaped" but proxies to OpenAI under
           the hood (see flux_client module docstring). The FLUX pathway
           via Modal remains as an interface but is not currently wired up.
```

#### Step 3 — attach paths

For each slide with a generated image:

```python
bp.image_prompt = prompts[bp.position]
bp.generated_image_path = str(paths[bp.position])
```

These mutated `SlideBlueprint`s flow downstream into the renderer.

### 6.5 `ppt_renderer` — pure dispatch

`nodes/ppt_renderer.py` contains no LLM, no network. It:

1. Resolves the active `Design` via `get_design(blueprint.design_name)`.
2. Creates a `Presentation()` with 16:9 dimensions (`SLIDE_WIDTH`,
   `SLIDE_HEIGHT` from `render/layout_helpers.py`).
3. Iterates `blueprint.slide_blueprints` in position order.
4. Looks up `LAYOUT_REGISTRY[bp.layout]` and calls
   `render(prs, content, bp, design)`.
5. `prs.save(io.BytesIO()) -> bytes`.

**`LAYOUT_REGISTRY`** (`scripts/layouts/__init__.py`):

```python
{
    LayoutType.TITLE_CARD:        title_card.render,
    LayoutType.BULLETS_ONLY:      bullets_only.render,
    LayoutType.ICON_GRID:         icon_grid.render,
    LayoutType.TWO_COLUMN:        two_column.render,
    LayoutType.HERO_IMAGE:        hero_image.render,
    LayoutType.CTA:               cta.render,
    LayoutType.SUMMARY_SOLUTION:  summary_solution.render,
}
```

Each sibling module under `scripts/layouts/` exports
`render(prs, content, blueprint, design) -> None` — one file per
visual treatment. Adding a layout = add a new file + one entry in the
registry; no existing layout is modified. The graph shows
`render()` as a cross-community bridge node (betweenness 0.093)
because it exists in every layout file but is dispatched through
`ppt_renderer_render_deck` (C9) and calls into icon / image helpers
(C8, C1).

Shared rendering primitives live in `scripts/render/`:

- `layout_helpers.py` — EMU arithmetic, SLIDE_WIDTH/HEIGHT, hex→RGB,
  `fill_background`, etc. (bridges into the Design god node).
- `image_helpers.py` — place generated images onto a slide.
- `icon_helpers.py` — Font Awesome CDN icon fetching (see 6.7).

### 6.6 Theme / Design system

Three communities participate:

- **C0 (PPT Agent Core & Rationale)** — includes
  `scripts/theme/base_design.py` which defines the `Design` class.
  This class is the **2nd-biggest god node in the graph (degree 55)** —
  it bridges layout renderers, image prompt writers, and the renderer
  module.
- **C12 (Warm Earth Design)** — `design/warm_earth.py`, concrete
  instance of `Design`.
- **C13 (Corporate Blue Design)** — `design/corporate_blue.py`,
  concrete instance of `Design`.

`get_design(name)` (`scripts/theme/__init__.py`) resolves name →
instance. Each `Design` exposes palette hex codes, `palette_hint`
(the verbatim phrase that every FLUX prompt injects for colour
consistency), and font choices. The API exposes the choice via
`DesignName` enum on `GeneratePPTRequest` — currently
`corporate_blue` (default) or `warm_earth`.

A new design = new `Design` subclass file + register key in theme
registry — zero changes to planner / renderer / image prompts.

### 6.7 Icon CDN subsystem (Community 8)

18-node community centered on `scripts/render/icon_helpers.py`.

Responsibilities:
- `cdn_icon_exists(name)` — quick HEAD on the Font Awesome CDN.
- `download_icon(name)` — fetch a specific Font Awesome 6 Free solid
  icon PNG to the local cache.
- `download_base_icons()` — prime the cache for the common set.
- `get_icon_png(name)` — return the cached path (downloads on miss).
- `load_fallback_cache()` — fallback to bundled icons if CDN fails.

Used by `icon_grid.render` (C1) when a slide has
`layout = icon_grid`. Claude chooses icon names in the planner
(Font Awesome 6 Free solid, no `fa-` prefix, one per bullet).

---

## 7. Data contracts — the `schema.py` hub

Community 7 (Pydantic request/response schemas) and C4 (deck schema)
together host every Pydantic type. The graph's **top 10 god nodes are
all pydantic classes** — evidence that this is a schema-centric codebase:

| God node            | Degree | Lives in                     | Role                                             |
| ------------------- | -----: | ---------------------------- | ------------------------------------------------ |
| `SalesPPTOutput`    |     64 | `ppt_agent/schema.py`        | The research agent's contract with the PPT agent |
| `Design`            |     55 | `scripts/theme/base_design.py`| The theme contract with layouts + image prompts |
| `SlideBlueprint`    |     53 | `ppt_agent/schema.py`        | Per-slide visual plan from the planner          |
| `ContentSource`     |     52 | `ppt_agent/schema.py`        | Enum driving HARDWIRED + layout dispatch        |
| `SalesPPTEnvelope`  |     43 | `ppt_agent/schema.py`        | `{ sales_ppt: SalesPPTOutput }` wrapper         |
| `DeckBlueprint`     |     42 | `ppt_agent/schema.py`        | Full-deck plan emitted by planner               |
| `DensityVerdict`    |     29 | `ppt_agent/schema.py`        | Per-slide simplify-or-not flag                  |
| `LogicalSlide`      |     24 | `ppt_agent/schema.py`        | Structural output of `expand()`                 |
| `LayoutType`        |     15 | `ppt_agent/schema.py`        | Enum keyed into `LAYOUT_REGISTRY`               |
| `ImageSource`       |     14 | `ppt_agent/schema.py`        | `{generated, none}` per slide                   |

All of them are defined in a **single file** — `ppt_agent/schema.py` —
which makes changes to the agent contract a single-file diff and keeps
the planner / renderer / image_generator decoupled from each other.

### The contract chain

```
  SalesPPTEnvelope  ──────▶  SalesPPTOutput  (research agent → PPT agent)
                                  │
                                  ▼
                             LogicalSlide[]  (expand.py)
                                  │
                                  ▼
                             SlideBlueprint[]  (visual_planner)
                                  │
                                  ▼
                             DeckBlueprint  (planner output)
                                  │
                                  ▼
                              .pptx bytes   (ppt_renderer)
```

---

## 8. Persistence & delivery

After the agents:

```
  bytes ──▶ upload_bytes(bytes, s3_key, mime)        app/aws/s3.py
        │
        │   mime constants:
        │     _XLSX_MIME = application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        │     _PPTX_MIME = application/vnd.openxmlformats-officedocument.presentationml.presentation
        │
        ▼
  set_excel_key / set_ppt_key                        services/customer.py
  set_questionnaire_json / set_sales_ppt_json
        │
        ▼
  generate_presigned_url(s3_key, expires_in=900)    _PRESIGN_TTL = 15*60
        │
        ▼
  GenerateExcelResponse / GeneratePPTResponse → frontend
```

The response includes both:
- the presigned download URL (for "Download" button), and
- the raw structured JSON (`preview` / `sales_ppt`) so the UI can
  render a summary without another round trip.

Auth (Community 3, 38 nodes) is an entirely separate subgraph — it has
no edges to the agent pipeline beyond the `Depends(get_current_user)`
hook on the two router functions. The agent pipeline does not read /
write user state; only the router does.

---

## 9. Module map

```
backend/src/
├── app/
│   ├── main.py                       FastAPI app + /v1 mount + CORS
│   ├── routers/
│   │   ├── agent.py                  /generate-excel, /generate-ppt        ── C2
│   │   ├── auth.py                   login / register / google / me        ── C3
│   │   └── customer.py               CRUD for Customer rows                ── C2
│   ├── schemas/                                                            ── C7
│   │   ├── auth.py                   LoginRequest / RegisterRequest / UserRead
│   │   ├── customer.py               CustomerCreate / CustomerRead
│   │   ├── excel.py                  QuestionnaireOutput + GenerateExcelReq/Resp
│   │   ├── ppt.py                    GeneratePPTReq/Resp + DesignName enum
│   │   └── tables.py                 SQLModel ORM (User, Customer)
│   ├── services/
│   │   ├── auth/                     auth_service.* (password + google)    ── C3
│   │   └── customer.py               persistence: set_*_key / *_json        ── C2
│   ├── aws/s3.py                     boto3 upload + presign                 ── C2
│   └── core/
│       ├── config.py                 Settings via pydantic-settings         ── C2
│       ├── db.py                     SQLModel engine + get_session
│       └── logger.py                                                        ── C27
│
└── pipeline/
    ├── llm.py                        LLM factory: openai / openai_mini /    ── C5
    │                                              anthropic / gemma4
    ├── prompts/
    │   ├── excel_prompt.py           EXCEL_SYSTEM_PROMPT                    ── C19
    │   ├── research_prompt.py        questionnaire research()               ── C14
    │   └── ppt_prompt.py             alt PPT research prompt                ── C20
    ├── tools/web_search.py           tavily_search, tavily_extract          ── C15
    ├── modal/                        historical Modal FLUX wrapper          ── C6
    │   ├── flux.py                   FluxModel (Modal app)
    │   ├── gemma.py
    │   ├── local.py                  `modal run …` smoke test
    │   └── utils.py                                                         ── C21
    └── agents/
        ├── research_agent.py         questionnaire ReAct agent              ── C5
        ├── excel_agent.py            LLM → QuestionnaireOutput → .xlsx      ── C5
        └── ppt_agent/
            ├── __init__.py           (empty, package marker)                ── C17
            ├── ppt_agent.py          LangGraph StateGraph: visual_planner → (cond) →
            │                         image_generator → ppt_renderer        ── C0
            ├── reserach_agent.py     SalesPPTEnvelope ReAct agent           ── C2
            ├── prompt.py             research() + visual_planner()          ── C11
            ├── schema.py             all deck-side pydantic types           ── C4/C7
            ├── tools.py              Tavily wrappers                        ── C16
            ├── modal/                                                        ── C6
            │   └── flux_client.py    image backend (OpenAI-backed, FLUX-shaped API)
            ├── nodes/
            │   ├── visual_planner.py   expand + Claude + merge + budget    ── C4
            │   ├── image_generator.py  prompt writer + parallel image gen   ── C6
            │   └── ppt_renderer.py     LAYOUT_REGISTRY dispatch             ── C9
            └── scripts/
                ├── content/expand.py   deterministic LogicalSlide emission ── C4
                ├── layouts/*.py        one file per LayoutType              ── C1
                │    bullets_only, cta, hero_image, icon_grid,
                │    summary_solution, title_card, two_column
                ├── render/
                │   ├── layout_helpers.py  SLIDE_WIDTH, EMU, fill_background ── C1
                │   ├── image_helpers.py   place image shapes                ── C1
                │   └── icon_helpers.py    Font Awesome CDN cache            ── C8
                └── theme/
                    ├── base_design.py     Design class (god node, d=55)     ── C0
                    └── design/
                        ├── corporate_blue.py                                ── C13
                        └── warm_earth.py                                    ── C12
```

Community key (from graphify clustering):

| Cx | Label                              | Nodes | Role                                    |
|---:| ---------------------------------- | ----: | --------------------------------------- |
| C0 | PPT Agent Core & Rationale         |    69 | `ppt_agent.py`, Design, rationale nodes |
| C1 | PPT Layout Renderers               |    46 | 7 layout files + render helpers         |
| C2 | FastAPI Surface & S3 Delivery      |    38 | routers, services, S3, PPT research     |
| C3 | Auth & User Identity               |    38 | auth router, auth services              |
| C4 | Visual Planning & Deck Schema      |    34 | visual_planner.py, schema.py, expand    |
| C5 | Excel Agent & Questionnaire Research | 27  | excel_agent, research_agent, llm        |
| C6 | Image Generation Backend           |    27 | flux_client, image_generator, modal     |
| C7 | Request/Response Schemas           |    19 | pydantic schemas package                |
| C8 | Font Awesome Icon Helpers          |    18 | icon CDN cache                          |
| C9 | PPT Renderer Dispatch              |    14 | ppt_renderer + theme package roots      |

---

## 10. Graph insights — what graphify surfaced

These are worth calling out because they're non-obvious from reading
the code sequentially:

### God nodes (most-connected entities)

All 10 top god nodes are Pydantic schema classes — evidence this is a
**schema-driven architecture**, where the agent contract is the
vocabulary everyone speaks. If you change `SalesPPTOutput`, you touch
64 other nodes.

```
SalesPPTOutput     64   - research agent ↔ PPT agent contract
Design             55   - theme ↔ layouts ↔ image prompts
SlideBlueprint     53   - planner output ↔ renderer input
ContentSource      52   - enum driving HARDWIRED + dispatch
SalesPPTEnvelope   43   - {sales_ppt: …} wrapper
DeckBlueprint      42   - full-deck plan
DensityVerdict     29   - simplify-or-not per slide
LogicalSlide       24   - expand() output
LayoutType         15   - LAYOUT_REGISTRY key
ImageSource        14   - {generated, none}
```

### Cross-community bridges (high-betweenness nodes)

- **`SalesPPTOutput`** bridges C0 ↔ C9 ↔ C4 ↔ C7. It's the single
  object that enters the PPT agent from the research side and
  propagates all the way to the renderer. Every node in the agent
  reads from it.
- **`Design`** bridges C0 ↔ C1 ↔ C12 ↔ C13 ↔ C9. It's the *theme*
  contract — layout files read it for colours, image_generator reads
  it for palette phrasing, renderer reads it for background fills.
- **`render()`** bridges C1 ↔ C0 ↔ C8. The dispatch function in each
  layout file connects the renderer (C9) to layout helpers (C1), icon
  subsystem (C8), and theme (C0).

### Isolated subgraphs

- **Auth (C3)** has zero edges into the agent pipeline — only the
  `Depends(get_current_user)` hook on the router functions touches it.
  This is a clean separation.
- **Community 10 (RFP Domain: ERP/Acumatica)** is 7 nodes of
  document-extracted concepts (Acumatica, manual_payments, reporting,
  reconciliation, RFP email, security/compliance, integration) — a
  domain ontology scraped from a sample RFP in the repo. Not part of
  the runtime flow; a leftover artifact from a prior test run.

### Surprising edges (flagged INFERRED by the extractor)

graphify flagged 50+ INFERRED edges into `SalesPPTOutput` / `Design` /
`SlideBlueprint`. Worth spot-checking when refactoring — they are
model-reasoned "reaches this hub" relations rather than direct calls.
Most are real (any function with `content:` or `design:` in its
signature counts), but not all need to stay if the hub shrinks.

---

## 11. TL;DR

- **Research Agent** converts the raw RFP into structured JSON —
  either a seven-category questionnaire or a full sales PPT payload —
  via a ReAct loop with Tavily tools and a Pydantic-validated final
  message. Two implementations, same shape.
- **Excel Agent** (Community 5) is a thin LangGraph wrapper around an
  LLM + xlsxwriter that turns `QuestionnaireOutput` into a multi-sheet
  `.xlsx` (one summary sheet + one per category, with frozen headers
  and a coloured header band).
- **PPT Agent** is the heavy one: a three-node LangGraph where
  `expand.py` (C4) makes structure deterministic, Claude only picks
  visuals under server-side guardrails, image prompts are written by
  Claude against a design-specific palette, images are rendered in
  parallel via OpenAI/FLUX (C6), and python-pptx composes the final
  deck through a layout registry (C1/C9). All cross-cutting contracts
  live in a **single `schema.py`** file.
- The **FastAPI router** is the only mediator between the frontend and
  the agents. It handles auth, customer ownership, S3 upload, DB
  persistence, and returns a presigned URL + preview JSON.
- The graph's **top 10 god nodes are all pydantic classes** — this is
  a schema-centric codebase. The two big cross-cutting bridges are
  `SalesPPTOutput` (content) and `Design` (theme). Touch those and
  you touch everything.

---

_Graph artifacts: `graphify-out/graph.html` (interactive),
`graphify-out/GRAPH_REPORT.md` (audit), `graphify-out/graph.json` (raw)._
