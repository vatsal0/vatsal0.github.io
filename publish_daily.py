#!/usr/bin/env python3
"""
Usage: python3 publish_daily.py

Reads blog/daily/today.md, converts it to an HTML post for today's date,
and updates the posts index in blog/index.html.

today.md format:
  # title: Your Title Here

  Your content here...

Optional: pass a date to publish for a specific day (e.g. future scheduling):
  python3 publish_daily.py 2026-03-18
"""

import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
TODAY_MD = ROOT / "blog/daily/today.md"
INDEX_HTML = ROOT / "blog/index.html"
POSTS_DIR = ROOT / "blog/daily"
POSTS_JS = ROOT / "blog/daily/posts.js"


def md_to_html(text):
    """Convert a subset of markdown to HTML (bold, italic, links, paragraphs)."""
    def inline(s):
        # Links: [text](url)
        s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
        # Bold: **text**
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        # Italic: *text* or _text_
        s = re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
        s = re.sub(r'_(.+?)_', r'<em>\1</em>', s)
        return s

    blocks = []
    for para in re.split(r'\n{2,}', text.strip()):
        para = para.strip()
        if not para:
            continue
        lines = [inline(l) for l in para.splitlines()]
        blocks.append(f'  <p>{"<br>".join(lines)}</p>')
    return "\n\n".join(blocks)


def format_display_date(d):
    return d.strftime("%B %-d, %Y")


def build_html(title, display_date, date_key, body_html):
    return f"""<!doctype html>
<meta charset="utf-8">
<script src="../../js/distill.js"></script>
<!-- GoatCounter analytics -->
<script data-goatcounter="https://vatsalb.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>

<script type="text/front-matter">
  title: "{title}"
</script>

<dt-article class="left">
  <h1>{title}</h1>
  <p style="color: #888; font-size: 0.9em;">{display_date}</p>

  <p><a href="../index.html">Back to writing</a></p>

{body_html}

<div id="daily-nav"></div>
<script src="posts.js"></script>
<script>
  renderDailyNav("{date_key}", "daily-nav");
</script>
</dt-article>
"""


def update_posts_js(date_key, title):
    content = POSTS_JS.read_text()

    if f'"{date_key}"' in content:
        print(f"  {date_key} already in posts.js, updating title.")
        content = re.sub(
            rf'"{date_key}":\s*"[^"]*"',
            f'"{date_key}": "{title}"',
            content
        )
    else:
        # Insert after "const posts = {" line
        content = re.sub(
            r'(const posts = \{)',
            f'\\1\n  "{date_key}": "{title}",',
            content
        )

    POSTS_JS.write_text(content)


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
    body_html = md_to_html(body_md)

    if len(sys.argv) > 1:
        try:
            target_date = date.fromisoformat(sys.argv[1])
        except ValueError:
            print(f"Error: invalid date '{sys.argv[1]}', expected YYYY-MM-DD")
            sys.exit(1)
    else:
        target_date = date.today()

    date_key = target_date.isoformat()  # YYYY-MM-DD
    display_date = format_display_date(target_date)

    out_path = POSTS_DIR / f"{date_key}.html"
    if out_path.exists():
        answer = input(f"  {out_path.name} already exists. Overwrite? [y/N] ").strip().lower()
        if answer != "y":
            print("Aborted.")
            sys.exit(0)

    html = build_html(title, display_date, date_key, body_html)
    out_path.write_text(html)
    print(f"  Created {out_path.relative_to(ROOT)}")

    update_posts_js(date_key, title)
    print(f"  Updated blog/daily/posts.js with [{date_key}] \"{title}\"")
    print("Done.")


if __name__ == "__main__":
    main()
