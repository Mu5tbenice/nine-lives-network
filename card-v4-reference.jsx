import { useState, useRef, useEffect, useCallback } from "react";

const HOUSES = {
  smoulders:   { name: "Smoulders",   color: "#E03C31" },
  darktide:    { name: "Darktide",    color: "#00B4D8" },
  stonebark:   { name: "Stonebark",   color: "#5CB338" },
  ashenvale:   { name: "Ashenvale",   color: "#90E0EF" },
  stormrage:   { name: "Stormrage",   color: "#FFC800" },
  nighthollow: { name: "Nighthollow", color: "#7B2D8E" },
  dawnbringer: { name: "Dawnbringer", color: "#FF8C00" },
  manastorm:   { name: "Manastorm",   color: "#5B8FE0" },
  plaguemire:  { name: "Plaguemire",  color: "#E84393" },
  universal:   { name: "Universal",   color: "#D4A64B" },
};

const STAT = {
  atk:  { label: "ATK",  color: "#e85a6a" },
  hp:   { label: "HP",   color: "#6acd8a" },
  spd:  { label: "SPD",  color: "#6ac8d8" },
  def:  { label: "DEF",  color: "#b088e8" },
  luck: { label: "LCK",  color: "#D4A64B" },
};

const RARITY = {
  common:    { label: "Common",    color: "#bbb",    bg: "rgba(180,180,180,0.08)", border: "rgba(180,180,180,0.2)",  foil: 0,   pMult: 0,   shimmer: false },
  uncommon:  { label: "Uncommon",  color: "#66dd66", bg: "rgba(80,200,80,0.1)",    border: "rgba(80,200,80,0.25)",   foil: 0.3, pMult: 0.4, shimmer: false },
  rare:      { label: "Rare",      color: "#55bbff", bg: "rgba(0,150,255,0.1)",    border: "rgba(0,150,255,0.25)",   foil: 0.55, pMult: 0.7, shimmer: false },
  epic:      { label: "Epic",      color: "#bb88ff", bg: "rgba(160,80,240,0.12)",  border: "rgba(160,80,240,0.3)",   foil: 0.8, pMult: 1,   shimmer: false },
  legendary: { label: "Legendary", color: "#ffd700", bg: "rgba(255,200,0,0.12)",   border: "rgba(255,200,0,0.3)",    foil: 1,   pMult: 1.5, shimmer: true },
};

const EFFECTS = {
  BURN:    { color: "#ffaa55", desc: "Extra damage over time each cycle" },
  CHAIN:   { color: "#ffaa00", desc: "Attack hits 2 targets instead of 1" },
  CRIT:    { color: "#ffdd44", desc: "25% chance to deal double ATK" },
  SURGE:   { color: "#ff8800", desc: "+50% ATK boost but costs +1 extra mana" },
  PIERCE:  { color: "#ff7b6b", desc: "Ignore enemy shields and WARD" },
  HEAL:    { color: "#44cc88", desc: "Restore HP to self or lowest-HP ally" },
  WARD:    { color: "#D4A64B", desc: "Absorb next hit, blocks one attack" },
  ANCHOR:  { color: "#ccaa66", desc: "Cannot be knocked below 1 HP this cycle" },
  THORNS:  { color: "#5CB338", desc: "Attackers take 3 damage back" },
  DRAIN:   { color: "#bb88ff", desc: "Steal HP from target" },
  SIPHON:  { color: "#8844cc", desc: "Steal HP from ALL enemies on zone" },
  WEAKEN:  { color: "#cc6688", desc: "Target deals 50% damage this cycle" },
  HEX:     { color: "#bb88ff", desc: "Target loses 2 ATK this cycle" },
  SILENCE: { color: "#bb88dd", desc: "Target card effect does not activate" },
  HASTE:   { color: "#88ffaa", desc: "+3 SPD this cycle (act first)" },
  SWIFT:   { color: "#aaffcc", desc: "If first card of the day: effect doubled" },
  DODGE:   { color: "#88ddaa", desc: "30% chance to avoid all damage" },
  FREE:    { color: "#ccffdd", desc: "Card costs 0 mana this cast" },
  POISON:  { color: "#aaee55", desc: "Damage per cycle, stacks, ignores DEF" },
  CORRODE: { color: "#aacc00", desc: "All enemies lose 1 max HP until midnight" },
  INFECT:  { color: "#66cc00", desc: "If target KO'd, POISON spreads" },
  AMPLIFY: { color: "#ffcc44", desc: "Next friendly effect is 50% stronger" },
  INSPIRE: { color: "#ffaa88", desc: "Allies get +1 ATK next cycle" },
  BLESS:   { color: "#ffffaa", desc: "Allies heal +2 HP per cycle" },
};

