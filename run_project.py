"""Open this file in VS Code and run it to regenerate the reviewed ETL outputs."""
from pathlib import Path
from src.run_etl import pipeline

ROOT = Path(__file__).resolve().parent

if __name__ == "__main__":
    output_directory = ROOT / "data" / "processed"
    output_directory.mkdir(parents=True, exist_ok=True)
    pipeline(ROOT / "data" / "raw", output_directory)
