from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv

from pipeline.agents.ppt_agent.prompt import research
from pipeline.agents.ppt_agent.schema import SalesPPTEnvelope
from pipeline.agents.ppt_agent.tools import tavily_extract, tavily_search

load_dotenv()

sys_prompt = research()
llm = init_chat_model("claude-sonnet-4-20250514")


def create_research_agent():
    "Create a sales PPT research agent"
    return create_agent(
        model=llm,
        tools=[tavily_search, tavily_extract],
        system_prompt=sys_prompt,
        response_format=SalesPPTEnvelope,
    )


def run_research_agent(rfp_text: str) -> SalesPPTEnvelope:
    """
    Run the agent on an RFP and return a validated SalesPPTEnvelope.

    Args:
        rfp_text: The raw RFP text to analyze.

    Returns:
        SalesPPTEnvelope — validated Pydantic object.
    """
    agent = create_research_agent()
    inputs = {"messages": [{"role": "user", "content": f"Here is the RFP:\n\n{rfp_text}"}]}

    print("→ Calling agent (waiting for first token)...", flush=True)

    final_state = None
    for mode, payload in agent.stream(inputs, stream_mode=["messages", "values"]):
        if mode == "messages":
            msg_chunk, _meta = payload
            if getattr(msg_chunk, "content", None):
                print(msg_chunk.content, end="", flush=True)
            for tc in getattr(msg_chunk, "tool_call_chunks", []) or []:
                name = tc.get("name") or ""
                args = tc.get("args") or ""
                if name:
                    print(f"\n🛠  tool_call: {name}", flush=True)
                if args:
                    print(args, end="", flush=True)
        elif mode == "values":
            final_state = payload
            msgs = payload.get("messages") or []
            if msgs and type(msgs[-1]).__name__ == "ToolMessage":
                preview = str(msgs[-1].content)[:300].replace("\n", " ")
                print(f"\n📄 tool_result: {preview}...", flush=True)
            print("", flush=True)

    if final_state is None or "structured_response" not in final_state:
        raise RuntimeError("Agent stream ended without producing a structured_response.")

    return final_state["structured_response"]


if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path

    if len(sys.argv) < 2:
        rfp_path = Path(__file__).parent / "rfp.txt"
        if not rfp_path.exists():
            print("Usage: python reserach_agent.py [rfp_text_file]")
            print("       Defaults to agent/rfp.txt if no argument given.")
            sys.exit(1)
    else:
        rfp_path = Path(sys.argv[1])

    rfp_text = rfp_path.read_text()
    print(f"Processing RFP ({len(rfp_text)} chars)...")

    result = run_research_agent(rfp_text)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "sales_ppt_output.json"
    with open(output_path, "w") as f:
        json.dump(result.model_dump(), f, indent=2)

    print(f"\n✓ Saved to {output_path}")
    print(f"  Deck title: {result.sales_ppt.deck_title}")
    print(f"  Slides: {len(result.sales_ppt.slides)}")
    print(f"  Use cases: {len(result.sales_ppt.use_cases)}")
