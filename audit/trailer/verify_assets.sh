#!/usr/bin/env bash
# Verifies every asset the trailer references actually exists on disk.
# Run from repo root: bash audit/trailer/verify_assets.sh
# Exits 0 if all good, 1 if anything missing. Reports are printed to stdout.

set -u
cd "$(dirname "$0")/../.."

missing=0
found=0

check() {
  if [ -f "$1" ]; then
    found=$((found + 1))
  else
    echo "MISSING: $1"
    missing=$((missing + 1))
  fi
}

echo "=== Logo + branding ==="
check "public/assets/images/200x200logo.png"
check "public/assets/images/title-nethara.png"
check "public/assets/images/Mustbenice_Base_model.png"

echo "=== House sigils ==="
check "public/assets/images/houses/House-stormrage.png"
check "public/assets/images/houses/House-stonebark.png"
check "public/assets/images/houses/House-plaguemire.png"
check "public/assets/images/houses/House-Ashenvale.png"
check "public/assets/images/houses/House-dawnbringer.png"
check "public/assets/images/houses/House-smoulders.png"
check "public/assets/images/houses/House-darktide.png"
check "public/assets/images/houses/House-nighthollow.png"
check "public/assets/images/houses/House-manastorm.png"

echo "=== Biome environments ==="
check "public/assets/images/biomes/skycastle.png"
check "public/assets/images/biomes/chaos-rift.png"
check "public/assets/images/biomes/twilight-grove.png"
check "public/assets/images/biomes/Hanwu-Boglands.png"
check "public/assets/images/biomes/abysal-edge.png"
check "public/assets/images/biomes/misty-falls.png"
check "public/assets/images/biomes/scorched-plains.png"

echo "=== Nerm source ==="
check "public/assets/images/nerm.jpg"

echo "=== Character composition layers (fur) ==="
check "public/assets/nine/fur/STORMGREY.png"
check "public/assets/nine/fur/TABBY.png"
check "public/assets/nine/fur/ALIENGREEN.png"
check "public/assets/nine/fur/SMOKEGREY.png"
check "public/assets/nine/fur/GOLDEN.png"
check "public/assets/nine/fur/EMBERORANGE.png"
check "public/assets/nine/fur/OCEANBLUE.png"
check "public/assets/nine/fur/MIDNIGHTBLACK.png"
check "public/assets/nine/fur/VOIDPURPLE.png"

echo "=== Character composition layers (outfit — house simpletunics) ==="
check "public/assets/nine/outfit/SIMPLETUNIC_STORMRAGE.png"
check "public/assets/nine/outfit/SIMPLETUNIC_STONEBARK.png"
check "public/assets/nine/outfit/SIMPLETUNIC_PLAGUEMIRE.png"
check "public/assets/nine/outfit/SIMPLETUNIC_ASHENVALE.png"
check "public/assets/nine/outfit/SIMPLETUNIC_DAWNBRINGER.png"
check "public/assets/nine/outfit/SIMPLETUNIC_SMOULDERS.png"
check "public/assets/nine/outfit/SIMPLETUNIC_DARKTIDE.png"
check "public/assets/nine/outfit/SIMPLETUNIC_NIGHTHOLLOW.png"
check "public/assets/nine/outfit/SIMPLETUNIC_MANASTORM.png"

echo "=== Character composition layers (headwear) ==="
check "public/assets/nine/headwear/APPRENTICE_STORMAGE.png"   # note: filename typo (missing R) — intentional, use as-is
check "public/assets/nine/headwear/WORNHOOD_STONEBARK.png"
check "public/assets/nine/headwear/WORNHOOD_PLAGUEMIRE.png"
check "public/assets/nine/headwear/CLOTHWRAP.png"
check "public/assets/nine/headwear/RADIANTHALO.png"
check "public/assets/nine/headwear/EMBERHAT.png"
check "public/assets/nine/headwear/TIDAL.png"
check "public/assets/nine/headwear/UMBRALCOWL.png"
check "public/assets/nine/headwear/ARCANECIRCLET.png"

echo "=== Character composition layers (weapons) ==="
check "public/assets/nine/weapon/STAFFOFSTORMS.png"
check "public/assets/nine/weapon/GNARLEDBRANCH.png"
check "public/assets/nine/weapon/SCYTHE.png"
check "public/assets/nine/weapon/DUALDAGGERS.png"
check "public/assets/nine/weapon/LIGHTBRINGER.png"
check "public/assets/nine/weapon/EMBERSTAFF.png"
check "public/assets/nine/weapon/TRIDENT.png"
check "public/assets/nine/weapon/SHADOWWAND.png"
check "public/assets/nine/weapon/STAFFOFTHENINE.png"

echo "=== Character composition layers (familiars) ==="
check "public/assets/nine/familiar/ORB_STORMRAGE.png"
check "public/assets/nine/familiar/MUSHROOMBUDDY.png"
check "public/assets/nine/familiar/FLOATINGSKULL.png"
check "public/assets/nine/familiar/SPIRITWOLF.png"
check "public/assets/nine/familiar/BABYPHEONIX.png"
check "public/assets/nine/familiar/EMBERSPRITE.png"
check "public/assets/nine/familiar/ORB_DARKTIDE.png"
check "public/assets/nine/familiar/RAVEN.png"
check "public/assets/nine/familiar/ARCANECONSTRUCT.png"

echo "=== Character composition layers (expressions) ==="
check "public/assets/nine/expression/DETERMINED.png"
check "public/assets/nine/expression/NEUTRAL.png"
check "public/assets/nine/expression/GLOWING_GREEN.png"
check "public/assets/nine/expression/GLOWING_PURPLE.png"
check "public/assets/nine/expression/GLOWING.png"
check "public/assets/nine/expression/ANGRY.png"
check "public/assets/nine/expression/SMUG.png"
check "public/assets/nine/expression/DERP.png"
check "public/assets/nine/expression/SLEEPY.png"
check "public/assets/nine/expression/WINK.png"
check "public/assets/nine/expression/LAUGH.png"
check "public/assets/nine/expression/GRUMPY.png"
check "public/assets/nine/expression/HAPPY.png"

echo ""
echo "=== Summary ==="
echo "Found:   $found"
echo "Missing: $missing"

if [ "$missing" -gt 0 ]; then
  exit 1
fi
exit 0
