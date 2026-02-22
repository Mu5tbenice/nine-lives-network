/**
 * SPRITE RENDERER — Nine Lives Network
 * Core engine for drawing 24×24 pixel Nine sprites
 * Used by: sprite-lab.html, zone battle page, profile, anywhere a Nine appears
 * 
 * Usage:
 *   const canvas = document.createElement('canvas');
 *   canvas.width = 24; canvas.height = 24;
 *   NineSprite.draw(canvas.getContext('2d'), spriteConfig);
 *   // Scale up with CSS: canvas.style.width = '72px'; canvas.style.imageRendering = 'pixelated';
 */

window.NineSprite = (function() {

  // ═══ HOUSE COLORS (ear/eye glow) ═══
  const HOUSE_COLORS = {
    smoulders:   '#E03C31',
    darktide:    '#00B4D8',
    stonebark:   '#5CB338',
    ashenvale:   '#B0C4DE',
    stormrage:   '#FFC800',
    nighthollow: '#7B2D8E',
    dawnbringer: '#FF8C00',
    manastorm:   '#5B8FE0',
    plaguemire:  '#E84393',
  };

  // ═══ DEFAULT PALETTES ═══
  const PALETTES = {
    hat:  ['#D4A64B','#CC3333','#2266AA','#44AA44','#9944CC','#FF8800','#DDDDDD','#884422','#AA2266','#3388BB','#FFCC00','#556677','#BB4444','#22AA88','#885599','#DD6622'],
    robe: ['#8B1A1A','#1a3a5a','#2a4a1a','#4a3055','#5a4a1a','#5a3a0a','#1a2a4a','#4a1a3a','#3a4a5a','#553322','#224455','#443355','#335533','#552233','#445533','#334466'],
    fur:  ['#3a3a4a','#5a4a3a','#4a3a2a','#2a2a3a','#5a5a5a','#6a5a4a','#3a4a3a','#4a4050','#3a3050','#504030','#605040','#3a3a3a','#554433','#443322','#4a4a4a','#2a3a4a'],
    eyes: ['#E03C31','#00B4D8','#5CB338','#FFC800','#7B2D8E','#FF8C00','#5B8FE0','#E84393','#B0C4DE','#FFFFFF','#FFD700','#44FFAA','#FF4488','#88CCFF','#DDAA44','#BB88FF'],
    weapon: ['#FF6B35','#00E5FF','#88DD44','#E0F0FF','#FFE844','#CC66FF','#FFB844','#88BBFF','#FF66AA','#D4A64B','#FFFFFF','#FF4444','#44FF44','#4444FF','#FFAA00','#FF44FF'],
    accessory: ['#D4A64B','#CC3333','#2266AA','#44AA44','#DDDDDD','#FF8800','#9944CC','#884422','#FF66AA','#FFCC00','#88CCFF','#44FFAA','#FF4488','#AAAAAA','#445566','#BB8844'],
  };

  // ═══ DEFAULT CONFIG ═══
  function defaultConfig(house) {
    const ec = HOUSE_COLORS[house] || '#FFC800';
    return {
      fur:        { color: '#3a3a4a', style: 'solid' },
      hat:        { color: '#D4A64B', style: 'pointed' },
      eyes:       { color: ec,        style: 'default' },
      robe:       { color: '#1a3a5a', style: 'basic' },
      weapon:     { color: '#FF6B35', style: 'staff' },
      accessory:  { color: '#D4A64B', style: 'none' },
      background: { color: 'transparent', style: 'none' },
      expression: { color: '#2a2a3a', style: 'neutral' },
    };
  }

  // ═══ GENERATE CONFIG FROM API DATA ═══
  function fromAPI(data) {
    // data = { house, hat_color, robe_color, sprite_config (JSONB), equipped_card_house }
    if (data.sprite_config && Object.keys(data.sprite_config).length > 0) {
      return data.sprite_config; // full config from DB
    }
    // Fallback: build from simple fields
    const cfg = defaultConfig(data.house);
    if (data.hat_color) cfg.hat.color = data.hat_color;
    if (data.robe_color) cfg.robe.color = data.robe_color;
    if (data.equipped_card_house) {
      const spellColors = {
        smoulders:'#FF6B35', darktide:'#00E5FF', stonebark:'#88DD44', ashenvale:'#E0F0FF',
        stormrage:'#FFE844', nighthollow:'#CC66FF', dawnbringer:'#FFB844', manastorm:'#88BBFF',
        plaguemire:'#FF66AA', universal:'#D4A64B',
      };
      cfg.weapon.color = spellColors[data.equipped_card_house] || '#D4A64B';
    }
    return cfg;
  }

  // ═══ SEEDED RANDOM (for consistent random appearance from player ID) ═══
  function seededRng(seed) {
    let s = seed;
    return function() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function randomConfig(house, seed) {
    const r = seededRng(seed);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const ec = HOUSE_COLORS[house] || '#FFC800';
    return {
      fur:        { color: pick(PALETTES.fur),    style: pick(['solid','tabby','spotted','tuxedo']) },
      hat:        { color: pick(PALETTES.hat),     style: pick(['pointed','wide','crown','hood']) },
      eyes:       { color: ec,                     style: pick(['default','angry','glowing','slit']) },
      robe:       { color: pick(PALETTES.robe),    style: pick(['basic','long','cape','tattered']) },
      weapon:     { color: pick(PALETTES.weapon),  style: pick(['staff','sword','wand','dagger']) },
      accessory:  { color: pick(PALETTES.accessory), style: pick(['none','none','scarf','amulet','belt_pouch']) },
      background: { color: 'transparent',          style: 'none' },
      expression: { color: '#2a2a3a',              style: pick(['neutral','grin','smirk','fangs']) },
    };
  }

  // ═══ MAIN DRAW FUNCTION ═══
  function draw(ctx, config, flip) {
    const S = 24;
    ctx.clearRect(0, 0, S, S);
    ctx.imageSmoothingEnabled = false;

    const f = (x, y, c) => {
      if (!c || c === 'transparent' || x < 0 || x >= S || y < 0 || y >= S) return;
      ctx.fillStyle = c;
      ctx.fillRect(flip ? S - 1 - x : x, y, 1, 1);
    };

    const fur  = config.fur  || {}; const hat  = config.hat  || {};
    const eyes = config.eyes || {}; const robe = config.robe || {};
    const wpn  = config.weapon || {}; const acc = config.accessory || {};
    const bg   = config.background || {}; const expr = config.expression || {};

    const FC = fur.color  || '#3a3a4a';
    const HC = hat.color  || '#D4A64B';
    const EC = eyes.color || '#FFC800';
    const RC = robe.color || '#1a3a5a';
    const WC = wpn.color  || '#FF6B35';
    const AC = acc.color  || '#D4A64B';
    const BC = bg.color   || 'transparent';
    const MC = expr.color || '#2a2a3a';

    // ── BACKGROUND ──
    if (bg.style === 'glow' && BC !== 'transparent') {
      for (let y = 2; y <= 20; y++) for (let x = 3; x <= 20; x++) { if (Math.random() < 0.12) f(x, y, BC + '22'); }
    }
    if (bg.style === 'aura' && BC !== 'transparent') {
      for (let i = 0; i < 10; i++) { f(3 + Math.floor(Math.random() * 18), 2 + Math.floor(Math.random() * 18), BC + '33'); }
    }
    if (bg.style === 'ring' && BC !== 'transparent') {
      for (let a = 0; a < 360; a += 18) {
        f(Math.round(11.5 + Math.cos(a * Math.PI / 180) * 10), Math.round(11 + Math.sin(a * Math.PI / 180) * 10), BC + '44');
      }
    }

    // ── HAT ──
    if (hat.style !== 'none') {
      if (hat.style === 'wide') {
        for (let x = 2; x <= 21; x++) f(x, 4, HC); for (let x = 3; x <= 20; x++) f(x, 3, HC);
        for (let x = 6; x <= 17; x++) f(x, 2, HC); for (let x = 8; x <= 15; x++) f(x, 1, HC);
        for (let x = 6; x <= 17; x++) f(x, 3, EC + '55');
      } else if (hat.style === 'crown') {
        for (let x = 6; x <= 17; x++) f(x, 4, HC); for (let x = 7; x <= 16; x++) f(x, 3, HC);
        for (let x = 8; x <= 15; x++) f(x, 2, HC);
        f(8,1,HC);f(9,1,HC);f(11,0,HC);f(12,0,HC);f(14,1,HC);f(15,1,HC);f(10,1,HC);f(13,1,HC);
        for (let x = 7; x <= 16; x++) f(x, 4, EC + '66');
      } else if (hat.style === 'hood') {
        for (let x = 5; x <= 18; x++) { f(x, 4, HC); f(x, 3, HC); }
        for (let x = 6; x <= 17; x++) f(x, 2, HC); for (let x = 7; x <= 16; x++) f(x, 1, HC);
        f(5,5,HC);f(5,6,HC);f(18,5,HC);f(18,6,HC);
      } else { // pointed
        for (let x = 4; x <= 19; x++) f(x, 4, HC); for (let x = 5; x <= 18; x++) f(x, 3, HC);
        for (let x = 7; x <= 16; x++) f(x, 2, HC); for (let x = 8; x <= 15; x++) f(x, 1, HC);
        for (let x = 9; x <= 14; x++) f(x, 0, HC); f(11, 0, HC); f(12, 0, HC);
        for (let x = 7; x <= 16; x++) f(x, 3, EC + '66');
      }
    }

    // ── EARS ──
    f(6,2,EC);f(7,2,EC);f(6,3,EC);f(16,2,EC);f(17,2,EC);f(17,3,EC);

    // ── HEAD ──
    for (let y = 5; y <= 9; y++) for (let x = 6; x <= 17; x++) f(x, y, FC);
    for (let y = 6; y <= 8; y++) for (let x = 8; x <= 15; x++) f(x, y, FC + 'dd');
    // Fur patterns
    if (fur.style === 'tabby') { for (let y = 5; y <= 9; y++) { if (y % 2 === 0) { f(7,y,FC+'88');f(10,y,FC+'88');f(13,y,FC+'88');f(16,y,FC+'88'); } } }
    if (fur.style === 'spotted') { f(7,6,FC+'77');f(10,7,FC+'77');f(15,6,FC+'77');f(12,8,FC+'77'); }
    if (fur.style === 'tuxedo') { for (let y = 6; y <= 9; y++) for (let x = 10; x <= 13; x++) f(x, y, '#eeeeee55'); }

    // ── EYES ──
    if (eyes.style === 'sleepy') {
      f(8,7,EC);f(9,7,EC);f(14,7,EC);f(15,7,EC);
      f(8,6,'#0a081288');f(9,6,'#0a081288');f(14,6,'#0a081288');f(15,6,'#0a081288');
    } else if (eyes.style === 'angry') {
      f(8,6,EC);f(9,6,EC);f(8,7,'#0a0812');f(9,7,'#0a0812');
      f(14,6,EC);f(15,6,EC);f(14,7,'#0a0812');f(15,7,'#0a0812');
      f(7,6,'#0a0812');f(16,6,'#0a0812');f(8,6,'#ffffffaa');f(14,6,'#ffffffaa');
    } else if (eyes.style === 'glowing') {
      f(8,6,EC);f(9,6,EC);f(8,7,EC+'cc');f(9,7,EC+'cc');
      f(14,6,EC);f(15,6,EC);f(14,7,EC+'cc');f(15,7,EC+'cc');
      f(7,6,EC+'33');f(10,6,EC+'33');f(13,6,EC+'33');f(16,6,EC+'33');
    } else if (eyes.style === 'slit') {
      f(8,6,EC);f(9,6,EC);f(14,6,EC);f(15,6,EC);
      f(8,7,'#0a0812');f(9,7,EC+'44');f(14,7,'#0a0812');f(15,7,EC+'44');
      f(8,6,'#ffffff88');f(14,6,'#ffffff88');
    } else { // default
      f(8,6,EC);f(9,6,EC);f(8,7,'#0a0812');f(9,7,'#0a0812');
      f(14,6,EC);f(15,6,EC);f(14,7,'#0a0812');f(15,7,'#0a0812');
      f(8,6,'#ffffffcc');f(14,6,'#ffffffcc');
    }

    // ── NOSE ──
    f(11,8,EC+'aa');f(12,8,EC+'aa');

    // ── EXPRESSION ──
    if (expr.style === 'grin') { f(10,9,MC);f(11,9,MC);f(12,9,MC);f(13,9,MC);f(9,8,MC+'44');f(14,8,MC+'44'); }
    else if (expr.style === 'frown') { f(10,9,MC);f(11,9,MC);f(12,9,MC);f(13,9,MC);f(10,10,MC+'44');f(13,10,MC+'44'); }
    else if (expr.style === 'fangs') { f(10,9,MC);f(11,9,MC);f(12,9,MC);f(13,9,MC);f(10,10,'#ffffff');f(13,10,'#ffffff'); }
    else if (expr.style === 'smirk') { f(11,9,MC);f(12,9,MC);f(13,9,MC);f(14,9,MC+'66'); }
    else if (expr.style === 'shocked') { f(11,9,MC);f(12,9,MC);f(11,10,MC);f(12,10,MC); }
    else { for (let x = 10; x <= 13; x++) f(x, 9, MC); }
    // Whiskers
    f(5,7,FC+'44');f(5,8,FC+'33');f(18,7,FC+'44');f(18,8,FC+'33');

    // ── ROBE ──
    if (robe.style === 'armored') {
      for (let y=10;y<=18;y++){const w=y<13?6:y<16?7:7;for(let x=12-w;x<=11+w;x++){if(x>=0&&x<24)f(x,y,RC);}}
      for(let y=11;y<=14;y++){f(8,y,RC+'aa');f(15,y,RC+'aa');}
      for(let x=7;x<=16;x++)f(x,10,EC);for(let x=7;x<=16;x++)f(x,11,EC+'55');
      for(let x=6;x<=17;x++)f(x,14,EC+'66');
    } else if (robe.style === 'cape') {
      for(let y=10;y<=19;y++){const w=y<13?6:y<16?7:8;for(let x=12-w;x<=11+w;x++){if(x>=0&&x<24)f(x,y,RC);}}
      for(let x=7;x<=16;x++){f(x,10,EC+'cc');f(x,11,EC+'55');}
      for(let x=6;x<=17;x++)f(x,15,EC+'aa');f(11,15,WC);f(12,15,WC);
      for(let y=11;y<=20;y++){f(3,y,RC+'bb');f(20,y,RC+'bb');}
      for(let y=12;y<=21;y++){f(2,y,RC+'77');f(21,y,RC+'77');}
    } else if (robe.style === 'tattered') {
      for(let y=10;y<=19;y++){const w=y<13?6:y<16?7:8;for(let x=12-w;x<=11+w;x++){if(x>=0&&x<24&&!(y>17&&x%3===0))f(x,y,RC);}}
      for(let x=7;x<=16;x++){f(x,10,EC+'cc');f(x,11,EC+'55');}
      for(let x=6;x<=17;x++)f(x,15,EC+'aa');f(11,15,WC);f(12,15,WC);
    } else if (robe.style === 'long') {
      for(let y=10;y<=21;y++){const w=y<13?6:y<16?7:y<19?8:7;for(let x=12-w;x<=11+w;x++){if(x>=0&&x<24)f(x,y,RC);}}
      for(let x=7;x<=16;x++){f(x,10,EC+'cc');f(x,11,EC+'55');}
      for(let x=6;x<=17;x++)f(x,15,EC+'aa');f(11,15,WC);f(12,15,WC);
      for(let y=12;y<=21;y++)f(11,y,RC+'77');
    } else { // basic
      for(let y=10;y<=19;y++){const w=y<13?6:y<16?7:8;for(let x=12-w;x<=11+w;x++){if(x>=0&&x<24)f(x,y,RC);}}
      for(let x=7;x<=16;x++){f(x,10,EC+'cc');f(x,11,EC+'55');}
      for(let x=6;x<=17;x++)f(x,15,EC+'aa');f(11,15,WC);f(12,15,WC);
      for(let y=12;y<=19;y++)f(11,y,RC+'77');
      for(let x=4;x<=19;x++){if(x%2===0)f(x,19,EC+'33');}
    }

    // ── SHOULDERS ──
    for(let y=11;y<=13;y++){f(5,y,EC+'44');f(18,y,EC+'44');}

    // ── ARMS ──
    for(let y=12;y<=16;y++){f(4,y,FC);f(5,y,RC);f(18,y,RC);f(19,y,FC);}
    f(4,17,FC);f(19,17,FC);

    // ── ACCESSORY ──
    if (acc.style === 'scarf') { for(let x=6;x<=17;x++){f(x,10,AC);f(x,11,AC+'cc');}f(6,12,AC+'aa');f(7,13,AC+'77'); }
    else if (acc.style === 'amulet') { f(11,12,AC);f(12,12,AC);f(11,13,AC+'cc');f(12,13,AC+'cc');f(11,11,AC+'66');f(12,11,AC+'66'); }
    else if (acc.style === 'shoulder_pad') { for(let y=10;y<=12;y++){f(4,y,AC);f(5,y,AC);f(18,y,AC);f(19,y,AC);} }
    else if (acc.style === 'belt_pouch') { f(7,15,AC);f(8,15,AC);f(7,16,AC);f(8,16,AC);f(8,16,AC+'cc'); }

    // ── WEAPON ──
    if (wpn.style === 'sword') {
      for(let y=5;y<=17;y++)f(20,y,y<8?WC:'#aaaaaa');
      f(19,8,'#8B7355');f(20,8,'#8B7355');f(21,8,'#8B7355');f(20,4,WC);f(20,3,WC+'88');
    } else if (wpn.style === 'wand') {
      for(let y=6;y<=17;y++)f(20,y,'#8B7355');
      f(20,4,WC);f(20,5,WC);f(19,5,WC+'66');f(21,5,WC+'66');f(20,3,WC+'88');
    } else if (wpn.style === 'book') {
      for(let y=12;y<=16;y++){f(20,y,WC);f(21,y,WC);}
      for(let y=12;y<=16;y++)f(19,y,WC+'88');f(20,11,'#ffffff66');f(21,11,'#ffffff66');
    } else if (wpn.style === 'dagger') {
      for(let y=10;y<=16;y++)f(20,y,y<13?WC:'#aaaaaa');
      f(19,13,'#8B7355');f(20,13,'#8B7355');f(21,13,'#8B7355');f(20,9,WC+'88');
    } else if (wpn.style !== 'none') { // staff (default)
      for(let y=3;y<=18;y++)f(20,y,y<6?WC:'#8B7355');
      f(20,1,WC);f(20,2,WC);f(19,2,WC+'88');f(21,2,WC+'88');
      f(20,0,WC+'66');f(19,1,WC+'44');f(21,1,WC+'44');
    }

    // ── FEET ──
    if (robe.style !== 'long') {
      for(let x=7;x<=9;x++){f(x,20,'#2a2a2a');f(x,21,'#1a1a1a');}
      for(let x=14;x<=16;x++){f(x,20,'#2a2a2a');f(x,21,'#1a1a1a');}
    }
  }

  // ═══ CREATE CANVAS ELEMENT ═══
  function createCanvas(config, scale, flip) {
    scale = scale || 3;
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    canvas.style.width = (24 * scale) + 'px';
    canvas.style.height = (24 * scale) + 'px';
    canvas.style.imageRendering = 'pixelated';
    draw(canvas.getContext('2d'), config, flip);
    return canvas;
  }

  // ═══ PUBLIC API ═══
  return {
    draw: draw,
    createCanvas: createCanvas,
    defaultConfig: defaultConfig,
    fromAPI: fromAPI,
    randomConfig: randomConfig,
    HOUSE_COLORS: HOUSE_COLORS,
    PALETTES: PALETTES,
  };

})();