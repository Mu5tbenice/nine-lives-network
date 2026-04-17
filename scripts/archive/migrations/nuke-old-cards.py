#!/usr/bin/env python3
"""
NUKE OLD CARD SYSTEM v2 — Nine Lives Network
=============================================
Run in Replit Shell:   python3 nuke-old-cards.py

WHAT THIS DOES:
  1. Strips ALL old spell-card CSS from components-v2.css
  2. On every page:
     - Removes old/broken script tags
     - Adds card-particles.js + card-v4.js BEFORE inline code
     - Adds a tiny OVERRIDE block AFTER inline code that forces
       buildCard → buildCardV4 (bulletproof, no brace-matching needed)

WHY THIS WORKS:
  - card-v4.js loads → defines buildCardV4 (the new renderer)
  - Inline script runs → defines old buildCard, starts async fetch()
  - Override block runs → replaces buildCard with buildCardV4
  - fetch completes → render() calls buildCard → gets new v4 design
"""

import os, sys, re

PAGES = [
    'public/spellbook.html',
    'public/collection.html',
    'public/dashboard.html',
    'public/duels.html',
    'public/gauntlet.html',
    'public/boss.html',
    'public/zone-detail.html',
]

# Every old script tag we want GONE
DEAD_SCRIPTS = [
    'spell-particles.js',
    'card-builder-v4.js',
    'spell-card-builder.js',
    # NOTE: card-global.js is KEPT — it defines HOUSES, HO, esc()
    # that filter/sort code in pages needs
    'card-particles.js',
    'card-v4.js',
]

# The override that goes AFTER the inline <script> block
OVERRIDE_BLOCK = """<script>
/* ═══ V4 OVERRIDE — forces all card rendering through card-v4.js ═══ */
if(typeof buildCardV4==='function'){
  buildCard=function(s,d){return buildCardV4(s,{delay:d||0});};
  buildSpellCard=function(s,opts){return buildCardV4(s,opts);};
}
</script>"""