const TYPE_SHORT = {
  manipulation: "Manip.",
  attack: "Attack",
  defend: "Defend",
  support: "Support",
  utility: "Utility",
};

const CARDS = [
  { name: "Oblivion",        house: "nighthollow", type: "manipulation", atk: 5, hp: 2, spd: 3, def: 0, luck: 3, cost: 3, effects: ["SILENCE","DRAIN","HEX"],    rarity: "legendary", charges: 30, flavor: "They cast their finest spell. Nothing happened." },
  { name: "Maelstrom",       house: "darktide",    type: "attack",       atk: 5, hp: 3, spd: 2, def: 1, luck: 2, cost: 3, effects: ["DRAIN","SIPHON"],            rarity: "legendary", charges: 30, flavor: "We have evidence this zone possesses forbidden magic." },
  { name: "Thunderclap",     house: "stormrage",   type: "attack",       atk: 6, hp: 1, spd: 2, def: 0, luck: 1, cost: 2, effects: ["CRIT","CHAIN"],              rarity: "epic",      charges: 18, flavor: "Count to three. One..." },
  { name: "Spore Shield",    house: "plaguemire",  type: "defend",       atk: 1, hp: 4, spd: 0, def: 3, luck: 2, cost: 2, effects: ["THORNS","HEAL"],             rarity: "epic",      charges: 18, flavor: "Breathe it in. We insist." },
  { name: "Phoenix Veil",    house: "dawnbringer", type: "support",      atk: 2, hp: 4, spd: 2, def: 1, luck: 1, cost: 2, effects: ["HEAL","WARD"],               rarity: "rare",      charges: 12, flavor: "Even time bends for the righteous." },
  { name: "Earthshatter",    house: "stonebark",   type: "attack",       atk: 6, hp: 3, spd: 1, def: 2, luck: 1, cost: 3, effects: ["BURN","PIERCE"],             rarity: "rare",      charges: 12, flavor: "The quiet ones. Always the quiet ones." },
  { name: "Vanishing Gale",  house: "ashenvale",   type: "utility",      atk: 0, hp: 2, spd: 4, def: 0, luck: 4, cost: 2, effects: ["DODGE","HASTE"],             rarity: "uncommon",  charges: 8,  flavor: "One paw print. No witnesses." },
  { name: "Counterspell",    house: "manastorm",   type: "manipulation", atk: 2, hp: 2, spd: 3, def: 1, luck: 2, cost: 2, effects: ["SILENCE","WEAKEN"],          rarity: "uncommon",  charges: 8,  flavor: "Fascinating. Denied." },
  { name: "Ember Strike",    house: "smoulders",   type: "attack",       atk: 5, hp: 2, spd: 0, def: 0, luck: 0, cost: 1, effects: ["BURN"],                      rarity: "rare",      charges: 12, flavor: "Everything is fine. The flames are a feature." },
  { name: "Basic Attack",    house: "universal",   type: "attack",       atk: 3, hp: 2, spd: 0, def: 0, luck: 0, cost: 1, effects: [],                             rarity: "common",    charges: 5,  flavor: "Simple. Effective. Forgettable." },
];

