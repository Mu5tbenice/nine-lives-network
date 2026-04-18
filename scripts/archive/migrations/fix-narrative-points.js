// ═══════════════════════════════════════════════════════
// PATCH: fix-narrative-points.js
//
// Run this ONCE from your project root to fix narrativeEngine.js:
//   node fix-narrative-points.js
//
// What it does:
//   1. Adds `const { addPoints: centralAddPoints } = require('./pointsService');`
//   2. Replaces the broken awardPoints function with one that works
//
// After running, delete this file.
// ═══════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'server',
  'services',
  'narrativeEngine.js',
);

let content = fs.readFileSync(filePath, 'utf8');

// ── PATCH 1: Add import at top (after existing requires) ──
const importLine = `const { addPoints: centralAddPoints } = require('./pointsService');`;
if (!content.includes('pointsService')) {
  // Insert after the narratives require
  const anchor = `const { narratives, getRandomNarrative, getNarrativeById } = require("./narratives");`;
  if (content.includes(anchor)) {
    content = content.replace(anchor, anchor + '\n' + importLine);
    console.log('✅ Added pointsService import');
  } else {
    console.log('⚠️ Could not find import anchor — add manually:');
    console.log('   ' + importLine);
  }
}

// ── PATCH 2: Replace the broken awardPoints function ──
const oldFn = `async function awardPoints(playerId, points, source) {
  try {
    // Try RPC first
    const { error } = await supabase.rpc("increment_player_points", {
      p_player_id: playerId,
      p_points: points,
    });

    if (error) {
      // Fallback: manual update
      const { data: player } = await supabase
        .from("players")
        .select("seasonal_points, lifetime_points")
        .eq("id", playerId)
        .single();

      if (player) {
        await supabase.from("players").update({
          seasonal_points: (player.seasonal_points || 0) + points,
          lifetime_points: (player.lifetime_points || 0) + points,
        }).eq("id", playerId);
      }
    }
  } catch (err) {
    console.error(\`[Chronicle] Points error for \${playerId}:\`, err.message);
  }
}`;

const newFn = `async function awardPoints(playerId, points, source) {
  // Delegates to central pointsService (uses supabaseAdmin, bypasses RLS)
  await centralAddPoints(playerId, points, source || 'chronicle', 'Chronicle points');
}`;

if (content.includes('increment_player_points')) {
  content = content.replace(oldFn, newFn);
  console.log('✅ Replaced broken awardPoints function');
} else if (content.includes('centralAddPoints')) {
  console.log('ℹ️ awardPoints already patched');
} else {
  console.log('⚠️ Could not find exact awardPoints function to replace.');
  console.log(
    '   Manually replace the awardPoints function (around line 301) with:',
  );
  console.log('');
  console.log(newFn);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('');
console.log('✅ narrativeEngine.js patched successfully!');
console.log('🗑️  You can delete fix-narrative-points.js now.');
