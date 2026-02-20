#!/usr/bin/env python3
"""
NUKE OLD CARD SYSTEM — Nine Lives Network
==========================================
Run in Replit Shell:   python3 nuke-old-cards.py

This script does 3 things:
  1. Strips old spell-card CSS from components-v2.css
  2. Adds backward-compat aliases to card-v4.js
  3. Fixes script tags + removes old inline card code from all pages
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

# Script tags to REMOVE from pages
OLD_SCRIPTS = [
    'spell-particles.js',
    'card-builder-v4.js',
    'spell-card-builder.js',
]

# Scripts to add BEFORE inline <script> on each page
NEW_SCRIPTS = '<script src="/js/card-particles.js"></script>\n<script src="/js/card-v4.js"></script>\n'


# ═══════════════════════════════════════════════════
# STEP 1: Strip old card CSS from components-v2.css
# ═══════════════════════════════════════════════════
def strip_card_css():
    path = 'public/css/components-v2.css'
    if not os.path.exists(path):
        print('  SKIP: components-v2.css not found')
        return

    with open(path, 'r', encoding='utf-8') as f:
        css = f.read()

    # Already stripped?
    if 'PLAYING CARD SYSTEM' not in css:
        print('  SKIP: components-v2.css already stripped (no PLAYING CARD SYSTEM found)')
        return

    # Find start: "PLAYING CARD SYSTEM" comment block
    start_marker = css.find('PLAYING CARD SYSTEM')
    if start_marker == -1:
        print('  SKIP: marker not found')
        return

    # Go back to the /* that starts this comment
    start = css.rfind('/*', 0, start_marker)
    if start == -1:
        start = start_marker

    # Find end: "TIMELINE CARDS" section (this we KEEP)
    end_marker = css.find('TIMELINE CARDS', start + 50)
    if end_marker != -1:
        # Go back to the /* that starts the TIMELINE comment
        end = css.rfind('/*', start + 50, end_marker)
        if end == -1:
            end = end_marker
    else:
        # No timeline section — remove to end of file
        end = len(css)

    # Build new CSS: everything before card section + everything after
    before = css[:start].rstrip('\n\r\t ') + '\n\n'
    after = css[end:]
    new_css = before + after

    # Backup original
    with open(path + '.bak', 'w', encoding='utf-8') as f:
        f.write(css)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_css)

    removed_lines = css.count('\n') - new_css.count('\n')
    print('  DONE: components-v2.css — removed ~' + str(removed_lines) + ' lines of old card/zoom/pill CSS')
    print('        Backup: components-v2.css.bak')


# ═══════════════════════════════════════════════════
# STEP 2: Add backward-compat aliases to card-v4.js
# ═══════════════════════════════════════════════════
def add_card_v4_aliases():
    path = 'public/js/card-v4.js'
    if not os.path.exists(path):
        print('  SKIP: card-v4.js not found')
        return

    with open(path, 'r', encoding='utf-8') as f:
        js = f.read()

    added = []

    # Add buildSpellCard alias (collection.html uses this)
    if 'buildSpellCard' not in js:
        js += '\n/* ═══ BACKWARD COMPAT — aliases for existing pages ═══ */\n'
        js += 'var buildSpellCard = buildCardV4;\n'
        added.append('buildSpellCard')

    if added:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(js)
        print('  DONE: card-v4.js — added aliases: ' + ', '.join(added))
    else:
        print('  SKIP: card-v4.js already has all aliases')


# ═══════════════════════════════════════════════════
# STEP 3: Fix each HTML page
# ═══════════════════════════════════════════════════
def remove_function(content, name):
    """Remove a function definition by brace-matching."""
    patterns = ['function ' + name + '(', 'function ' + name + ' (']
    start = -1
    for pat in patterns:
        start = content.find(pat)
        if start != -1:
            break
    if start == -1:
        return content, False

    # Find opening brace
    try:
        brace_pos = content.index('{', start)
    except ValueError:
        return content, False

    depth = 0
    end = brace_pos
    for j in range(brace_pos, len(content)):
        if content[j] == '{':
            depth += 1
        elif content[j] == '}':
            depth -= 1
            if depth == 0:
                end = j + 1
                break

    # Eat trailing whitespace/newline
    while end < len(content) and content[end] in '\n\r':
        end += 1

    return content[:start] + content[end:], True


def remove_var_line(content, prefix):
    """Remove single-line var declaration starting with prefix."""
    lines = content.split('\n')
    new_lines = []
    removed = False
    for line in lines:
        if line.strip().startswith(prefix):
            removed = True
            continue
        new_lines.append(line)
    return '\n'.join(new_lines), removed


def process_page(path):
    if not os.path.exists(path):
        return 'file not found'

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # ── 1. Remove ALL old + new script tags (clean slate) ──
    scripts_to_strip = OLD_SCRIPTS + ['card-particles.js', 'card-v4.js']
    for s in scripts_to_strip:
        pat = r'<script\s+src="/js/' + re.escape(s) + r'"\s*>\s*</script>\s*\n?'
        if re.search(pat, content):
            content = re.sub(pat, '', content)
            changes.append('removed ' + s)

    # Remove old CSS link
    if 'card-v4-patch.css' in content:
        content = re.sub(r'<link[^>]*card-v4-patch\.css[^>]*>\s*\n?', '', content)
        changes.append('removed card-v4-patch.css')

    # ── 2. Add card-particles.js + card-v4.js BEFORE first inline <script> ──
    match = re.search(r'<script>(?!\s*</script>)', content)
    if match:
        pos = match.start()
        content = content[:pos] + NEW_SCRIPTS + content[pos:]
        changes.append('added card-particles.js + card-v4.js')
    else:
        bp = content.rfind('</body>')
        if bp != -1:
            content = content[:bp] + NEW_SCRIPTS + content[bp:]
            changes.append('added scripts before </body>')

    # ── 3. Remove old inline card code from <script> blocks ──

    # Remove inline buildCard function (30+ lines, brace-matched)
    content, ok = remove_function(content, 'buildCard')
    if ok:
        changes.append('removed inline buildCard()')

    # Remove inline pillCol function
    content, ok = remove_function(content, 'pillCol')
    if ok:
        changes.append('removed inline pillCol()')

    # Remove single-line vars
    for prefix, label in [
        ('var PC=', 'var PC'),
        ('var PC ={', 'var PC'),
        ("var PC={'", 'var PC'),
        ('var PARTICLE_MAP=', 'var PARTICLE_MAP'),
        ('var PARTICLE_MAP ={', 'var PARTICLE_MAP'),
        ('var STAT_COLORS=', 'var STAT_COLORS'),
        ('var STAT_COLORS ={', 'var STAT_COLORS'),
    ]:
        content, ok = remove_var_line(content, prefix)
        if ok:
            changes.append('removed ' + label)

    # ── 4. Clean up any double blank lines ──
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
    print('========================================')
    print('   NUKE OLD CARD SYSTEM')
    print('   Nine Lives Network')
    print('========================================')
    print('')

    # Safety check
    required = ['public/js/card-particles.js', 'public/js/card-v4.js', 'public/css/card-v4.css']
    missing = [f for f in required if not os.path.exists(f)]
    if missing:
        for m in missing:
            print('  MISSING: ' + m)
        print('\n  Add those files first, then run again.')
        sys.exit(1)

    print('Step 1: Strip old card CSS from components-v2.css')
    strip_card_css()
    print('')

    print('Step 2: Add backward-compat aliases to card-v4.js')
    add_card_v4_aliases()
    print('')

    print('Step 3: Fix HTML pages')
    for page in PAGES:
        result = process_page(page)
        print('  ' + page + ' -> ' + result)
    print('')

    print('========================================')
    print('  ALL DONE!')
    print('========================================')
    print('')
    print('Next steps:')
    print('  1. Click Run in Replit to test')
    print('  2. Check: spellbook, collection, dashboard')
    print('  3. If cards show the new v4 design, commit:')
    print('')
    print('     git add -A')
    print('     git commit -m "nuke: unified card-v4, removed old card system"')
    print('     git push origin cleanup/card-v4-unified')
    print('     git checkout main')
    print('     git merge cleanup/card-v4-unified')
    print('     git push origin main')
    print('     git branch -d cleanup/card-v4-unified')
    print('')
    print('  4. Publish on Replit (Deployments tab)')
    print('')
    print('If something looks wrong:')
    print('  - components-v2.css.bak has the original CSS')
    print('  - git checkout -- . will undo all changes')
    print('')


if __name__ == '__main__':
    main()