/* ─── CSS Particles (lightweight, no canvas) ─── */
function CSSParticles({ houseColor, count }) {
  if (count <= 0) return null;
  const dots = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 4;
    const dur = 3 + Math.random() * 3;
    const size = 2 + Math.random() * 3;
    return (
      <div key={i} style={{
        position: "absolute",
        bottom: -10,
        left: left + "%",
        width: size,
        height: size,
        borderRadius: "50%",
        background: houseColor,
        opacity: 0,
        animation: `particleFloat ${dur}s ${delay}s infinite ease-out`,
        pointerEvents: "none",
      }} />
    );
  });
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 6, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
      {dots}
    </div>
  );
}

/* ─── Foil overlay ─── */
function Foil({ angle, intensity }) {
  if (intensity <= 0) return null;
  return (
    <React.Fragment>
      <div style={{
        position: "absolute", inset: 0, zIndex: 3, borderRadius: "inherit", pointerEvents: "none",
        background: `linear-gradient(${angle}deg, transparent 0%, rgba(255,255,255,0) 20%, rgba(255,255,255,${intensity * 0.2}) 40%, rgba(255,230,180,${intensity * 0.14}) 50%, rgba(255,255,255,${intensity * 0.2}) 60%, rgba(255,255,255,0) 80%, transparent 100%)`,
        mixBlendMode: "overlay",
      }} />
      <div style={{
        position: "absolute", inset: 0, zIndex: 4, borderRadius: "inherit", pointerEvents: "none",
        background: `linear-gradient(${angle}deg, transparent 10%, rgba(255,50,50,${intensity * 0.07}) 22%, rgba(255,165,0,${intensity * 0.07}) 30%, rgba(255,255,0,${intensity * 0.07}) 38%, rgba(0,255,120,${intensity * 0.07}) 46%, rgba(0,180,255,${intensity * 0.07}) 54%, rgba(128,0,255,${intensity * 0.07}) 62%, rgba(255,0,180,${intensity * 0.07}) 70%, transparent 85%)`,
        mixBlendMode: "screen",
      }} />
    </React.Fragment>
  );
}

