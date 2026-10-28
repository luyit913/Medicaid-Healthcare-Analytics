"""Run the project's unit and integration tests directly from VS Code."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent

if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
