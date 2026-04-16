# vLLM makes inference faster and cheaper on the GPU that Modal gives you.
'''
A10G = budget production server
A100 = serious production workhorse
H100 = top-tier AI datacenter chip
'''

import modal
from app.core.config import get_settings

settings = get_settings()

app_name =settings.MODAL_LLM_APP_NAME
cache_dir = settings.LLM_CACHE_DIR

llm_app = modal.App(app_name)

# cache the modal weights in a modal Volume so cold starts are fast
model_cache = modal.Volume.from_name(
    "gemma4-llm-cache", create_if_missing=True
)

# Container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("vllm", "huggingface_hub")
)

@llm_app.function(
    gpu="A10G",
    timeout=600,
    volumes={cache_dir: model_cache}
)
@llm_app.web_server(port=8000)
def serve():
    import subprocess
    subprocess.run([
        "python", "-m", "vllm.entrypoints.openai.api_server",
        "--model", "google/gemma-4-31B-it",
        "--download-dir", cache_dir, 
        "--host", "0.0.0.0",
        "--port", "8000",
        "--max-model-len", "4096",
        "--dtype", "float16" #“When you load the model into GPU memory, convert weights into float16 format.”
    ])
