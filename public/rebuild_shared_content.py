#!/usr/bin/env python3
"""
Regenerates shared, cross-cutting content across every .html file in this
repo, from single sources of truth, so nothing drifts out of sync:

  1. The primary <nav>...</nav> block (same pattern as add_cookieyes.py:
     find every .html file, rewrite one shared block in place).
  2. The "Recent Posts" / "Recent Stories" sidebar widget on every post_*.html
     page — computed from posts-manifest.json, not guessed from existing
     markup.
  3. The shared <footer> block.
  4. Per-page SEO <head> tags (meta description, canonical, Open Graph,
     Twitter Card) — computed from posts-manifest.json (for post_*.html
     pages) and seo-pages.json (for every other page).
  5. JSON-LD structured data: Organization schema on index.html, Article
     schema on every post_*.html page.
  6. sitemap.xml, listing every page that has SEO metadata defined (i.e.
     every page in posts-manifest.json or seo-pages.json). A page with no
     entry in either file is treated as non-public and excluded from both
     the SEO pass and the sitemap.

Run from the root of your elikonas-placeholder repo:
    python3 rebuild_shared_content.py            # writes changes
    python3 rebuild_shared_content.py --dry-run  # reports what would change, writes nothing
"""

from __future__ import annotations

import html as html_lib
import json
import re
import subprocess
import sys
from pathlib import Path
from datetime import datetime, date

ROOT = Path(__file__).parent
MANIFEST_PATH = ROOT / "posts-manifest.json"
SEO_PAGES_PATH = ROOT / "seo-pages.json"
SITEMAP_PATH = ROOT / "sitemap.xml"
SKIP_DIRS = {"node_modules", ".git", ".next"}

# ── Shared nav ────────────────────────────────────────────────────────────
# Each entry: (label, href, matcher)
# `matcher` is a function(current_filepath: Path) -> bool deciding whether
# this nav item should render with class="active" for a given page.
NAV_ITEMS = [
    # index.html was retired when this static site was merged into
    # elikonas-product — the real homepage is app/page.tsx now, which this
    # script doesn't touch, so no crawled page can ever match "active" here.
    ("Home", "/", lambda p: False),
    ("Insights", "blog.html", lambda p: p.name == "blog.html" or _category(p) == "insight"),
    ("Stories", "stories.html", lambda p: p.name == "stories.html" or _category(p) == "story"),
    ("Roadmap", "roadmap.html", lambda p: p == Path("roadmap.html")),
    ("Governance", "https://elikonas.com/governance/index.html", lambda p: "governance" in p.parts),
]


def _category(path: Path) -> str | None:
    manifest = load_manifest()
    return manifest.get(path.name, {}).get("category")


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        print(f"ERROR: {MANIFEST_PATH} not found. See posts-manifest.json template.")
        sys.exit(1)
    with open(MANIFEST_PATH) as f:
        data = json.load(f)
    return {entry["file"]: entry for entry in data["posts"]}


def load_seo_pages() -> dict:
    if not SEO_PAGES_PATH.exists():
        print(f"ERROR: {SEO_PAGES_PATH} not found. See seo-pages.json template.")
        sys.exit(1)
    with open(SEO_PAGES_PATH) as f:
        return json.load(f)


def build_nav_html(rel_path: Path, depth: int) -> str:
    """rel_path is relative to repo root (e.g. Path('governance/index.html')).
    depth = how many directories deep, used to prefix relative hrefs."""
    prefix = "../" * depth
    items = []
    for label, href, is_active in NAV_ITEMS:
        full_href = href if href.startswith("http") or href.startswith("/") else f"{prefix}{href}"
        active = ' class="active"' if is_active(rel_path) else ""
        items.append(f'            <li><a href="{full_href}"{active}>{label}</a></li>')
    return "    <nav>\n        <ul>\n" + "\n".join(items) + "\n        </ul>\n    </nav>"


NAV_BLOCK_RE = re.compile(r"    <nav>.*?</nav>", re.DOTALL)


