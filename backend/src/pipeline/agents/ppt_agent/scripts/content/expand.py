"""expand — SalesPPTOutput -> ordered list[LogicalSlide].

Deterministic emission order:

  1. ContentSource.deck_title              (cover — title + image)
  2. ContentSource.deck_summary_solution   (merged executive_summary + theme)
  3. ContentSource.deck_why_aziro
  4. ContentSource.deck_differentiators
  5. ContentSource.main_slide x N
  6. ContentSource.use_case x M
  7. ContentSource.deck_agenda             (intentionally last)

Total = 5 + N + M.

Note: The theme is shown as a subtitle on the cover slide AND as the
"Solution" section of the summary_solution slide, so it is not emitted
as a standalone logical slide.

Public API:
  expand(content: SalesPPTOutput) -> list[LogicalSlide]
"""

from __future__ import annotations

from pipeline.agents.ppt_agent.schema import ContentSource, LogicalSlide, SalesPPTOutput

_REGION_A_PREFIX: tuple[ContentSource, ...] = (
    ContentSource.DECK_TITLE,
    ContentSource.DECK_SUMMARY_SOLUTION,
    ContentSource.DECK_WHY_AZIRO,
    ContentSource.DECK_DIFFERENTIATORS,
)


def expand(content: SalesPPTOutput) -> list[LogicalSlide]:
    """Deterministically expand a SalesPPTOutput into ordered LogicalSlides.

    Emission order: Region A prefix, main_slides, use_cases, then
    deck_agenda last.  Total == 5 + len(content.slides) + len(content.use_cases).
    """
    logical: list[LogicalSlide] = []
    position = 1

    for source in _REGION_A_PREFIX:
        logical.append(
            LogicalSlide(position=position, content_source=source, content_index=None)
        )
        position += 1

    for i in range(len(content.slides)):
        logical.append(
            LogicalSlide(
                position=position,
                content_source=ContentSource.MAIN_SLIDE,
                content_index=i,
            )
        )
        position += 1

    for i in range(len(content.use_cases)):
        logical.append(
            LogicalSlide(
                position=position,
                content_source=ContentSource.USE_CASE,
                content_index=i,
            )
        )
        position += 1

    logical.append(
        LogicalSlide(
            position=position,
            content_source=ContentSource.DECK_AGENDA,
            content_index=None,
        )
    )

    return logical


if __name__ == "__main__":
    import json
    from pathlib import Path

    from pipeline.agents.ppt_agent.schema import SalesPPTEnvelope

    sample = Path(__file__).resolve().parents[3] / "agent" / "output" / "sales_ppt_output.json"
    payload = json.loads(sample.read_text())
    envelope = SalesPPTEnvelope.model_validate(payload)
    slides = expand(envelope.sales_ppt)

    expected = 5 + len(envelope.sales_ppt.slides) + len(envelope.sales_ppt.use_cases)
    print(f"source: {sample.name}")
    print(f"slides[]:    {len(envelope.sales_ppt.slides)}")
    print(f"use_cases[]: {len(envelope.sales_ppt.use_cases)}")
    print(f"expected logical slides: {expected}")
    print(f"actual logical slides:   {len(slides)}")
    print(f"match: {len(slides) == expected}")
    print()
    print(f"{'pos':>3}  {'content_source':<26}  {'idx':>3}")
    print("-" * 40)
    for ls in slides:
        idx = "-" if ls.content_index is None else str(ls.content_index)
        print(f"{ls.position:>3}  {ls.content_source.value:<26}  {idx:>3}")
