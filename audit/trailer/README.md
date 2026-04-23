# Trailer Production — Pass 1 Scaffolding

Landing pad for the "Nines of Nethara" cinematic trailer. Spec is in `/9LN_CINEMATIC_TRAILER_PRODUCTION_PLAN.md` at the repo root.

## What lives here

```
audit/trailer/
├── README.md            ← this file
├── verify_assets.sh     ← run first; checks every §1.5 asset path resolves
├── recipes.md           ← per-house composition cheat-sheet (printable while compositing)
├── characters/
│   ├── hero/            ← 6–9 hero-pose Nine composites land here (1024×1024 PNG, transparent)
│   └── tag/             ← 6–9 comedic-tag composites land here
├── environments/        ← the 2 generated environments land here (neutral_battlefield + post_battle_wasteland)
└── vo/
    └── VO_SCRIPT.md     ← printable VO script, grouped in recording order
```

## Pass 1 checklist (from §8 of the production plan)

- [ ] Run `bash audit/trailer/verify_assets.sh` — confirm no missing paths
- [ ] Pick composition tool (Photoshop / Higgsfield Soul / Krita / GIMP — whatever's fastest)
- [ ] Build 6 hero composites using `recipes.md` → save to `characters/hero/<slug>.png`
- [ ] Build 6 tag composites → save to `characters/tag/<slug>_tag.png`
- [ ] (Optional) 3 ensemble composites: darktide, nighthollow, manastorm for Shot 13 depth
- [ ] Crop `nerm_head.png` from `public/assets/images/nerm.jpg` → save to `characters/nerm_head.png`
- [ ] Generate 2 missing environments (prompts in plan §5) → save to `environments/`
- [ ] Upload all assets to Higgsfield Cinema Studio 3.5 Elements library with exact slugs
- [ ] Record VO per `vo/VO_SCRIPT.md`, 3–5 takes per line, save to `vo/takes/`

## Known asset-filename typos (pre-existing, not ours to fix here)

These files are referenced by the recipes. Use them as-is — fixing the names is a separate cleanup out of scope for the trailer:
- `APPRENTICE_STORMAGE.png` (missing R — should be STORMRAGE)
- `MONICLE.png` (should be MONOCLE)
- `FRSOTBLADE.png` (should be FROSTBLADE)

Filed as a future cleanup; not blocking.
