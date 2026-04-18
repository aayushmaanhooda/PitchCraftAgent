"""LangGraph workflow nodes for the PPT agent.

Each node in this package implements one stage of the JSON -> .pptx pipeline:
  visual_planner   — LLM call that picks layout / icons / image decisions.
  image_generator  — parallel FLUX calls for every slide that needs an image.
  ppt_renderer     — pure python-pptx write using content + enriched blueprint.

All three nodes are wired together in agent/ppt_agent.py.
"""
