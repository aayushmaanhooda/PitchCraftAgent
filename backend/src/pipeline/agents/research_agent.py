from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from pipeline.llm import llm
from pipeline.prompts.research_prompt import research
from pipeline.tools.web_search import tavily_extract, tavily_search
from app.schemas.excel import QuestionnaireOutput
import json
from dotenv import load_dotenv

load_dotenv()

sys_prompt = research()

def create_questionnaire_agent():
    "Create a questionaire research agent"
    return create_agent(
        model = llm.openai_mini(),
        tools = [tavily_search,tavily_extract],
        system_prompt = sys_prompt,
        response_format = ToolStrategy(QuestionnaireOutput)
    )


def run_questionnaire_agent(rfp_text: str) -> QuestionnaireOutput:
    """
    Run the agent on an RFP and return validated QuestionnaireOutput.
    Token-streams LLM output and prints tool calls/results as they happen.

    Args:
        rfp_text: The raw RFP text to analyze.

    Returns:
        QuestionnaireOutput — validated Pydantic object.
    """
    import sys

    agent = create_questionnaire_agent()
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
    import sys
    from pathlib import Path
 
    if len(sys.argv) < 2:
        print("Usage: python questionnaire_agent.py <rfp_text_file>")
        sys.exit(1)
 
    rfp_text = Path(sys.argv[1]).read_text()
    print(f"Processing RFP ({len(rfp_text)} chars)...")
 
    result = run_questionnaire_agent(rfp_text)
 
    output_dir = Path("src/pipeline/agents/output")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "questionnaire_output.json"
    with open(output_path, "w") as f:
        json.dump(result.model_dump(), f, indent=2)
 
    print(f"\n✓ Saved to {output_path}")
    for cat in [
        "Functional", "Technical", "Design_UX", "Data",
        "Security_Compliance", "Delivery_Governance", "Commercial_Assumptions",
    ]:
        print(f"  {cat}: {len(getattr(result, cat))} questions")
