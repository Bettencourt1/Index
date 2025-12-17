import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html_files = list(root.rglob('*.html'))

link_re = re.compile(r'<nav class="sidebar-nav">(.*?)</nav>', re.S)
a_re = re.compile(r'href="([^"]+)"')

broken = []

for f in html_files:
    txt = f.read_text(encoding='utf-8')
    m = link_re.search(txt)
    if not m:
        continue
    nav = m.group(1)
    hrefs = a_re.findall(nav)
    for href in hrefs:
        # ignore external
        if href.startswith('http') or href.startswith('#'):
            continue
        # resolve relative to file f
        target = (f.parent / href).resolve()
        if not target.exists():
            broken.append((str(f.relative_to(root)), href, str(target)))

if broken:
    print('Broken links found:')
    for src, href, target in broken:
        print(f'- {src} -> {href} (resolved: {target})')
else:
    print('No broken sidebar links found.')
