#!/bin/bash
# Run from your project root: bash patch-packs.sh
# Patches public/packs.html with navbar, booster art, bigger cards

FILE="public/packs.html"

if [ ! -f "$FILE" ]; then
  echo "❌ $FILE not found. Run from project root."
  exit 1
fi

echo "🔧 Patching packs.html..."

# 1. Add nav CSS after card-v4.css
if ! grep -q "nav-v2.css" "$FILE"; then
  sed -i 's|href="/css/card-v4.css">|href="/css/card-v4.css">\n  <link rel="stylesheet" href="/css/nav-v2.css">|' "$FILE"
  echo "  ✅ Added nav-v2.css"
else
  echo "  ⏩ nav-v2.css already present"
fi

# 2. Add nav.js after <body>
if ! grep -q "nav.js" "$FILE"; then
  sed -i 's|<body>|<body>\n<script src="/js/nav.js"></script>|' "$FILE"
  echo "  ✅ Added nav.js"
else
  echo "  ⏩ nav.js already present"
fi

# 3. Fix header padding for navbar (20px -> 80px top)
sed -i 's|padding: 20px 24px 16px;|padding: 80px 24px 16px;|' "$FILE"
echo "  ✅ Header padding updated"

# 4. Replace emoji pack icons with booster image in inventory render
sed -i "s|\`<div class=\"pack-icon\">\${meta.icon}</div>\`|\`<div class=\"pack-icon\"><img src=\"/assets/images/booster-pack.png\" alt=\"\${meta.name}\"></div>\`|g" "$FILE"
echo "  ✅ Inventory pack icons → booster image"

# 5. Replace emoji in ceremony sealed pack
sed -i 's|<div class="seal-icon">${meta.icon}</div>|<img src="/assets/images/booster-pack.png" alt="${meta.name}" style="width:160px;height:auto;filter:drop-shadow(0 0 20px ${meta.color});position:relative;z-index:1;">|' "$FILE"
echo "  ✅ Ceremony sealed pack → booster image"

# 6. Replace buy pack emojis with images (3 instances)
sed -i 's|<div class="pack-icon">📦</div>|<div class="pack-icon"><img src="/assets/images/booster-pack.png" alt="Pack"></div>|g' "$FILE"
sed -i 's|<div class="pack-icon">📦📦📦</div>|<div class="pack-icon"><img src="/assets/images/booster-pack.png" alt="Pack"></div>|g' "$FILE"
sed -i 's|<div class="pack-icon" style="font-size:28px;">📦 ×5</div>|<div class="pack-icon"><img src="/assets/images/booster-pack.png" alt="Pack"></div>|g' "$FILE"
echo "  ✅ Buy pack emojis → booster images"

# 7. Update pack-icon CSS to support images
sed -i 's|font-size: 44px; margin-bottom: 10px;|margin-bottom: 12px;|' "$FILE"

# Add img styles for pack-icon if not already there
if ! grep -q "pack-icon img" "$FILE"; then
  sed -i '/.pack-card .pack-icon {/a\    }\n    .pack-card .pack-icon img {\n      width: 100%; max-width: 160px; height: auto; border-radius: 8px;\n      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));' "$FILE"
  echo "  ✅ Added pack-icon img styles"
fi

# Add buy-pack img styles
if ! grep -q "buy-pack-card .pack-icon img" "$FILE"; then
  sed -i '/.buy-pack-card .pack-icon {/a\    }\n    .buy-pack-card .pack-icon img {\n      width: 100%; max-width: 120px; height: auto; border-radius: 8px;\n      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));' "$FILE"
  sed -i 's|.buy-pack-card .pack-icon { font-size: 36px; margin-bottom: 8px; }|.buy-pack-card .pack-icon { margin-bottom: 8px; }|' "$FILE"
  echo "  ✅ Added buy-pack img styles"
fi

# 8. Make pack cards bigger
sed -i 's|.pack-card {|.pack-card {\n      min-height: 320px; display: flex; flex-direction: column; align-items: center; justify-content: center;|' "$FILE"
# Fix duplicate — only apply padding change once
sed -i 's|padding: 22px 16px; cursor: pointer;|padding: 28px 20px; cursor: pointer;|' "$FILE"
echo "  ✅ Pack cards enlarged"

echo ""
echo "✅ All patches applied!"
echo ""
echo "Don't forget to:"
echo "  1. Put booster-pack.png in public/assets/images/"
echo "  2. git add . && git commit && git push"
echo "  3. Merge, pull, redeploy"