/* ─── FIX 1: Stat row with size-aware scaling ─── */
function StatRow({ card, size }) {
  const stats = [
    { key: "atk", val: card.atk },
    { key: "hp", val: card.hp },
    { key: "spd", val: card.spd },
    { key: "def", val: card.def },
    { key: "luck", val: card.luck },
  ].filter(s => s.val > 0);

  const cfg = {
    normal: { valFs: 15, lblFs: 6, divH: 22, pad: 7 },
    mini:   { valFs: 11, lblFs: 5, divH: 14, pad: 4 },
    tiny:   { valFs: 8,  lblFs: 4, divH: 10, pad: 2 },
    zoom:   { valFs: 22, lblFs: 8, divH: 28, pad: 10 },
  }[size] || { valFs: 15, lblFs: 6, divH: 22, pad: 7 };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
      {stats.map(({ key, val }, i) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 1 }}>
          {i > 0 && <div style={{ width: 1, height: cfg.divH, background: "rgba(255,255,255,0.06)" }} />}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: `0 ${cfg.pad}px` }}>
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: cfg.valFs,
              color: STAT[key].color, fontWeight: 700, lineHeight: 1,
              textShadow: `0 0 10px ${STAT[key].color}40`,
            }}>{val}</div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: cfg.lblFs,
              color: STAT[key].color + "70", letterSpacing: 0.5, lineHeight: 1, marginTop: 1,
            }}>{STAT[key].label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── FIX 3: Tooltip flips below when near top of viewport ─── */
function EffectPill({ effect, size }) {
  const base = effect.replace(/\s*[+x]\d+%?/g, "").trim();
  const meta = EFFECTS[base] || { color: "#aaa", desc: "Unknown effect" };
  const [show, setShow] = useState(false);
  const pillRef = useRef(null);
  const [tipBelow, setTipBelow] = useState(false);

  const pillFs = size === "tiny" ? 6 : size === "mini" ? 7 : size === "zoom" ? 11 : 9;
  const pillPad = size === "tiny" ? "2px 5px" : size === "mini" ? "3px 6px" : size === "zoom" ? "5px 12px" : "5px 10px";

  const handleEnter = () => {
    setShow(true);
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setTipBelow(rect.top < 120);
    }
  };

  return (
    <div ref={pillRef} style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      <span style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: pillFs, color: meta.color,
        background: meta.color + "18", border: `1px solid ${meta.color}35`,
        padding: pillPad, borderRadius: 4, whiteSpace: "nowrap", lineHeight: 1,
        cursor: "default", display: "inline-block", transition: "transform 0.15s",
        transform: show ? "translateY(-1px)" : "none",
      }}>{effect}</span>
      {show && (
        <div style={{
          position: "absolute",
          ...(tipBelow ? { top: "calc(100% + 8px)" } : { bottom: "calc(100% + 8px)" }),
          left: "50%", transform: "translateX(-50%)",
          whiteSpace: "normal", fontFamily: "'Crimson Text', serif", fontSize: 13,
          color: "#e8e4d9", background: "rgba(10,8,18,0.97)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5,
          padding: "6px 12px", zIndex: 999, pointerEvents: "none",
          boxShadow: "0 6px 20px rgba(0,0,0,0.6)", lineHeight: 1.3,
          maxWidth: 220, minWidth: 140,
        }}>
          <span style={{ color: meta.color, fontWeight: 700, fontFamily: "'Press Start 2P', monospace", fontSize: 8 }}>{base}</span>
          <span style={{ color: "rgba(255,255,255,0.5)", margin: "0 6px" }}> - </span>
          <span>{meta.desc}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Durability bar ─── */
function Dur({ current, max, rarity, size }) {
  const rc = RARITY[rarity];
  const c = rc ? rc.color : "#888";
  const tw = size === "tiny" ? 40 : 60;
  const tf = size === "tiny" ? 5 : 6;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: tw, height: 3, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: ((current / max) * 100) + "%", height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${c}, ${c}88)` }} />
      </div>
      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: tf, color: "rgba(255,255,255,0.22)", lineHeight: 1 }}>{current}/{max}</span>
    </div>
  );
}

/* ─── FIX 4: Mana with proper vertical alignment ─── */
function Mana({ cost, size }) {
  const fs = size === "tiny" ? 8 : size === "mini" ? 9 : size === "zoom" ? 14 : 11;
  return (
    <div style={{
      fontFamily: "'Press Start 2P', monospace", fontSize: fs, fontWeight: 700,
      letterSpacing: 1, color: "#5bc0ff", background: "rgba(0,0,0,0.75)",
      border: "1px solid rgba(91,192,255,0.3)", borderRadius: 4,
      padding: "3px 8px", lineHeight: 1, flexShrink: 0,
      textShadow: "0 0 8px rgba(91,192,255,0.5)", whiteSpace: "nowrap",
      display: "flex", alignItems: "center", gap: 3,
    }}>
      <span style={{ fontSize: fs - 1, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>
        {"💧"}
      </span>
      <span style={{ lineHeight: 1 }}>{cost}</span>
    </div>
  );
}

/* ─── FIX 6: Auto-scaling card name ─── */
function CardName({ name, baseFontSize }) {
  const ref = useRef(null);
  const [fs, setFs] = useState(baseFontSize);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = baseFontSize;
    el.style.fontSize = size + "px";
    let safety = 0;
    while (el.scrollWidth > el.clientWidth && size > 7 && safety < 20) {
      size -= 0.5;
      el.style.fontSize = size + "px";
      safety++;
    }
    setFs(size);
  }, [name, baseFontSize]);

  return (
    <div ref={ref} style={{
      flex: 1, minWidth: 0, fontFamily: "'Cinzel', serif", fontWeight: 700,
      fontSize: fs, lineHeight: 1.15, color: "#D4A64B",
      whiteSpace: "nowrap", overflow: "hidden",
      textShadow: "-1px -1px 0 rgba(0,0,0,0.95), 1px -1px 0 rgba(0,0,0,0.95), -1px 1px 0 rgba(0,0,0,0.95), 1px 1px 0 rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)",
    }}>
      {name}
    </div>
  );
}

/* ═══════════════════════════════════════════
   THE CARD
   ═══════════════════════════════════════════ */
function SpellCard({ card, onClick, size }) {
  const house = HOUSES[card.house];
  const rarity = RARITY[card.rarity];
  const [hov, setHov] = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const ref = useRef(null);

  const handleMove = useCallback((e) => {
    const r = ref.current ? ref.current.getBoundingClientRect() : null;
    if (!r) return;
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }, []);

  const foilAngle = 135 + (mouse.x - 0.5) * 60 + (mouse.y - 0.5) * 40;
  const foilStr = hov ? rarity.foil : (rarity.shimmer ? rarity.foil * 0.25 : 0);
  const pCount = Math.round((rarity.pMult > 0 ? 12 : 0) * rarity.pMult);
  const hc = house.color;

  const dims = { normal: { w: 240, h: 380 }, mini: { w: 200, h: 316 }, tiny: { w: 160, h: 252 }, zoom: { w: 340, h: 530 } };
  const d = dims[size] || dims.normal;
  const W = d.w;
  const H = d.h;

  const nameFs = { normal: 15, mini: 12, tiny: 11, zoom: 20 }[size] || 15;
  const typeFs = { normal: 11, mini: 9, tiny: 8, zoom: 14 }[size] || 11;
  const rarityFs = { normal: 8, mini: 7, tiny: 6, zoom: 10 }[size] || 8;
  const flavorFs = { normal: 11, mini: 9, tiny: 0, zoom: 13 }[size] || 11;
  const footerFs = { normal: 4, mini: 4, tiny: 0, zoom: 5 }[size] || 4;

  // FIX 2 & 5: Abbreviate type on small sizes
  const typeLabel = (size === "tiny" || size === "mini")
    ? (TYPE_SHORT[card.type] || card.type)
    : (card.type.charAt(0).toUpperCase() + card.type.slice(1));

  const isTiny = size === "tiny";
  const padOuter = isTiny ? "6px 6px" : "8px 8px";
  const logoSize = isTiny ? 18 : 24;
  const logoFont = isTiny ? 9 : 12;

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={handleMove}
      style={{
        width: W, height: H, borderRadius: 12, position: "relative",
        cursor: "pointer", flexShrink: 0, overflow: "hidden",
        transition: "transform 0.25s, box-shadow 0.3s",
        transform: hov ? "translateY(-8px) scale(1.02)" : "none",
        boxShadow: hov
          ? `0 25px 60px rgba(0,0,0,0.5), 0 0 35px ${hc}15`
          : `0 6px 20px rgba(0,0,0,0.3)${rarity.shimmer ? `, 0 0 12px ${hc}20` : ""}`,
      }}
    >
      {/* Shimmer border */}
      <div style={{
        position: "absolute", inset: -2, borderRadius: 14, pointerEvents: "none", zIndex: 0,
        background: rarity.shimmer
          ? `conic-gradient(from ${foilAngle}deg, transparent, ${hc}, #FFD700, ${hc}, transparent)`
          : `conic-gradient(from ${foilAngle}deg, transparent, ${hc} 8%, transparent 16%)`,
        opacity: hov ? Math.min(rarity.foil + 0.1, 0.8) : (rarity.shimmer ? 0.2 : 0),
        transition: "opacity 0.5s",
      }} />

      {/* Card face */}
      <div style={{
        position: "absolute", inset: 2, borderRadius: 10, overflow: "hidden", zIndex: 1,
        background: "linear-gradient(180deg, #12101a 0%, #0c0a14 50%, #0a0810 100%)",
        border: `1.5px solid ${hov ? hc + "40" : (rarity.shimmer ? hc + "20" : "rgba(255,255,255,0.08)")}`,
        transition: "border-color 0.3s",
      }} />

      {/* Art gradient */}
      <div style={{
        position: "absolute", top: 2, left: 2, right: 2, bottom: 2, zIndex: 2, borderRadius: 10,
        overflow: "hidden", pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 20%, ${hc}40, transparent 60%), linear-gradient(180deg, ${hc}25 0%, ${hc}08 40%, transparent 60%)`,
        maskImage: "linear-gradient(to bottom, black 35%, transparent 65%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 65%)",
      }} />

      {/* Inner edge glow */}
      <div style={{
        position: "absolute", inset: 2, borderRadius: 10, zIndex: 2, pointerEvents: "none",
        boxShadow: `inset 0 0 20px 2px ${hov ? hc + "12" : "rgba(255,255,255,0.03)"}`,
        transition: "box-shadow 0.3s",
      }} />

      <Foil angle={foilAngle} intensity={foilStr} />
      <CSSParticles houseColor={hc} count={pCount} />

      {/* Mouse follow glow */}
      {hov && rarity.foil > 0.3 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", borderRadius: 10,
          background: `radial-gradient(circle at ${mouse.x * 100}% ${mouse.y * 100}%, ${hc}1a, transparent 45%)`,
        }} />
      )}

      {/* ─── BODY ─── */}
      <div style={{ position: "relative", zIndex: 8, display: "flex", flexDirection: "column", height: H }}>

        {/* TOP ROW: Logo + Name + Mana */}
        <div style={{
          display: "flex", alignItems: "center", gap: isTiny ? 4 : 6,
          padding: padOuter,
          background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
        }}>
          <div style={{
            width: logoSize, height: logoSize, borderRadius: 4, flexShrink: 0,
            background: hc + "30", border: `1px solid ${hc}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Cinzel', serif", fontSize: logoFont, fontWeight: 800,
            color: hc, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))",
          }}>{house.name[0]}</div>
          <CardName name={card.name} baseFontSize={nameFs} />
          <Mana cost={card.cost} size={size} />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ padding: "0 8px", marginBottom: isTiny ? 3 : 5 }}>
          <StatRow card={card} size={size} />
        </div>

        {/* Thin rule */}
        <div style={{
          margin: isTiny ? "0 8px" : "0 14px", height: 1,
          background: `linear-gradient(90deg, transparent, ${hc}25, transparent)`,
        }} />

        {/* INFO SECTION */}
        <div style={{
          padding: isTiny ? "3px 6px 0" : "5px 10px 0",
          display: "flex", flexDirection: "column",
          gap: isTiny ? 2 : 4, overflow: "hidden",
        }}>

          {/* Type + Rarity row */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
            <span style={{
              fontFamily: "'Cinzel', serif", fontSize: typeFs, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: isTiny ? 0.5 : 1,
              color: "#D4A64B", opacity: 0.7,
              whiteSpace: "nowrap", flexShrink: 1, minWidth: 0,
              overflow: "hidden", textOverflow: "ellipsis",
            }}>{typeLabel}</span>
            <div style={{ flex: 1, minWidth: 4 }} />
            <span style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: rarityFs,
              padding: isTiny ? "2px 5px" : "3px 8px", borderRadius: 3,
              letterSpacing: 0.5, whiteSpace: "nowrap", cursor: "default", flexShrink: 0,
              background: rarity.bg, border: `1px solid ${rarity.border}`, color: rarity.color,
              boxShadow: rarity.shimmer ? "0 0 6px rgba(255,200,0,0.15)" : "none",
            }}>{rarity.label}</span>
          </div>

          {/* Effect pills */}
          {card.effects.length > 0 && (
            <div style={{ display: "flex", gap: isTiny ? 3 : 5, flexWrap: "wrap" }}>
              {card.effects.map((e, i) => (
                <EffectPill key={i} effect={e} size={size} />
              ))}
            </div>
          )}

          {/* Durability */}
          <Dur current={card.charges} max={card.charges} rarity={card.rarity} size={size} />

          {/* Flavor (hidden on tiny) */}
          {flavorFs > 0 && (
            <div style={{
              fontFamily: "'Crimson Text', serif", fontStyle: "italic", fontSize: flavorFs,
              color: "rgba(255,255,255,0.25)", lineHeight: 1.3, overflow: "hidden",
              textOverflow: "ellipsis", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {'"' + card.flavor + '"'}
            </div>
          )}

          {/* Footer (hidden on tiny) */}
          {footerFs > 0 && (
            <div style={{
              paddingTop: 3, borderTop: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center", fontFamily: "'Press Start 2P', monospace",
              fontSize: footerFs, letterSpacing: 2, color: "rgba(255,255,255,0.08)",
            }}>
              {house.name.toUpperCase()} {" \u00B7 "} NETHARA
            </div>
          )}
        </div>

        <div style={{ height: isTiny ? 2 : 4 }} />
      </div>
    </div>
  );
}

