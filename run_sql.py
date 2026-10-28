"""Run simple SELECT queries from sql/explore.sql using read-only SQLite.

Open and run this file in VS Code. Edit explore.sql to change the queries.
This small runner splits statements at semicolons. Do not use semicolons inside
quoted strings/comments, or use this runner for triggers or database writes.
"""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "data" / "processed" / "medicaid.sqlite"
QUERY_FILE = ROOT / "sql" / "explore.sql"
DISPLAY_LIMIT = 20


def main():
    if not DATABASE.is_file():
        raise FileNotFoundError("Run run_project.py first to create the SQLite database.")
    connection = sqlite3.connect(DATABASE.as_uri() + "?mode=ro", uri=True)
    try:
        sql_text = QUERY_FILE.read_text(encoding="utf-8")
        for number, statement in enumerate(sql_text.split(";"), start=1):
            if not statement.strip():
                continue
            cursor = connection.execute(statement)
            if cursor.description is None:
                continue
            rows = cursor.fetchmany(DISPLAY_LIMIT + 1)
            print(f"\nQuery {number}")
            print(" | ".join(column[0] for column in cursor.description))
            for row in rows[:DISPLAY_LIMIT]:
                print(" | ".join("NULL" if value is None else str(value) for value in row))
            if len(rows) > DISPLAY_LIMIT:
                print(f"Showing the first {DISPLAY_LIMIT} rows.")
            else:
                print(f"{len(rows)} row(s).")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
