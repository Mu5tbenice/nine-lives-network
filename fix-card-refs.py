#!/usr/bin/env python3
"""
fix-card-refs.py
════════════════════════════════════════════════
Removes ALL phantom file references and adds the correct ones.

ACTUAL FILES ON DISK:
  public/js/spell-card-builder.js  → buildSpellCard()
  public/js/spell-particles.js     → initParticles()
  public/js/card-global.js         → HOUSES object (slug-keyed)
  public/js/card-slot-helper.js    → buildCardSlot() for picker tiles
  public/css/components-v2.css     → .spell-card styles
  public/css/variables-v2.css      → CSS variables
  public/css/card-slot-v4.css      → picker tile styling

PHANTOM FILES (don't exist, must remove):
  card-builder-v4.js, card-particles.js, card-globals.js (with s),
  card-v4-patch.css

Run from ~/workspace:
  python3 fix-card-refs.py
════════════════════════════════════════════════
"""
import re, os

PHANTOMS = [
    'card-builder-v4.js',
    'card-particles.js',
    'card-globals.js',
    'card-v4-patch.css',
]

def fix_page(path):
    if not os.path.exists(path):
        print(f"  ⏭  {path} — not found")
        return
    with open(path, 'r') as f:
        txt = f.read()
    orig = txt

    # 1. Remove phantom script tags
    for p in PHANTOMS:
        txt = re.sub(r'\s*<script\s+src="[^"]*' + re.escape(p) + r'"\s*>\s*</script>', '', txt)
        txt = re.sub(r'\s*<link[^>]*href="[^"]*' + re.escape(p) + r'"[^>]*>', '', txt)

    # 2. Remove duplicate card-global.js tags (keep one)
    for fname in ['card-global.js', 'card-slot-helper.js', 'spell-card-builder.js', 'spell-particles.js']:
        pat = r'<script\s+src="/js/' + re.escape(fname) + r'"\s*>\s*</script>'
        matches = list(re.finditer(pat, txt))
        while len(matches) > 1:
            txt = txt[:matches[0].start()] + txt[matches[0].end():]
            matches = list(re.finditer(pat, txt))

    # 3. Clean up blank lines
    txt = re.sub(r'\n{3,}', '\n\n', txt)

    if txt != orig:
        with open(path, 'w') as f:
            f.write(txt)
        print(f"  ✅ {path} — cleaned phantom refs")
    else:
        print(f"  ⏭  {path} — already clean")

PAGES = [
    'public/duels.html',
    'public/gauntlet.html',
    'public/boss.html',
    'public/collection.html',
    'public/packs.html',
    'public/nethara-live.html',
    'public/zone-detail.html',
    'public/dashboard.html',
]

print()
print("🔧 Cleaning phantom file references...")
print()
for p in PAGES:
    fix_page(p)
print()
print("✨ Done! Phantom references removed.")
print()
