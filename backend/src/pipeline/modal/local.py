# local test on modal apps
from flux import flux_app, FluxModel

@flux_app.local_entrypoint()
def main():
    """Quick smoke test — run with: modal run modal_flux.py"""
    model = FluxModel()

    test_prompt = "professional fintech dashboard on monitors, dark blue office, no people, no text, corporate aesthetic, cinematic lighting"

    print("Generating test image...")
    png_bytes = model.generate.remote(
        prompt=test_prompt,
        width=1024,
        height=1024,
    )

    import pathlib
    out = pathlib.Path(__file__).parent / "images" / "test_output.png"
    out.write_bytes(png_bytes)
    print(f"Saved to {out} ({len(png_bytes)//1024}KB)")