def update_nav(html: str, rel_path: Path, depth: int) -> tuple[str, bool]:
    new_nav = build_nav_html(rel_path, depth)
    if not NAV_BLOCK_RE.search(html):
        return html, False
    updated = NAV_BLOCK_RE.sub(lambda _: new_nav, html, count=1)
    return updated, updated != html


# ── Recent Posts / Recent Stories sidebar ───────────────────────────────
SIDEBAR_RE = re.compile(
    r'(<h3>Recent (?:Posts|Stories)</h3>\n)'
    r'(?:\s*<div class="related-post">\s*'
    r'<div class="related-post-date">[^<]*</div>\s*'
    r'<a[^>]*>[^<]*</a>\s*'
    r'</div>\s*\n?){1,3}'
)


def format_date(iso_date: str) -> str:
    return datetime.strptime(iso_date, "%Y-%m-%d").strftime("%B %-d, %Y")


# ── Shared footer ────────────────────────────────────────────────────────
FOOTER_START = "<!-- SITE-FOOTER-START -->"
FOOTER_END = "<!-- SITE-FOOTER-END -->"
FOOTER_BLOCK_RE = re.compile(
    re.escape(FOOTER_START) + r".*?" + re.escape(FOOTER_END), re.DOTALL
)

# Each entry: (label, url, icon filename)
FOOTER_SOCIAL_LINKS = [
    ("X (Twitter)", "https://x.com/elikonasmuse", "social-x.svg"),
    ("Facebook", "https://www.facebook.com/elikonasmuse", "social-fb.svg"),
    ("Instagram", "https://www.instagram.com/elikonasmuse", "social-ig.svg"),
    ("LinkedIn", "https://www.linkedin.com/company/elikonas", "social-in.svg"),
    ("YouTube", "https://youtube.com/@elikonasmuse", "social-yt.svg"),
]


def build_footer_social_html(prefix: str) -> str:
    items = []
    for label, url, icon in FOOTER_SOCIAL_LINKS:
        items.append(
            f'                <a href="{url}" class="social-link">\n'
            f'                    <img src="{prefix}assets/images/{icon}" alt="{label}">\n'
            f"                </a>"
        )
    return '            <div class="social-links">\n' + "\n".join(items) + "\n            </div>"


def build_footer_html(depth: int) -> str:
    prefix = "../" * depth
    year = datetime.now().year
    social_html = build_footer_social_html(prefix)
    return f"""{FOOTER_START}
    <footer class="site-footer">
        <div class="footer-columns">
            <div class="footer-column">
                <h3>Mission</h3>
                <div class="footer-divider"></div>
                <p>Elikonas is a Public Benefit Corporation, legally committed to
                   expanding equitable access to education and workforce development.</p>
                <a href="{prefix}mission.html">Learn more about our mission &rarr;</a>
            </div>
            <div class="footer-column">
                <h3>Contact</h3>
                <div class="footer-divider"></div>
                <ul>
                    <li><a href="/subscribe.html">Subscribe to Our Newsletter</a></li>
                    <li><a href="mailto:support@elikonas.com">Contact Us</a></li>
                    <li><a href="{prefix}careers.html">Careers</a></li>
                </ul>
            </div>
        </div>
{social_html}
        <div class="footer-bottom">&copy; {year} Elikonas Public Benefit Corporation</div>
    </footer>
{FOOTER_END}"""


def update_footer(html: str, depth: int) -> tuple[str, bool]:
    new_footer = build_footer_html(depth)
    if FOOTER_BLOCK_RE.search(html):
        updated = FOOTER_BLOCK_RE.sub(lambda _: new_footer, html, count=1)
    elif "</body>" in html:
        updated = html.replace("</body>", f"{new_footer}\n</body>", 1)
    else:
        return html, False
    return updated, updated != html


