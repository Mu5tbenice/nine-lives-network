#!/bin/bash
# ═══════════════════════════════════════════════════════
# patch-card-v4-all.sh
# Adds card v4.2 CSS + JS to all card-displaying pages
# Run from ~/workspace in Replit Shell
# ═══════════════════════════════════════════════════════

echo ""
echo "🃏 Card v4.2 — Patching all pages..."
echo ""

# ─── CSS LINK TO ADD ───
CSS_LINK='<link rel="stylesheet" href="/css/card-v4-patch.css">'

# ─── JS TAGS TO ADD ───
JS_PARTICLES='<script src="/js/card-particles.js"></script>'
JS_BUILDER='<script src="/js/card-builder-v4.js"></script>'
JS_GLOBALS='<script src="/js/card-globals.js"></script>'

# ─── PAGES TO PATCH ───
PAGES=(
  "public/collection.html"
  "public/duels.html"
  "public/gauntlet.html"
  "public/boss.html"
  "public/zone-detail.html"
  "public/dashboard.html"
  "public/nethara-live.html"
  "public/packs.html"
)

for PAGE in "${PAGES[@]}"; do
  if [ ! -f "$PAGE" ]; then
    echo "  ⏭  $PAGE — file not found, skipping"
    continue
  fi

  CHANGED=0

  # ─── ADD CSS (if not already present) ───
  if ! grep -q "card-v4-patch.css" "$PAGE"; then
    # Insert after last existing <link> or before </head>
    if grep -q '<link ' "$PAGE"; then
      # Add after the last <link> tag
      python3 -c "
import re
with open('$PAGE','r') as f: content = f.read()
# Find last <link...> tag and insert after it
matches = list(re.finditer(r'<link[^>]*>', content))
if matches:
    pos = matches[-1].end()
    content = content[:pos] + '\n$CSS_LINK' + content[pos:]
with open('$PAGE','w') as f: f.write(content)
"
    else
      # No link tags, add before </head>
      sed -i "s|</head>|$CSS_LINK\n</head>|" "$PAGE"
    fi
    echo "  ✅ $PAGE — added card-v4-patch.css"
    CHANGED=1
  else
    echo "  ⏭  $PAGE — CSS already present"
  fi

  # ─── ADD JS (if not already present) ───
  if ! grep -q "card-globals.js" "$PAGE"; then
    # Insert before </body>
    sed -i "s|</body>|$JS_PARTICLES\n$JS_BUILDER\n$JS_GLOBALS\n</body>|" "$PAGE"
    echo "  ✅ $PAGE — added JS includes"
    CHANGED=1
  else
    echo "  ⏭  $PAGE — JS already present"
  fi

  # ─── Remove duplicate JS if card-particles or card-builder already existed ───
  if [ $CHANGED -eq 1 ]; then
    # Remove any duplicate script tags (keep the last occurrence)
    python3 -c "
import re
with open('$PAGE','r') as f: lines = f.readlines()
seen_particles = False
seen_builder = False
seen_globals = False
result = []
# Process in reverse to keep last occurrence
for line in reversed(lines):
    stripped = line.strip()
    if 'card-particles.js' in stripped:
        if seen_particles:
            continue  # skip duplicate
        seen_particles = True
    if 'card-builder-v4.js' in stripped:
        if seen_builder:
            continue
        seen_builder = True
    if 'card-globals.js' in stripped:
        if seen_globals:
            continue
        seen_globals = True
    result.append(line)
result.reverse()
with open('$PAGE','w') as f: f.writelines(result)
"
  fi

done

echo ""
echo "✨ All pages patched!"
echo ""
echo "Next steps:"
echo "  1. Click Run to test"
echo "  2. Check /spellbook.html and /collection.html"
echo "  3. Then commit:"
echo "     git add -A"
echo '     git commit -m "feat: card v4.2 CSS + JS applied to all pages"'
echo "     git push origin feature/card-v4-sitewide"
echo ""