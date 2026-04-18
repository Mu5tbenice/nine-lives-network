const supabase = require('./server/config/supabase');
const { narratives } = require('./server/services/narratives');

async function seed() {
  console.log(`Found ${narratives.length} narratives to seed...\n`);
  let success = 0;
  let errors = 0;

  for (const n of narratives) {
    const row = {
      id: n.id,
      title: n.title,
      theme: n.theme,
      tweet_1: n.tweet_1,
      tweet_2_prompt: n.tweet_2_prompt,
      tweet_3_prompt: n.tweet_3_prompt,
      tweet_4_prompt: n.tweet_4_prompt,
      images: n.images || [
        `${n.id}.1.png`,
        `${n.id}.2.png`,
        `${n.id}.3.png`,
        `${n.id}.4.png`,
      ],
    };

    const { error } = await supabase
      .from('narratives')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error(`❌ #${n.id} "${n.title}": ${error.message}`);
      errors++;
    } else {
      console.log(`✅ #${n.id} "${n.title}"`);
      success++;
    }
  }

  console.log(`\n===========================`);
  console.log(`✅ Seeded: ${success}`);
  if (errors > 0) console.log(`❌ Errors: ${errors}`);
  console.log(`===========================\n`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
