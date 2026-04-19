import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(_SRC))
sys.path.insert(0, str(_SRC / "app"))

from app.main import app  # noqa: E402, F401
