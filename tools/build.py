"""Assemble the site: src/pages/*.html -> docs/ (what GitHub Pages serves).

Each page starts with a <!--meta {...} --> JSON block. This script wraps the
page in the shared head, header and footer, inlines the coverage map, adds
structured data, and writes sitemap.xml.

Usage: python3 tools/build.py
"""
import datetime, html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "src" / "pages", ROOT / "docs"
SITE = "https://sjpahomes2go.com/"
GA_ID = "G-WDJJZKH1QP"  # Google Analytics 4 measurement ID

NAV = [("Sell", "#sell"), ("Buy", "#buy"), ("Invest", "#invest"), ("Areas", "#areas"),
       ("Calculators", "#payment"), ("Reviews", "#reviews"), ("FAQ", "#faq"), ("Contact", "#contact")]

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="ga-id" content="{ga}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{description}">
{robots}<link rel="canonical" href="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{site}images/logo.png">
<meta name="theme-color" content="#151514">
<link rel="icon" type="image/png" href="{root}images/favicon.png">
<link rel="apple-touch-icon" href="{root}images/apple-touch-icon.png">
<link rel="manifest" href="{root}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Libre+Franklin:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="{root}assets/site.css">
{jsonld}</head>
<body>
"""

HEADER = """<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="{root}#top" aria-label="The Morales Group, home">
      <img class="only-light" src="{root}images/mark.png" alt="" width="400" height="179">
      <img class="only-dark" src="{root}images/mark-dark.png" alt="" width="400" height="179">
      <span class="brand-text"><b>The Morales Group</b><span>Keller Williams Realty</span></span>
    </a>
    <ul class="nav-links">
{links}
    </ul>
    <div class="nav-cta">
      <a class="nav-phone" href="tel:+18562640332">(856) 264-0332</a>
      <a class="btn btn-primary" href="https://cal.com/themoralesgroup/intromeeting" target="_blank" rel="noopener">Book a call</a>
      <details class="menu">
        <summary>Menu</summary>
        <ul>
{links}
        </ul>
      </details>
    </div>
  </div>
</header>
<main id="top">
"""

FOOTER = """</main>
<footer>
  <div class="wrap">
    <img src="{root}images/logo-dark.png" alt="The Morales Group, Real Estate Professionals" width="900" height="548" loading="lazy">
    <div class="foot-meta">
      <span><b>The Morales Group</b> · Affiliated with Keller Williams Realty</span>
      <span>RaulMorales@KW.com · (856) 264-0332</span>
      <span>© <span data-year>{year}</span> The Morales Group · Equal Housing Opportunity · <a href="{root}privacy/">Privacy</a> · <a href="{root}privacy/#cookies" data-cookie-open>Cookie choices</a></span>
    </div>
  </div>
</footer>
<div class="cookie" id="cookie" role="region" aria-label="Cookie choices" hidden>
  <p>We'd like to use Google Analytics cookies to see how visitors use this site. Nothing is collected unless you accept. <a href="{root}privacy/#cookies">Learn more</a></p>
  <div class="cookie-actions">
    <button type="button" class="btn btn-ghost" id="cookie-no">Decline</button>
    <button type="button" class="btn btn-primary" id="cookie-yes">Accept</button>
  </div>
</div>
<script src="{root}assets/site.js" defer></script>
</body>
</html>
"""

AGENT = {
    "@context": "https://schema.org", "@type": "RealEstateAgent",
    "name": "The Morales Group", "url": SITE, "image": SITE + "images/logo.png",
    "telephone": "+1-856-264-0332", "email": "RaulMorales@KW.com",
    "employee": {"@type": "Person", "name": "Raul Morales", "jobTitle": "REALTOR®", "image": SITE + "images/raul-morales.jpg"},
    "parentOrganization": {"@type": "Organization", "name": "Keller Williams Realty"},
    "areaServed": [{"@type": "AdministrativeArea", "name": n} for n in
                   ("Burlington County, NJ", "Camden County, NJ", "Gloucester County, NJ", "Mercer County, NJ", "Philadelphia County, PA")],
}

def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

def faq_ld(body):
    qa = re.findall(r"<details><summary>(.*?)</summary><p>(.*?)</p></details>", body, re.S)
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}} for q, a in qa]}

def build():
    year = datetime.date.today().year
    svg = (OUT / "assets" / "coverage-map.svg").read_text()
    urls = []
    for src in sorted(SRC.glob("*.html")):
        raw = src.read_text()
        m = re.match(r"<!--meta (\{.*?\}) -->\n", raw, re.S)
        meta, body = json.loads(m.group(1)), raw[m.end():]
        path = meta["path"]
        if path == "404":
            root, dest = "/", OUT / "404.html"
        else:
            root = "../" * path.count("/")
            dest = OUT / path / "index.html"
            if not meta.get("noindex"):
                urls.append(SITE + path)
        ld = []
        if meta.get("agent"):
            ld.append(AGENT)
        if meta.get("faq"):
            ld.append(faq_ld(body))
        jsonld = "".join('<script type="application/ld+json">%s</script>\n' % json.dumps(x, ensure_ascii=False) for x in ld)
        links = "\n".join('      <li><a href="%s%s">%s</a></li>' % (root, href, label) for label, href in NAV)
        body = body.replace("{{include:coverage-map.svg}}", svg)
        page = (HEAD.format(title=html.escape(meta["title"]), description=html.escape(meta["description"]),
                            url=SITE + ("" if path == "404" else path), site=SITE, ga=GA_ID, root=root, jsonld=jsonld,
                            robots='<meta name="robots" content="noindex">\n' if meta.get("noindex") else "")
                + HEADER.format(root=root, links=links) + body + FOOTER.format(root=root, year=year))
        page = page.replace("{{root}}", root)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(page)
        print("wrote", dest.relative_to(ROOT))
    today = datetime.date.today().isoformat()
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join("  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n" % (u, today) for u in urls) + "</urlset>\n")
    (OUT / "robots.txt").write_text("User-agent: *\nAllow: /\n\nSitemap: %ssitemap.xml\n" % SITE)
    (OUT / "site.webmanifest").write_text(json.dumps({
        "name": "The Morales Group", "short_name": "Morales Group",
        "icons": [{"src": "images/apple-touch-icon.png", "sizes": "180x180", "type": "image/png"}],
        "theme_color": "#151514", "background_color": "#f7f7f5", "display": "standalone", "start_url": "/"}, indent=2) + "\n")
    print("wrote docs/sitemap.xml, docs/robots.txt, docs/site.webmanifest")

if __name__ == "__main__":
    build()