def build_related_posts_html(current_file: str, manifest: dict) -> str | None:
    entry = manifest.get(current_file)
    if not entry:
        return None
    category = entry["category"]
    label = "Stories" if category == "story" else "Posts"

    same_category = [
        (fname, data)
        for fname, data in manifest.items()
        if data["category"] == category and fname != current_file
    ]
    same_category.sort(key=lambda item: item[1]["date"], reverse=True)
    top_three = same_category[:3]

    if not top_three:
        return None

    lines = [f"<h3>Recent {label}</h3>\n"]
    for fname, data in top_three:
        lines.append(
            f'                <div class="related-post">\n'
            f'                    <div class="related-post-date">{format_date(data["date"])}</div>\n'
            f'                    <a href="{fname}">{data["title"]}</a>\n'
            f"                </div>\n"
        )
    return "".join(lines)


def update_sidebar(html: str, filename: str, manifest: dict) -> tuple[str, bool]:
    new_block = build_related_posts_html(filename, manifest)
    if new_block is None or not SIDEBAR_RE.search(html):
        return html, False
    updated = SIDEBAR_RE.sub(lambda _: new_block, html, count=1)
    return updated, updated != html


# ── SEO: meta description / canonical / Open Graph / Twitter Card ───────
SEO_START = "<!-- SEO-META-START -->"
SEO_END = "<!-- SEO-META-END -->"
SEO_BLOCK_RE = re.compile(re.escape(SEO_START) + r".*?" + re.escape(SEO_END), re.DOTALL)
VIEWPORT_RE = re.compile(r'[ \t]*<meta name="viewport"[^>]*>\n')
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.DOTALL)


def html_attr_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def canonical_url(rel_path: Path, seo_pages: dict) -> str:
    site_url = seo_pages["site_url"].rstrip("/")
    if rel_path == Path("index.html"):
        return f"{site_url}/"
    return f"{site_url}/{rel_path.as_posix()}"


def absolute_asset_url(asset_path: str, seo_pages: dict) -> str:
    site_url = seo_pages["site_url"].rstrip("/")
    return f"{site_url}/{asset_path.lstrip('/')}"


def seo_entry_for(rel_path: Path, manifest: dict, seo_pages: dict) -> dict | None:
    """Returns {"description": ..., "is_post": bool, "post": {...} | None}
    or None if this page has no SEO entry defined anywhere (i.e. it's not
    considered a public, indexable page)."""
    post = manifest.get(rel_path.name)
    if post is not None:
        return {"description": post["description"], "is_post": True, "post": post}
    page = seo_pages["pages"].get(rel_path.as_posix())
    if page is not None:
        return {"description": page["description"], "is_post": False, "post": None}
    return None


def extract_title(html: str) -> str:
    m = TITLE_RE.search(html)
    if not m:
        return ""
    # The raw <title> text may already contain HTML entities (e.g. "&amp;")
    # as literal source characters. Unescape here so html_attr_escape()
    # re-escapes exactly once when building the OG/Twitter meta tags below
    # — otherwise "&amp;" becomes "&amp;amp;".
    return html_lib.unescape(m.group(1).strip())


def build_seo_meta_html(html: str, rel_path: Path, manifest: dict, seo_pages: dict) -> str | None:
    entry = seo_entry_for(rel_path, manifest, seo_pages)
    if entry is None:
        return None

    title = extract_title(html)
    description = html_attr_escape(entry["description"])
    title_attr = html_attr_escape(title)
    url = canonical_url(rel_path, seo_pages)
    image = absolute_asset_url(seo_pages["default_image"], seo_pages)
    og_type = "article" if entry["is_post"] else "website"

    lines = [
        SEO_START,
        f'    <meta name="description" content="{description}">',
        f'    <link rel="canonical" href="{url}">',
        f'    <meta property="og:type" content="{og_type}">',
        f'    <meta property="og:title" content="{title_attr}">',
        f'    <meta property="og:description" content="{description}">',
        f'    <meta property="og:url" content="{url}">',
        f'    <meta property="og:image" content="{image}">',
        '    <meta name="twitter:card" content="summary_large_image">',
        f'    <meta name="twitter:title" content="{title_attr}">',
        f'    <meta name="twitter:description" content="{description}">',
        f'    <meta name="twitter:image" content="{image}">',
    ]
    if entry["is_post"]:
        lines.append(f'    <meta property="article:published_time" content="{entry["post"]["date"]}">')
    lines.append(SEO_END)
    return "\n".join(lines)


