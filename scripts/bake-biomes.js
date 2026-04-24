// Bake downsampled webp copies of biome backgrounds for the Survivors mode.
// Originals in public/assets/images/biomes/ are 1.5–23 MB — unusable on mobile.
// Targets: ~1024 px wide, ~75 quality webp in public/assets/images/biomes/web/.
//
// Run: node scripts/bake-biomes.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC_DIR = path.join(__dirname, "..", "public", "assets", "images", "biomes");
const OUT_DIR = path.join(SRC_DIR, "web");

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error("source dir missing:", SRC_DIR);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(SRC_DIR).filter(f =>
    /\.(png|jpg|jpeg)$/i.test(f) && !fs.statSync(path.join(SRC_DIR, f)).isDirectory()
  );

  let ok = 0, skipped = 0;
  for (const f of files) {
    const inPath  = path.join(SRC_DIR, f);
    const base    = f.replace(/\.(png|jpg|jpeg)$/i, "");
    const outPath = path.join(OUT_DIR, `${base}.webp`);

    const before = fs.statSync(inPath).size;
    try {
      await sharp(inPath)
        .resize({ width: 1024, withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toFile(outPath);
      const after = fs.statSync(outPath).size;
      console.log(
        `  ${base.padEnd(24)}  ${(before/1024/1024).toFixed(1).padStart(5)}MB → ${(after/1024).toFixed(0).padStart(4)}KB`
      );
      ok++;
    } catch (err) {
      console.warn(`  ${base.padEnd(24)}  SKIPPED (${err.message.split("\n")[0]})`);
      skipped++;
    }
  }

  console.log(`\ndone — ${ok} baked, ${skipped} skipped → ${path.relative(process.cwd(), OUT_DIR)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
