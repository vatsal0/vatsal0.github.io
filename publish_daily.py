#!/usr/bin/env python3
"""
Usage: python3 publish_daily.py

Reads blog/daily/today.md and saves it as today's daily post at
src/content/blog/daily/YYYY-MM-DD.md. Astro builds the page
(/blog/daily/YYYY-MM-DD.html) and adds it to the blog index automatically.

today.md format:
  # title: Your Title Here

  Your content here (markdown)...

Optional: pass a date to publish for a specific day (e.g. future scheduling):
  python3 publish_daily.py 2026-03-18
"""

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
TODAY_MD = ROOT / "blog/daily/today.md"
POSTS_DIR = ROOT / "src/content/blog/daily"


def main():
    if not TODAY_MD.exists():
        print(f"Error: {TODAY_MD} not found.")
        sys.exit(1)

    raw = TODAY_MD.read_text().strip()
    lines = raw.splitlines()

    # Parse title from first line: "# title: ..."
    if not lines[0].startswith("# title:"):
        print("Error: first line must be '# title: Your Title'")
        sys.exit(1)

    title = lines[0].removeprefix("# title:").strip()
    body_md = "\n".join(lines[1:]).strip()

    if len(sys.argv) > 1:
        try:
            target_date = date.fromisoformat(sys.argv[1])
        except ValueError:
            print(f"Error: invalid date '{sys.argv[1]}', expected YYYY-MM-DD")
            sys.exit(1)
    else:
        target_date = date.today()

    date_key = target_date.isoformat()  # YYYY-MM-DD

    out_path = POSTS_DIR / f"{date_key}.md"
    if out_path.exists():
        answer = input(f"  {out_path.name} already exists. Overwrite? [y/N] ").strip().lower()
        if answer != "y":
            print("Aborted.")
            sys.exit(0)

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(f"---\ntitle: {json.dumps(title)}\ndate: {date_key}\n---\n\n{body_md}\n")
    print(f"  Created {out_path.relative_to(ROOT)}")
    print("Done.")


if __name__ == "__main__":
    main()
