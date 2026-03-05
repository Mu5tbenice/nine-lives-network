const express = require("express");
const router = express.Router();
const supabase = require('../config/supabase');

router.get("/daily/:playerId", async (req, res) => {
  const { playerId } = req.params;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const quests = [];

  try {
    const { data } = await supabase.from("player_packs").select("id").eq("player_id", playerId).gte("created_at", todayStart.toISOString()).limit(1);
    quests.push({ id:"open_pack", quest_name:"Open Your Daily Pack", quest_desc:"Open your free daily pack from the Packs page", icon:"📦", complete:!!(data&&data.length>0) });
  } catch(e) {
    quests.push({ id:"open_pack", quest_name:"Open Your Daily Pack", quest_desc:"Open your free daily pack", icon:"📦", complete:false });
  }

  try {
    const { data } = await supabase.from("zone_deployments").select("id").eq("player_id", playerId).gte("created_at", todayStart.toISOString()).limit(1);
    quests.push({ id:"deploy_zone", quest_name:"Deploy to a Zone", quest_desc:"Send your Nine into battle in any zone", icon:"🗡️", complete:!!(data&&data.length>0) });
  } catch(e) {
    quests.push({ id:"deploy_zone", quest_name:"Deploy to a Zone", quest_desc:"Send your Nine into battle", icon:"🗡️", complete:false });
  }

  try {
    const fifteenMinsAgo = new Date(Date.now() - 15*60*1000).toISOString();
    const { data } = await supabase.from("zone_deployments").select("id").eq("player_id", playerId).eq("is_active", true).lte("created_at", fifteenMinsAgo).limit(1);
    quests.push({ id:"survive_snapshot", quest_name:"Survive a Snapshot", quest_desc:"Stay deployed in a zone through a full 15-minute snapshot", icon:"⏱️", complete:!!(data&&data.length>0) });
  } catch(e) {
    quests.push({ id:"survive_snapshot", quest_name:"Survive a Snapshot", quest_desc:"Stay deployed for 15+ minutes", icon:"⏱️", complete:false });
  }

  res.json({ quests });
});

module.exports = router;