def update_seo_meta(html: str, rel_path: Path, manifest: dict, seo_pages: dict) -> tuple[str, bool]:
    new_block = build_seo_meta_html(html, rel_path, manifest, seo_pages)
    if new_block is None:
        return html, False

    if SEO_BLOCK_RE.search(html):
        updated = SEO_BLOCK_RE.sub(lambda _: new_block, html, count=1)
    else:
        m = VIEWPORT_RE.search(html)
        if not m:
            return html, False
        updated = html[: m.end()] + new_block + "\n" + html[m.end() :]
    return updated, updated != html


# ── JSON-LD structured data ──────────────────────────────────────────────
ORG_JSONLD_START = "<!-- ORG-JSONLD-START -->"
ORG_JSONLD_END = "<!-- ORG-JSONLD-END -->"
ORG_JSONLD_RE = re.compile(re.escape(ORG_JSONLD_START) + r".*?" + re.escape(ORG_JSONLD_END), re.DOTALL)

ARTICLE_JSONLD_START = "<!-- ARTICLE-JSONLD-START -->"
ARTICLE_JSONLD_END = "<!-- ARTICLE-JSONLD-END -->"
ARTICLE_JSONLD_RE = re.compile(re.escape(ARTICLE_JSONLD_START) + r".*?" + re.escape(ARTICLE_JSONLD_END), re.DOTALL)


def build_org_jsonld(seo_pages: dict) -> str:
    org = seo_pages["organization"]
    site_url = seo_pages["site_url"].rstrip("/")
    data = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": org["name"],
        "url": f"{site_url}/",
        "logo": absolute_asset_url("assets/images/Elikonas_logo_blu-ylw.svg", seo_pages),
        "description": seo_pages["pages"]["index.html"]["description"],
        "sameAs": org["sameAs"],
    }
    body = json.dumps(data, indent=2)
    return f'{ORG_JSONLD_START}\n    <script type="application/ld+json">\n{body}\n    </script>\n{ORG_JSONLD_END}'


def build_article_jsonld(rel_path: Path, html: str, manifest: dict, seo_pages: dict) -> str | None:
    post = manifest.get(rel_path.name)
    if post is None:
        return None
    data = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post["title"],
        "description": post["description"],
        "datePublished": post["date"],
        "url": canonical_url(rel_path, seo_pages),
        "image": absolute_asset_url(seo_pages["default_image"], seo_pages),
        "author": {"@type": "Organization", "name": seo_pages["organization"]["name"]},
        "publisher": {"@type": "Organization", "name": seo_pages["organization"]["name"]},
    }
    body = json.dumps(data, indent=2)
    return f'{ARTICLE_JSONLD_START}\n    <script type="application/ld+json">\n{body}\n    </script>\n{ARTICLE_JSONLD_END}'


def update_jsonld(html: str, rel_path: Path, manifest: dict, seo_pages: dict) -> tuple[str, bool]:
    """Injects Organization JSON-LD on index.html, Article JSON-LD on every
    post_*.html page. Inserted right before </head>."""
    if rel_path == Path("index.html"):
        new_block = build_org_jsonld(seo_pages)
        block_re = ORG_JSONLD_RE
    else:
        new_block = build_article_jsonld(rel_path, html, manifest, seo_pages)
        block_re = ARTICLE_JSONLD_RE
        if new_block is None:
            return html, False

    if block_re.search(html):
        updated = block_re.sub(lambda _: new_block, html, count=1)
    elif "</head>" in html:
        updated = html.replace("</head>", f"{new_block}\n</head>", 1)
    else:
        return html, False
    return updated, updated != html


