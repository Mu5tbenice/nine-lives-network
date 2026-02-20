#!/usr/bin/env python3
"""
Card V4 Deploy Script — Nine Lives Network
Run this in Replit Shell:   python3 deploy-v4.py

What it does:
  - Adds <script src="/js/card-particles.js"> to each page (if not already there)
  - Adds <script src="/js/card-v4.js"> to each page (if not already there)
  - That's it! No deletions, no risky edits.
"""

import os
import sys

PAGES = [
    'public/spellbook.html',
    'public/collection.html',
    'public/dashboard.html',
    'public/duels.html',
    'public/gauntlet.html',
    'public/boss.html',
    'public/zone-detail.html',
]

SCRIPTS_TO_ADD = '<script src="/js/card-particles.js"></script>\n<script src="/js/card-v4.js"></script>'

def main():
    print('')
    print('=== Card V4 Deploy Script ===')
    print('')

    # Safety check — are the new files present?
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
        print('  Add those files first, then run this script again.')
        sys.exit(1)

    print('  All required files found.')
    print('')

    changed = 0
    skipped = 0

    for page in PAGES:
        if not os.path.exists(page):
            print('  SKIP: ' + page + ' (file not found)')
            skipped += 1
            continue

        with open(page, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if already deployed
        if 'card-v4.js' in content:
            print('  SKIP: ' + page + ' (already has card-v4.js)')
            skipped += 1
            continue

        # Find </body> and insert scripts before it
        body_pos = content.rfind('</body>')
        if body_pos == -1:
            print('  SKIP: ' + page + ' (no </body> found)')
            skipped += 1
            continue

        # Insert the 2 script tags on the line before </body>
        new_content = content[:body_pos] + SCRIPTS_TO_ADD + '\n' + content[body_pos:]

        with open(page, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print('  DONE: ' + page)
        changed += 1

    print('')
    print('=== Results ===')
    print('  Updated: ' + str(changed) + ' pages')
    print('  Skipped: ' + str(skipped) + ' pages')
    print('')

    if changed > 0:
        print('  Next steps:')
        print('  1. Click Run in Replit to test')
        print('  2. Check the spellbook page — cards should show the v4 design')
        print('  3. If it works, commit:')
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
    else:
        print('  Nothing to do — all pages already updated!')

    print('')

if __name__ == '__main__':
    main()