# ═══════════════════════════════════════════════════
# STEP 1: Strip old card CSS from components-v2.css
# ═══════════════════════════════════════════════════
def strip_card_css():
    path = 'public/css/components-v2.css'
    if not os.path.exists(path):
        print('  SKIP: components-v2.css not found')
        return

    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find the start line (PLAYING CARD SYSTEM comment)
    start_line = None
    end_line = None
    for i, line in enumerate(lines):
        if 'PLAYING CARD SYSTEM' in line:
            # Back up to the /* that starts this comment block
            j = i
            while j > 0 and '/*' not in lines[j]:
                j -= 1
            start_line = j
        if start_line is not None and 'TIMELINE CARDS' in line:
            # Back up to the /* that starts the TIMELINE comment
            j = i
            while j > start_line and '/*' not in lines[j]:
                j -= 1
            end_line = j
            break

    if start_line is None:
        print('  SKIP: no PLAYING CARD SYSTEM section found')
        return

    if end_line is None:
        # No timeline section — check for COMBO CARDS or just cut to end
        for i, line in enumerate(lines):
            if i > start_line and ('COMBO CARDS' in line or 'SECTION HEADERS' in line):
                j = i
                while j > start_line and '/*' not in lines[j]:
                    j -= 1
                end_line = j
                break
        if end_line is None:
            end_line = len(lines)

    # Backup
    with open(path + '.bak', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    # Rebuild: keep before + keep after
    new_lines = lines[:start_line] + ['\n/* Old card CSS removed — now in card-v4.css */\n\n'] + lines[end_line:]

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    removed = (end_line - start_line)
    print('  DONE: removed ~' + str(removed) + ' lines (lines ' + str(start_line+1) + '-' + str(end_line) + ')')
    print('  Backup: components-v2.css.bak')


# ═══════════════════════════════════════════════════
# STEP 2: Add buildSpellCard alias to card-v4.js
# ═══════════════════════════════════════════════════
def patch_card_v4_js():
    path = 'public/js/card-v4.js'
    if not os.path.exists(path):
        print('  SKIP: card-v4.js not found')
        return

    with open(path, 'r', encoding='utf-8') as f:
        js = f.read()

    if 'buildSpellCard' in js:
        print('  SKIP: already has buildSpellCard alias')
        return

    js += '\n/* ═══ ALIASES for backward compat ═══ */\n'
    js += 'if(typeof buildSpellCard==="undefined") var buildSpellCard=buildCardV4;\n'

    with open(path, 'w', encoding='utf-8') as f:
        f.write(js)
    print('  DONE: added buildSpellCard alias')


# ═══════════════════════════════════════════════════
# STEP 3: Fix each HTML page
# ═══════════════════════════════════════════════════
def fix_page(path):
    if not os.path.exists(path):
        return 'not found'

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # ── A. Remove ALL old + new script tags ──
    for s in DEAD_SCRIPTS:
        pat = r'<script\s+src="[^"]*' + re.escape(s) + r'"\s*>\s*</script>\s*\n?'
        if re.search(pat, content):
            content = re.sub(pat, '', content)
            changes.append('removed ' + s)

    # ── B. Remove old CSS links ──
    if 'card-v4-patch.css' in content:
        content = re.sub(r'<link[^>]*card-v4-patch\.css[^>]*>\s*\n?', '', content)
        changes.append('removed card-v4-patch.css')

    # ── C. Remove any old V4 OVERRIDE blocks from previous runs ──
    content = re.sub(r'<script>\s*/\*\s*═+\s*V4 OVERRIDE[^<]*</script>\s*\n?', '', content)

    # ── D. Find the LAST </script> before </body> ──
    #    Add card-particles.js + card-v4.js BEFORE the first inline <script>
    #    Add the OVERRIDE block AFTER the last </script>

    # Find first inline <script> (not src=)
    inline_match = re.search(r'<script>(?!\s*</script>)', content)

    # Find the last </script> before </body>
    body_pos = content.rfind('</body>')
    if body_pos == -1:
        return 'ERROR: no </body>'

    # Find all </script> positions before </body>
    last_script_end = -1
    for m in re.finditer(r'</script>', content):
        if m.end() < body_pos:
            last_script_end = m.end()

    # Add card-particles.js + card-v4.js BEFORE first inline <script>
    insert_before = '<script src="/js/card-particles.js"></script>\n<script src="/js/card-v4.js"></script>\n'

    if inline_match:
        pos = inline_match.start()
        content = content[:pos] + insert_before + content[pos:]
        changes.append('added card-particles.js + card-v4.js')

        # Recalculate positions since we inserted text
        body_pos = content.rfind('</body>')
        last_script_end = -1
        for m in re.finditer(r'</script>', content):
            if m.end() < body_pos:
                last_script_end = m.end()
    else:
        # No inline script — just add before </body>
        content = content[:body_pos] + insert_before + content[body_pos:]
        changes.append('added scripts before </body>')
        body_pos = content.rfind('</body>')
        last_script_end = body_pos

    # Add OVERRIDE block after the last </script>
    if last_script_end > 0:
        content = content[:last_script_end] + '\n' + OVERRIDE_BLOCK + '\n' + content[last_script_end:]
        changes.append('added V4 override')

    # ── E. Clean up excessive blank lines ──
    content = re.sub(r'\n{4,}', '\n\n\n', content)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return ', '.join(changes)
    return 'no changes needed'


# ═══════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════
def main():
    print('')
    print('==========================================')
    print('  NUKE OLD CARD SYSTEM v2')
    print('  Nine Lives Network')
    print('==========================================')
    print('')

    # Safety check
    required = ['public/js/card-particles.js', 'public/js/card-v4.js', 'public/css/card-v4.css']
    missing = [f for f in required if not os.path.exists(f)]
    if missing:
        for m in missing:
            print('  MISSING: ' + m)
        print('\n  Add those files first.')
        sys.exit(1)

    print('Step 1/3: Strip old card CSS from components-v2.css')
    strip_card_css()
    print('')

    print('Step 2/3: Patch card-v4.js with aliases')
    patch_card_v4_js()
    print('')

    print('Step 3/3: Fix HTML pages')
    for page in PAGES:
        result = fix_page(page)
        print('  ' + page + ' -> ' + result)
    print('')

    print('==========================================')
    print('  DONE!')
    print('==========================================')
    print('')
    print('Now:')
    print('  1. Click Run in Replit')
    print('  2. Check spellbook + collection')
    print('  3. You should see: colored stats, gold type labels,')
    print('     droplet mana icon, effect pill tooltips')
    print('')
    print('  4. If good, commit:')
    print('')
    print('     git add -A')
    print('     git commit -m "nuke: unified card-v4 system site-wide"')
    print('     git push origin cleanup/card-v4-unified')
    print('     git checkout main')
    print('     git merge cleanup/card-v4-unified')
    print('     git push origin main')
    print('     git branch -d cleanup/card-v4-unified')
    print('')
    print('  5. Deployments tab -> Publish')
    print('')
    print('If broken: git checkout -- .  (undoes everything)')
    print('CSS backup: public/css/components-v2.css.bak')
    print('')

if __name__ == '__main__':
    main()