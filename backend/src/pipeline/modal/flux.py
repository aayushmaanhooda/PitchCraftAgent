import modal
import io
from app.core.config import get_settings

settings = get_settings()

model = settings.MODEL_ID
cache_dir = settings.FLUX_CACHE_DIR
app_name = settings.MODAL_FLUX_APP_NAME

flux_app = modal.App(app_name)
flux_cache = modal.Volume.from_name("flux-model-cache", create_if_missing=True)

# Container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.3.1",
        "diffusers==0.30.0",
        "transformers==4.44.0",
        "accelerate==0.33.0",
        "sentencepiece==0.2.0",
        "Pillow==10.4.0",
    )
)

# ── Inference class 
@flux_app.cls(
    image=image,
    gpu="H100",                      # 2-4s per image — swap to A10G for cheaper
    volumes={cache_dir: flux_cache},
    timeout=600,
    startup_timeout=900,             # first run downloads ~24GB model
    scaledown_window=300,            # stay warm for 5 min after last request
    secrets=[modal.Secret.from_name("huggingface-secret")],  # HF_TOKEN
)
class FluxModel:

    @modal.enter()
    def load(self):
        """Load model once when container starts."""
        import torch
        from diffusers import FluxPipeline

        print("Loading FLUX.1-dev...")
        self.pipe = FluxPipeline.from_pretrained(
            model,
            torch_dtype=torch.bfloat16,
            cache_dir=cache_dir,
        )
        self.pipe.to("cuda")
        print("Model ready.")

    @modal.method()
    def generate(
        self,
        prompt: str,
        width:  int = 1024,
        height: int = 1024,
        steps:  int = 20,      # dev works best with 20-50 steps
        seed:   int = 42,
    ) -> bytes:
        """
        Generate an image and return PNG bytes.
        """
        import torch

        generator = torch.Generator("cuda").manual_seed(seed)

        image = self.pipe(
            prompt=prompt,
            width=width,
            height=height,
            guidance_scale=3.5,           # dev uses CFG guidance
            num_inference_steps=steps,
            max_sequence_length=256,
            generator=generator,
        ).images[0]

        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()
