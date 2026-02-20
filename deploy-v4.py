#!/usr/bin/env python3
"""
Card V4 Deploy Script v3 — Nine Lives Network
Run in Replit Shell:   python3 deploy-v4.py

KEY INSIGHT — script load order matters:
  - card-particles.js must load BEFORE the inline <script>
    (because the inline code calls initSpellCard)
  - card-v4.js must load AFTER the inline <script>
    (so the new buildCard overrides the old inline one)

The fetch('/api/spells') in the inline code is async, so card-v4.js
will always finish loading before the fetch callback fires.
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

def process_page(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # 1. Remove ALL old/new script tags we might have added before
    old_tags = [
        r'<script\s+src="/js/spell-particles\.js"\s*>\s*</script>\s*\n?',
        r'<script\s+src="/js/card-builder-v4\.js"\s*>\s*</script>\s*\n?',
        r'<script\s+src="/js/card-particles\.js"\s*>\s*</script>\s*\n?',
        r'<script\s+src="/js/card-v4\.js"\s*>\s*</script>\s*\n?',
    ]
    for pat in old_tags:
        if re.search(pat, content):
            content = re.sub(pat, '', content)
            changes.append('removed old script tag')

    # 2. Remove old card-v4-patch.css link
    if 'card-v4-patch.css' in content:
        content = re.sub(r'<link[^>]*card-v4-patch\.css[^>]*>\s*\n?', '', content)
        changes.append('removed card-v4-patch.css')

    # 3. Find the FIRST inline <script> block (not a src= script)
    #    Add card-particles.js BEFORE it
    match = re.search(r'<script>(?!\s*</script>)', content)
    if match:
        pos = match.start()
        content = content[:pos] + '<script src="/js/card-particles.js"></script>\n' + content[pos:]
        changes.append('added card-particles.js before inline script')
    else:
        # Fallback: before </body>
        pos = content.rfind('</body>')
        if pos != -1:
            content = content[:pos] + '<script src="/js/card-particles.js"></script>\n' + content[pos:]
            changes.append('added card-particles.js before </body>')

    # 4. Find </body> and add card-v4.js right before it
    #    This means it loads AFTER the inline script block
    body_pos = content.rfind('</body>')
    if body_pos != -1:
        content = content[:body_pos] + '<script src="/js/card-v4.js"></script>\n' + content[body_pos:]
        changes.append('added card-v4.js before </body> (after inline script)')

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return ', '.join(changes)
    else:
        return 'no changes needed'


def main():
    print('')
    print('=== Card V4 Deploy Script v3 ===')
    print('')

    # Safety check
    missing = []
    if not os.path.exists('public/js/card-particles.js'):
        missing.append('public/js/card-particles.js')
    if not os.path.exists('public/js/card-v4.js'):
        missing.append('public/js/card-v4.js')
    if not os.path.exists('public/css/card-v4.css'):
        missing.append('public/css/card-v4.css')

    if missing:
        for m in missing:
            print('  MISSING: ' + m)
        print('')
        print('  Add those files first, then run this again.')
        sys.exit(1)

    print('  All required files found.')
    print('')

    for page in PAGES:
        if not os.path.exists(page):
            print('  SKIP: ' + page + ' (not found)')
            continue
        result = process_page(page)
        print('  ' + page + ' -> ' + result)

    print('')
    print('Done! Now:')
    print('  1. Click Run in Replit to test')
    print('  2. Check spellbook + collection pages')
    print('  3. If working, commit:')
    print('')
    print('     git add -A')
    print('     git commit -m "feat: card v4 deployed across all pages"')
    print('     git push origin cleanup/card-v4-unified')
    print('     git checkout main')
    print('     git merge cleanup/card-v4-unified')
    print('     git push origin main')
    print('     git branch -d cleanup/card-v4-unified')
    print('')
    print('  4. Publish on Replit (Deployments tab)')
    print('')

if __name__ == '__main__':
    main()