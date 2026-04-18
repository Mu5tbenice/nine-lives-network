// server/services/bossEngine.js
// V3 Weekly Boss — Guild PvE Raid

const supabase = require('../config/supabase');
const { spendMana } = require('./manaRegen');

async function spawnBoss() {
  await supabase
    .from('boss_fights')
    .update({ is_active: false })
    .eq('is_active', true);
  const { count } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true });
  const totalHp = (count || 10) * 100;
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 7);
  const names = [
    "Nethara's Shadow",
    'The Void Serpent',
    'Dreadmaw the Eternal',
    'Ashclaw Titan',
    'The Mana Devourer',
  ];
  const bossName = names[Math.floor(Math.random() * names.length)];
  const { data, error } = await supabase
    .from('boss_fights')
    .insert({
      boss_name: bossName,
      total_hp: totalHp,
      current_hp: totalHp,
      phase: 1,
      is_active: true,
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  console.log(`[BOSS] Spawned "${bossName}" with ${totalHp} HP`);
  return data;
}

async function getActiveBoss() {
  const { data } = await supabase
    .from('boss_fights')
    .select('*')
    .eq('is_active', true)
    .single();
  if (!data) return null;
  const { data: contribs } = await supabase
    .from('boss_contributions')
    .select('player_id, damage_dealt, guild_id')
    .eq('boss_id', data.id)
    .order('damage_dealt', { ascending: false })
    .limit(10);
  return { ...data, top_contributors: contribs || [] };
}

async function attackBoss(playerId, cardId) {
  const { data: boss } = await supabase
    .from('boss_fights')
    .select('*')
    .eq('is_active', true)
    .single();
  if (!boss) return { success: false, error: 'No active boss' };
  if (boss.current_hp <= 0)
    return { success: false, error: 'Boss already defeated' };
  const canSpend = await spendMana(playerId, 1);
  if (!canSpend) return { success: false, error: 'Not enough mana' };
  const { data: nine } = await supabase
    .from('player_nines')
    .select('base_atk, base_def, base_luck')
    .eq('player_id', playerId)
    .single();
  let atk = nine?.base_atk || 5,
    luck = nine?.base_luck || 3;
  if (cardId) {
    const { data: pc } = await supabase
      .from('player_cards')
      .select('spell_id, rarity, current_charges')
      .eq('id', cardId)
      .single();
    if (pc && pc.current_charges > 0) {
      const { data: spell } = await supabase
        .from('spells')
        .select('base_atk')
        .eq('id', pc.spell_id)
        .single();
      if (spell) atk += spell.base_atk || 0;
      const rb = { common: 0, uncommon: 1, rare: 1, epic: 2, legendary: 3 };
      atk += rb[pc.rarity] || 0;
      const nc = pc.current_charges - 1;
      await supabase
        .from('player_cards')
        .update({ current_charges: nc, is_exhausted: nc <= 0 })
        .eq('id', cardId);
    }
  }
  let damage = atk;
  const isCrit = Math.random() * 100 < luck;
  if (isCrit) damage = Math.floor(damage * 1.5);
  const bossAtk = Math.floor(boss.total_hp / 100);
  const bossHit = Math.max(
    1,
    bossAtk * (boss.phase === 3 ? 2 : boss.phase === 2 ? 1.5 : 1) -
      (nine?.base_def || 2),
  );
  const newBossHp = Math.max(0, boss.current_hp - damage);
  const newPhase =
    newBossHp > boss.total_hp * 0.5
      ? 1
      : newBossHp > boss.total_hp * 0.25
        ? 2
        : 3;
  await supabase
    .from('boss_fights')
    .update({ current_hp: newBossHp, phase: newPhase })
    .eq('id', boss.id);
  const { data: player } = await supabase
    .from('players')
    .select('guild_id')
    .eq('id', playerId)
    .single();
  const { data: existing } = await supabase
    .from('boss_contributions')
    .select('id, damage_dealt')
    .eq('boss_id', boss.id)
    .eq('player_id', playerId)
    .single();
  if (existing) {
    await supabase
      .from('boss_contributions')
      .update({
        damage_dealt: existing.damage_dealt + damage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('boss_contributions').insert({
      boss_id: boss.id,
      player_id: playerId,
      guild_id: player?.guild_id || null,
      damage_dealt: damage,
      cycles_survived: 1,
    });
  }
  if (newBossHp <= 0) {
    await supabase
      .from('boss_fights')
      .update({ is_active: false })
      .eq('id', boss.id);
  }
  return {
    success: true,
    damage_dealt: damage,
    crit: isCrit,
    boss_damage_to_you: bossHit,
    boss_hp: newBossHp,
    boss_total_hp: boss.total_hp,
    phase: newPhase,
    defeated: newBossHp <= 0,
  };
}

async function getContributions(bossId) {
  const { data } = await supabase
    .from('boss_contributions')
    .select('player_id, damage_dealt, guild_id, cycles_survived')
    .eq('boss_id', bossId)
    .order('damage_dealt', { ascending: false });
  return data || [];
}

module.exports = {
  spawnBoss,
  getActiveBoss,
  attackBoss,
  getContributions,
  getBossStatus: getActiveBoss,
  deployToBoss: attackBoss,
  swapCard: attackBoss,
  getPlayerContribution: async (pid) => {
    const boss = await getActiveBoss();
    if (!boss) return { damage_dealt: 0 };
    const c = (boss.top_contributors || []).find((x) => x.player_id === pid);
    return c || { damage_dealt: 0 };
  },
};
