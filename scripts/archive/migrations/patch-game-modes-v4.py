#!/usr/bin/env python3
"""
patch-game-modes-v4.py
Patches duels.html, gauntlet.html, boss.html to use v4 card-slot styling.
Run from ~/workspace in Replit Shell:  python3 patch-game-modes-v4.py
"""
import re, os

def patch_file(path, patches):
    """Apply a list of (old, new) replacements to a file."""
    if not os.path.exists(path):
        print(f"  ⏭  {path} — not found, skipping")
        return False
    with open(path, 'r') as f:
        content = f.read()
    changed = False
    for old, new in patches:
        if old in content:
            content = content.replace(old, new, 1)
            changed = True
    # Also ensure CSS + JS includes are present
    if 'card-slot-v4.css' not in content:
        content = content.replace('</head>', '  <link rel="stylesheet" href="/css/card-slot-v4.css">\n</head>')
        changed = True
    if 'card-slot-helper.js' not in content:
        content = content.replace('</body>', '<script src="/js/card-globals.js"></script>\n<script src="/js/card-slot-helper.js"></script>\n</body>')
        changed = True
    if changed:
        with open(path, 'w') as f:
            f.write(content)
        print(f"  ✅ {path} — patched")
    else:
        print(f"  ⏭  {path} — already up to date")
    return changed

print()
print("🃏 Patching game mode pages with v4 card-slot styling...")
print()

# ─── DUELS ───
# Replace the loadCollection card rendering
duels_old = """      collection.forEach(function(c,i){
        var house=getHouse(c.school_id||c.house_id);
        h+='<div class="card-slot" data-idx="'+i+'" onclick="toggleCard('+i+')">';
        h+='<div class="card-name">'+c.name+'</div>';
        h+='<div class="card-type" style="color:'+(TYPE_COLORS[c.card_type]||'var(--muted)')+'">'+ ((c.card_type||'').toUpperCase())+'</div>';
        h+='<div class="card-stats"><span class="card-stat stat-atk">⚔'+((c.base_atk||c.atk||0))+'</span><span class="card-stat stat-hp">♥'+((c.base_hp||c.hp||0))+'</span></div>';
        h+='<div class="card-rarity" style="color:'+(RARITY_COLORS[c.rarity]||'#999')+'">'+ ((c.rarity||'').toUpperCase())+'</div>';
        h+='</div>';
      });"""

duels_new = """      collection.forEach(function(c,i){
        var slot = buildCardSlot(c, 'toggleCard('+i+')');
        // Add data-idx for selection tracking
        slot = slot.replace('class="card-slot"', 'class="card-slot" data-idx="'+i+'"');
        h += slot;
      });"""

patch_file('public/duels.html', [(duels_old, duels_new)])

# ─── GAUNTLET ───
gauntlet_old = """      collection.forEach(function(c){
        html+='<div class="card-slot" onclick="fightWithCard('+c.id+')">';
        html+='<div class="card-name">'+c.name+'</div>';
        html+='<div class="card-type" style="color:'+(TYPE_COLORS[c.card_type]||'var(--muted)')+'">'+((c.card_type||'').toUpperCase())+'</div>';
        html+='<div class="card-stats"><span class="card-stat stat-atk">⚔'+(c.base_atk||c.atk||0)+'</span><span class="card-stat stat-hp">♥'+(c.base_hp||c.hp||0)+'</span></div>';
        html+='</div>';
      });"""

gauntlet_new = """      collection.forEach(function(c){
        html += buildCardSlot(c, 'fightWithCard('+c.id+')');
      });"""

patch_file('public/gauntlet.html', [(gauntlet_old, gauntlet_new)])

# ─── BOSS ───
boss_old = """      collection.forEach(function(c){
        h+='<div class="card-slot" onclick="attackBoss('+c.id+',this)">';
        h+='<div class="card-name">'+c.name+'</div>';
        h+='<div class="card-type" style="color:'+(TYPE_COLORS[c.card_type]||'var(--muted)')+'">'+((c.card_type||'').toUpperCase())+'</div>';
        h+='<div class="card-stats"><span class="card-stat stat-atk">⚔'+(c.base_atk||c.atk||0)+'</span><span class="card-stat stat-hp">♥'+(c.base_hp||c.hp||0)+'</span></div>';
        h+='</div>';
      });"""

boss_new = """      collection.forEach(function(c){
        h += buildCardSlot(c, 'attackBoss('+c.id+',this)');
      });"""

patch_file('public/boss.html', [(boss_old, boss_new)])

print()
print("✨ Done! Game mode cards now have:")
print("   • House-colored left accent stripe")
print("   • Rarity border glow (legendary = gold)")
print("   • V4 stat colors with text-shadow")
print("   • Cinzel font on card names")
print("   • Type-specific coloring")
print()