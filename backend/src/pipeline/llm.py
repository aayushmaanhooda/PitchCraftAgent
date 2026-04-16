from langchain.chat_models import init_chat_model
from app.core.config import get_settings

settings = get_settings()

class LLM:
    def openai(self):
        return init_chat_model("gpt-4o", api_key=settings.OPENAI_API_KEY)

    def openai_mini(self):
        return init_chat_model("gpt-4o-mini", api_key=settings.OPENAI_API_KEY)

    def anthropic(self):
        return init_chat_model("claude-opus-4-6", max_tokens=8096, api_key=settings.CLAUDE_API_KEY)

    def gemma4(self):
        return None

# llm instance
llm = LLM()