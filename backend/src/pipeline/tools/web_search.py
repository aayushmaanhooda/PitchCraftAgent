from langchain_tavily import TavilyExtract, TavilySearch
from app.core.config import get_settings

settings = get_settings()

#Web Search
tavily_search = TavilySearch(
    max_results=5,
    topic="general",
    search_depth="advanced",
    tavily_api_key=settings.TAVILY_API_KEY,
)

#Page Extract
tavily_extract = TavilyExtract(
    extract_depth="basic",
    tavily_api_key=settings.TAVILY_API_KEY,
)