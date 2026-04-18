"""PPT agent — LangGraph workflow wiring.

Builds the compiled graph that turns a SalesPPTOutput JSON into a .pptx file.

Graph shape:
  START -> visual_planner -> (conditional) -> image_generator -> ppt_renderer -> END
                                  |                                   ^
                                  └── no images ──────────────────────┘

Public API:
  build_graph() -> compiled StateGraph
  run(content: SalesPPTOutput, design_name='corporate_blue')
      -> tuple[bytes, int]  # (pptx bytes, rendered slide count)
"""

from __future__ import annotations

from typing import TypedDict

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph

from pipeline.agents.ppt_agent.nodes.image_generator import generate_images
from pipeline.agents.ppt_agent.nodes.ppt_renderer import render_deck
from pipeline.agents.ppt_agent.nodes.visual_planner import plan
from pipeline.agents.ppt_agent.schema import (
    DeckBlueprint,
    LogicalSlide,
    SalesPPTOutput,
)

load_dotenv()


# ── State ────────────────────────────────────────────────────────────

class PipelineState(TypedDict, total=False):
    content: SalesPPTOutput
    design_name: str
    logical_slides: list[LogicalSlide]
    blueprint: DeckBlueprint
    image_paths: dict[int, str]
    output_bytes: bytes


# ── Node functions ───────────────────────────────────────────────────

def visual_planner_node(state: PipelineState) -> dict:
    """Run the visual planner: expand → Claude → DeckBlueprint."""
    content = state["content"]
    logical_slides, blueprint = plan(content)
    # Override design_name if provided in state.
    if state.get("design_name"):
        blueprint.design_name = state["design_name"]
    return {
        "logical_slides": logical_slides,
        "blueprint": blueprint,
    }


def image_generator_node(state: PipelineState) -> dict:
    """Write FLUX prompts + generate images in parallel."""
    content = state["content"]
    blueprint = state["blueprint"]
    image_paths = generate_images(content, blueprint)
    return {"image_paths": image_paths}


def ppt_renderer_node(state: PipelineState) -> dict:
    """Render the final .pptx deck."""
    content = state["content"]
    blueprint = state["blueprint"]
    output_bytes = render_deck(content, blueprint)
    return {"output_bytes": output_bytes}


# ── Conditional edge ─────────────────────────────────────────────────

def _needs_images(state: PipelineState) -> str:
    """Route to image_generator if any slides need generated images."""
    blueprint = state["blueprint"]
    if blueprint.total_images > 0:
        return "image_generator"
    return "ppt_renderer"


# ── Graph construction ───────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Build and compile the PPT generation graph."""
    graph = StateGraph(PipelineState)

    graph.add_node("visual_planner", visual_planner_node)
    graph.add_node("image_generator", image_generator_node)
    graph.add_node("ppt_renderer", ppt_renderer_node)

    graph.add_edge(START, "visual_planner")
    graph.add_conditional_edges(
        "visual_planner",
        _needs_images,
        {"image_generator": "image_generator", "ppt_renderer": "ppt_renderer"},
    )
    graph.add_edge("image_generator", "ppt_renderer")
    graph.add_edge("ppt_renderer", END)

    return graph.compile()


def run(
    content: SalesPPTOutput,
    design_name: str = "corporate_blue",
) -> tuple[bytes, int]:
    """Run the full pipeline.

    Returns (pptx bytes, rendered slide count from the blueprint).
    The rendered count reflects expand() output: cover + summary +
    why_aziro + differentiators + N main_slides + M use_cases + agenda,
    not just len(content.slides).
    """
    graph = build_graph()
    result = graph.invoke({
        "content": content,
        "design_name": design_name,
    })
    return result["output_bytes"], len(result["blueprint"].slide_blueprints)


if __name__ == "__main__":
    import json
    from pathlib import Path

    from pipeline.agents.ppt_agent.schema import SalesPPTEnvelope

    sample = Path("agent/output/sales_ppt_output.json")
    envelope = SalesPPTEnvelope.model_validate(json.loads(sample.read_text()))

    print("Running full PPT pipeline...\n")
    pptx_bytes, slide_count = run(envelope.sales_ppt)
    print(f"\nDone! {slide_count} slides, {len(pptx_bytes)} bytes.")