# ── sitemap.xml ───────────────────────────────────────────────────────────
def git_lastmod(git_relative_path: str) -> str:
    """Last commit date for a file, ISO 8601. `git_relative_path` is resolved
    relative to ROOT (public/) via `git log`'s own cwd, so it can walk
    outside ROOT with "../" to reach files elsewhere in the repo (e.g. the
    real homepage at app/page.tsx). Falls back to today for
    uncommitted/new files (git log returns nothing)."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%aI", "--", git_relative_path],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        out = result.stdout.strip()
        if out:
            return out[:10]
    except (OSError, subprocess.SubprocessError):
        pass
    return date.today().isoformat()


def changefreq_for(rel_path: Path, manifest: dict) -> str:
    if rel_path.name in manifest:
        return "monthly"
    if rel_path.name in {"index.html", "blog.html", "stories.html"}:
        return "weekly"
    return "yearly"


def build_sitemap_xml(manifest: dict, seo_pages: dict) -> str:
    entries = []

    # The real homepage is app/page.tsx (a Next.js route, not a static file
    # under public/), so the crawl below never sees it. Add it explicitly —
    # it's the site's most important URL and shouldn't be missing from the
    # sitemap just because it isn't part of the static-passthrough content.
    homepage_source = ROOT.parent / "app" / "page.tsx"
    if homepage_source.exists():
        entries.append(
            (
                canonical_url(Path("index.html"), seo_pages),
                git_lastmod("../app/page.tsx"),
                "weekly",
            )
        )

    for path in sorted(ROOT.rglob("*.html")):
        rel_path = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel_path.parts):
            continue
        if seo_entry_for(rel_path, manifest, seo_pages) is None:
            continue
        entries.append(
            (
                canonical_url(rel_path, seo_pages),
                git_lastmod(str(rel_path)),
                changefreq_for(rel_path, manifest),
            )
        )
    entries.sort(key=lambda e: e[0])

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<!-- Auto-generated by rebuild_shared_content.py — do not edit by hand. -->",
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, changefreq in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{loc}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main():
    dry_run = "--dry-run" in sys.argv
    manifest = load_manifest()
    seo_pages = load_seo_pages()

    changed_files = []
    for path in ROOT.rglob("*.html"):
        rel_path = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel_path.parts):
            continue

        html = path.read_text(encoding="utf-8")
        original = html
        depth = len(rel_path.parts) - 1

        html, nav_changed = update_nav(html, rel_path, depth)
        html, sidebar_changed = update_sidebar(html, path.name, manifest)
        html, footer_changed = update_footer(html, depth)
        html, seo_changed = update_seo_meta(html, rel_path, manifest, seo_pages)
        html, jsonld_changed = update_jsonld(html, rel_path, manifest, seo_pages)

        if html != original:
            changed_files.append(
                (path.relative_to(ROOT), nav_changed, sidebar_changed, footer_changed, seo_changed, jsonld_changed)
            )
            if not dry_run:
                path.write_text(html, encoding="utf-8")

    print(f"{'Would update' if dry_run else 'Updated'} {len(changed_files)} file(s):")
    for rel_path, nav_changed, sidebar_changed, footer_changed, seo_changed, jsonld_changed in changed_files:
        tags = []
        if nav_changed:
            tags.append("nav")
        if sidebar_changed:
            tags.append("sidebar")
        if footer_changed:
            tags.append("footer")
        if seo_changed:
            tags.append("seo")
        if jsonld_changed:
            tags.append("jsonld")
        print(f"  {rel_path}  [{', '.join(tags)}]")

    new_sitemap = build_sitemap_xml(manifest, seo_pages)
    old_sitemap = SITEMAP_PATH.read_text(encoding="utf-8") if SITEMAP_PATH.exists() else None
    if new_sitemap != old_sitemap:
        print(f"{'Would update' if dry_run else 'Updated'} sitemap.xml")
        if not dry_run:
            SITEMAP_PATH.write_text(new_sitemap, encoding="utf-8")
    else:
        print("sitemap.xml unchanged")


if __name__ == "__main__":
    main()
