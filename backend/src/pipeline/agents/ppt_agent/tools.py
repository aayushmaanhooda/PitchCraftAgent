from langchain_tavily import TavilyExtract, TavilySearch
from dotenv import load_dotenv

load_dotenv()

#Web Search
tavily_search = TavilySearch(
    max_results=5,
    topic="general",
    search_depth="advanced",
)

#Page Extract
tavily_extract = TavilyExtract(
    extract_depth="basic",
)