/* ═══ APP ═══ */
const SIZES = [
  { key: "normal", label: "Normal 240x380" },
  { key: "mini", label: "Mini 200x316" },
  { key: "tiny", label: "Tiny 160x252" },
];

export default function App() {
  const [zoomed, setZoomed] = useState(null);
  const [sizeKey, setSizeKey] = useState("normal");
  const gridMin = { normal: 250, mini: 210, tiny: 170 }[sizeKey] || 250;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #1a1528 0%, #0e0c18 50%, #1a1528 100%)",
      fontFamily: "'Crimson Text', serif",
      color: "#e8e0d0",
    }}>
      <div style={{ textAlign: "center", padding: "20px 16px 10px" }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 800,
          color: "#D4A64B", letterSpacing: 3,
          textShadow: "0 0 20px rgba(212,166,75,0.3)", marginBottom: 4,
        }}>CARD V4.2 REFERENCE</h1>
        <p style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 7,
          color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 8,
        }}>
          FIXES: TINY STATS + TYPE OVERLAP + TOOLTIP + MANA + NAME SCALING
        </p>
        <p style={{
          fontFamily: "'Crimson Text', serif", fontSize: 13,
          color: "rgba(255,255,255,0.35)", maxWidth: 500, margin: "0 auto 12px",
        }}>
          Hover cards for foil. Hover pills for tooltips. Click to zoom. Toggle sizes below.
        </p>

        {/* Size toggle */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {SIZES.map((s) => (
            <button key={s.key} onClick={() => setSizeKey(s.key)} style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              padding: "6px 14px", borderRadius: 6, border: "1px solid",
              cursor: "pointer", transition: "all 0.2s",
              background: sizeKey === s.key ? "rgba(212,166,75,0.15)" : "rgba(255,255,255,0.03)",
              borderColor: sizeKey === s.key ? "rgba(212,166,75,0.4)" : "rgba(255,255,255,0.1)",
              color: sizeKey === s.key ? "#D4A64B" : "rgba(255,255,255,0.4)",
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div style={{ padding: "0 16px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${gridMin}px, 1fr))`,
          gap: 20, justifyItems: "center", maxWidth: 1000, margin: "0 auto",
        }}>
          {CARDS.map((c, i) => (
            <SpellCard key={sizeKey + "-" + i} card={c} size={sizeKey} onClick={() => setZoomed(c)} />
          ))}
        </div>
      </div>

      {/* Zoom overlay */}
      {zoomed && (
        <div onClick={() => setZoomed(null)} style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ cursor: "default", animation: "zoomIn 0.25s ease-out" }}>
            <SpellCard card={zoomed} size="zoom" onClick={() => {}} />
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Press+Start+2P&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #1a1528; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(212,166,75,0.15); border-radius: 2px; }
        @keyframes zoomIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes particleFloat {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-300px) translateX(20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
