import json, os, urllib.request

USER = "rekik-ons"
TOKEN = os.environ.get("GITHUB_TOKEN")
INCLUDE_FORKS = True   # mets False pour ignorer les forks
MAX_LANGS = 10
OUT = "assets/top-langs.svg"

# Palette pastel (modifie-la comme tu veux)
COLORS = ["#a8c0ff", "#a8e6cf", "#ffe3a3", "#ffb3c6", "#d4b8f0",
          "#b5e3f5", "#ffcfa8", "#cfd8dc", "#e6f0a8", "#f5c6ec"]

def get(url):
    headers = {"Accept": "application/vnd.github+json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as r:
        return json.load(r)

repos, page = [], 1
while True:
    chunk = get(f"https://api.github.com/users/{USER}/repos?per_page=100&page={page}&type=owner")
    repos += chunk
    if len(chunk) < 100:
        break
    page += 1

totals = {}
for r in repos:
    if r["fork"] and not INCLUDE_FORKS:
        continue
    for lang, size in get(r["languages_url"]).items():
        totals[lang] = totals.get(lang, 0) + size

top = sorted(totals.items(), key=lambda x: -x[1])[:MAX_LANGS]
total = sum(v for _, v in top) or 1

W, PAD, BAR_W = 420, 25, 370
rows = (len(top) + 1) // 2
H = 95 + rows * 24 + 15

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       f'<rect width="{W}" height="{H}" rx="6" fill="#0d1117"/>',
       f'<text x="{PAD}" y="35" fill="#a8c0ff" font-family="Segoe UI, Ubuntu, sans-serif" font-size="18" font-weight="600">Most Used Languages</text>',
       f'<clipPath id="bar"><rect x="{PAD}" y="55" width="{BAR_W}" height="10" rx="5"/></clipPath>',
       '<g clip-path="url(#bar)">']
x = PAD
for i, (lang, size) in enumerate(top):
    w = size / total * BAR_W
    svg.append(f'<rect x="{x:.2f}" y="55" width="{w:.2f}" height="10" fill="{COLORS[i % len(COLORS)]}"/>')
    x += w
svg.append('</g>')
for i, (lang, size) in enumerate(top):
    cx = PAD + (i % 2) * 190
    cy = 95 + (i // 2) * 24
    pct = size / total * 100
    svg.append(f'<circle cx="{cx+5}" cy="{cy}" r="5" fill="{COLORS[i % len(COLORS)]}"/>')
    svg.append(f'<text x="{cx+16}" y="{cy+4}" fill="#d4d8f0" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12">{lang} {pct:.1f}%</text>')
svg.append('</svg>')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write("\n".join(svg))
print("OK:", [(l, round(v / total * 100, 1)) for l, v in top])
