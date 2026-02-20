#!/usr/bin/env python3
"""
Card V4 Deploy Script v2 — Nine Lives Network
Run in Replit Shell:   python3 deploy-v4.py

What it does for EACH page:
  1. Removes old <script src="/js/spell-particles.js"> tag
  2. Removes old <script src="/js/card-builder-v4.js"> tag
  3. Removes old <link href="/css/card-v4-patch.css"> tag
  4. Removes any previously-added card-particles.js / card-v4.js tags
  5. Adds card-particles.js + card-v4.js BEFORE the first inline <script> block
     (so initSpellCard is defined before the page code needs it)
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

NEW_SCRIPTS = '<script src="/js/card-particles.js"></script>\n<script src="/js/card-v4.js"></script>\n'

def process_page(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # 1. Remove old spell-particles.js script tag
    if 'spell-particles.js' in content:
        content = re.sub(r'<script\s+src="/js/spell-particles\.js"\s*>\s*</script>\s*\n?', '', content)
        changes.append('removed spell-particles.js')

    # 2. Remove old card-builder-v4.js script tag
    if 'card-builder-v4.js' in content:
        content = re.sub(r'<script\s+src="/js/card-builder-v4\.js"\s*>\s*</script>\s*\n?', '', content)
        changes.append('removed card-builder-v4.js')

    # 3. Remove old card-v4-patch.css link tag
    if 'card-v4-patch.css' in content:
        content = re.sub(r'<link[^>]*card-v4-patch\.css[^>]*>\s*\n?', '', content)
        changes.append('removed card-v4-patch.css')

    # 4. Remove any previously-added new script tags (from old deploy or manual add)
    if 'card-particles.js' in content:
        content = re.sub(r'<script\s+src="/js/card-particles\.js"\s*>\s*</script>\s*\n?', '', content)
    if 'card-v4.js' in content:
        content = re.sub(r'<script\s+src="/js/card-v4\.js"\s*>\s*</script>\s*\n?', '', content)

    # 5. Find the FIRST inline <script> block (not a src= script)
    #    and insert our 2 new scripts BEFORE it
    match = re.search(r'<script>(?!\s*</script>)', content)
    if match:
        pos = match.start()
        content = content[:pos] + NEW_SCRIPTS + content[pos:]
        changes.append('added card-particles.js + card-v4.js before inline script')
    else:
        # Fallback: add before </body>
        pos = content.rfind('</body>')
        if pos != -1:
            content = content[:pos] + NEW_SCRIPTS + content[pos:]
            changes.append('added card-particles.js + card-v4.js before </body>')
        else:
            return 'ERROR: no <script> or </body> found'

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return ', '.join(changes)
    else:
        return 'no changes needed'


def main():
    print('')
    print('=== Card V4 Deploy Script v2 ===')
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