from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import xlsxwriter
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from app.schemas.excel import QuestionnaireOutput
from pipeline.llm import llm
from pipeline.prompts.excel_prompt import EXCEL_SYSTEM_PROMPT


class State(TypedDict, total=False):
    input_json_path: str
    output_excel_path: str
    questionnaire: dict[str, Any]
    beautify_excel: bool


def _write_excel_to_buffer(questionnaire: QuestionnaireOutput) -> io.BytesIO:
    """Build the Excel workbook in memory and return a BytesIO buffer."""
    buf = io.BytesIO()
    workbook = xlsxwriter.Workbook(buf, {"in_memory": True})

    header_format = workbook.add_format({"bold": True, "bg_color": "#D9EAF7", "border": 1})
    text_format = workbook.add_format({"text_wrap": True, "valign": "top", "border": 1})
    priority_format = workbook.add_format({"align": "center", "valign": "top", "border": 1})

    summary_sheet = workbook.add_worksheet("Summary")
    summary_sheet.write_row(0, 0, ["Category", "Question Count"], header_format)

    categories = questionnaire.model_dump()
    for row_idx, (category, questions) in enumerate(categories.items(), start=1):
        summary_sheet.write(row_idx, 0, category, text_format)
        summary_sheet.write(row_idx, 1, len(questions), text_format)

        sheet_name = category[:31]
        worksheet = workbook.add_worksheet(sheet_name)
        worksheet.write_row(
            0,
            0,
            ["#", "Question", "Why It Matters", "Priority", "Risk If Unanswered"],
            header_format,
        )

        worksheet.set_column(0, 0, 6)
        worksheet.set_column(1, 1, 48)
        worksheet.set_column(2, 2, 42)
        worksheet.set_column(3, 3, 12)
        worksheet.set_column(4, 4, 42)

        for question_idx, question in enumerate(questions, start=1):
            worksheet.write(question_idx, 0, question_idx, text_format)
            worksheet.write(question_idx, 1, question["question"], text_format)
            worksheet.write(question_idx, 2, question["why_it_matters"], text_format)
            worksheet.write(question_idx, 3, question["priority"], priority_format)
            worksheet.write(question_idx, 4, question["risk_if_unanswered"], text_format)

        worksheet.freeze_panes(1, 0)

    summary_sheet.set_column(0, 0, 28)
    summary_sheet.set_column(1, 1, 16)
    summary_sheet.freeze_panes(1, 0)
    workbook.close()

    buf.seek(0)
    return buf


def generate_questionnaire_from_rfp(rfp_text: str) -> QuestionnaireOutput:
    """Take raw RFP text and produce a structured questionnaire."""
    model = llm.openai()
    structured_llm = model.with_structured_output(QuestionnaireOutput)
    return structured_llm.invoke(
        [
            {"role": "system", "content": EXCEL_SYSTEM_PROMPT},
            {"role": "user", "content": f"Here is the RFP:\n\n{rfp_text}"},
        ]
    )


def generate_excel_from_questionnaire(questionnaire: QuestionnaireOutput) -> io.BytesIO:
    """Build an Excel workbook from an already generated questionnaire."""
    return _write_excel_to_buffer(questionnaire)


def generate_excel_from_rfp(rfp_text: str) -> io.BytesIO:
    """Take raw RFP text, call the LLM to produce a questionnaire, build Excel in memory."""
    questionnaire = generate_questionnaire_from_rfp(rfp_text)
    return generate_excel_from_questionnaire(questionnaire)


# --------------- file-based LangGraph pipeline (kept for CLI usage) ---------------

def build_excel(state: State) -> State:
    input_path = Path(state["input_json_path"])
    output_path = Path(state["output_excel_path"])

    questionnaire = QuestionnaireOutput.model_validate_json(input_path.read_text())
    output_path.parent.mkdir(parents=True, exist_ok=True)

    buf = _write_excel_to_buffer(questionnaire)
    output_path.write_bytes(buf.getvalue())

    return {
        "questionnaire": questionnaire.model_dump(),
        "output_excel_path": str(output_path),
    }


def beautify_excel(state: State) -> State:
    return state


def check_beauty_input(state: State) -> str:
    return "Yes" if state.get("beautify_excel") else "No"


workflow = StateGraph(State)
workflow.add_node("build_excel", build_excel)
workflow.add_node("beautify_excel", beautify_excel)
workflow.add_edge(START, "build_excel")
workflow.add_conditional_edges(
    "build_excel",
    check_beauty_input,
    {"Yes": "beautify_excel", "No": END},
)
workflow.add_edge("beautify_excel", END)
chain = workflow.compile()


def run_excel_agent(
    input_json_path: str | Path = "src/pipeline/agents/output/questionnaire_output.json",
    output_excel_path: str | Path = "src/pipeline/agents/output/questionnaire_output.xlsx",
    beautify: bool = False,
) -> State:
    return chain.invoke(
        {
            "input_json_path": str(input_json_path),
            "output_excel_path": str(output_excel_path),
            "beautify_excel": beautify,
        }
    )


if __name__ == "__main__":
    import sys

    default_input = Path("src/pipeline/agents/output/questionnaire_output.json")
    default_output = Path("src/pipeline/agents/output/questionnaire_output.xlsx")

    input_json_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_input
    output_excel_path = Path(sys.argv[2]) if len(sys.argv) > 2 else default_output

    result = run_excel_agent(input_json_path=input_json_path, output_excel_path=output_excel_path)
    print(f"✓ Saved Excel to {result['output_excel_path']}")
