// Tests for the /p/<handle> template-rendering helpers. Pure functions —
// no Supabase, no fs, no Express. The actual route handler in
// publicProfile.js wires these into the runtime.

const {
  renderProfileTemplate,
  buildShareText,
  escapeHtml,
  HOUSES,
} = require('../server/routes/publicProfileRender');

const TEMPLATE_FIXTURE = `<!DOCTYPE html>
<html>
<head>
  <title>{{handle}} — Level {{level}} {{house_name}}</title>
  <meta property="og:title" content="{{handle}} — Level {{level}} {{house_name}}">
  <meta property="og:image" content="{{og_image}}">
  <meta property="og:url" content="{{og_url}}">
</head>
<body>
  <div class="handle">@{{handle}}</div>
  <div class="house" style="color:{{house_color}}">{{house_name}}</div>
  <img src="{{house_image}}">
  <div class="lifetime">{{lifetime_points}}</div>
  <div class="streak">{{streak}}</div>
  <div class="elo">{{duel_elo}}</div>
  <div class="guild">{{guild_display}}</div>
  <div class="player-id" data-id="{{player_id}}"></div>
  <a href="https://twitter.com/intent/tweet?text={{share_text_encoded}}">SHARE</a>
</body>
</html>`;

const examplePlayer = {
  id: 'p-uuid-123',
  twitter_handle: 'CatLord',
  school_id: 5, // Stormrage
  guild_tag: 'BONK',
  lifetime_points: 12450,
  seasonal_points: 1200,
  streak: 7,
  duel_elo: 1340,
  is_active: true,
};

describe('renderProfileTemplate', () => {
  test('replaces handle, house, level, points, streak, elo', () => {
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, examplePlayer, {
      level: 8,
      baseUrl: 'https://9lv.net',
    });
    expect(out).toContain('CatLord — Level 8 STORMRAGE');
    expect(out).toContain('@CatLord');
    expect(out).toContain('color:#FFC800');
    expect(out).toContain('STORMRAGE');
    expect(out).toContain('12,450');
    expect(out).toContain('class="streak">7<');
    expect(out).toContain('class="elo">1340<');
  });

  test('builds canonical og:url from handle (lowercased + url-encoded)', () => {
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, examplePlayer, {
      level: 8,
      baseUrl: 'https://9lv.net',
    });
    expect(out).toContain('og:url" content="https://9lv.net/p/catlord"');
  });

  test('uses default OG image when no override given', () => {
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, examplePlayer, {
      level: 1,
      baseUrl: 'https://9lv.net',
    });
    expect(out).toContain('https://9lv.net/assets/images/title-nethara.png');
  });

  test('falls back to Smoulders (school_id 1) on unknown school_id', () => {
    const broken = { ...examplePlayer, school_id: 99 };
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, broken, {
      level: 3,
      baseUrl: 'https://9lv.net',
    });
    expect(out).toContain('SMOULDERS');
    expect(out).toContain('color:#E03C31');
  });

  test('renders LONE WOLF when no guild tag', () => {
    const lone = { ...examplePlayer, guild_tag: null };
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, lone, {
      level: 1,
      baseUrl: 'https://9lv.net',
    });
    expect(out).toContain('LONE WOLF');
  });

  test('renders NO GUILD when guild tag is the handle (auto-defaulted)', () => {
    const auto = { ...examplePlayer, guild_tag: '@CatLord' };
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, auto, {
      level: 1,
      baseUrl: 'https://9lv.net',
    });
    expect(out).toContain('NO GUILD');
  });

  test('renders bracketed uppercase guild tag when set', () => {
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, examplePlayer, {
      level: 1,
      baseUrl: 'https://9lv.net',
    });
    expect(out).toContain('[BONK]');
  });

  test('escapes HTML in handle and guild_tag (defensive)', () => {
    const adversarial = {
      ...examplePlayer,
      twitter_handle: 'Cat<script>',
      guild_tag: 'BAD"TAG',
    };
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, adversarial, {
      level: 1,
      baseUrl: 'https://9lv.net',
    });
    expect(out).not.toContain('<script>');
    expect(out).toContain('Cat&lt;script&gt;');
    // escaped guild tag — uppercase happens before escape so it's BAD"TAG → escaped
    expect(out).toContain('BAD&quot;TAG');
  });

  test('share_text_encoded contains lifetime points and canonical URL', () => {
    const out = renderProfileTemplate(TEMPLATE_FIXTURE, examplePlayer, {
      level: 8,
      baseUrl: 'https://9lv.net',
    });
    // The encoded text should contain url-encoded "9lv.net/p/catlord"
    expect(out).toContain(encodeURIComponent('9lv.net/p/catlord'));
    expect(out).toContain(encodeURIComponent('12,450 lifetime points'));
  });

  test('returns empty string when template is empty', () => {
    expect(renderProfileTemplate('', examplePlayer, { level: 1 })).toBe('');
  });
});

describe('buildShareText', () => {
  test('contains handle, house, level, points', () => {
    const txt = buildShareText({
      handle: 'catlord',
      houseName: 'Stormrage',
      level: 8,
      lifetimePoints: 12450,
      baseUrl: 'https://9lv.net',
    });
    expect(txt).toContain('Level 8 Stormrage');
    expect(txt).toContain('12,450 lifetime points');
    expect(txt).toContain('https://9lv.net/p/catlord');
    expect(txt).toContain('$9LV @9LVNetwork');
  });

  test('lowercases handle in URL', () => {
    const txt = buildShareText({
      handle: 'CatLord',
      houseName: 'Stormrage',
      level: 1,
      lifetimePoints: 0,
      baseUrl: 'https://9lv.net',
    });
    expect(txt).toContain('https://9lv.net/p/catlord');
  });

  test('falls back to 9lv.net when no baseUrl given', () => {
    const txt = buildShareText({
      handle: 'x',
      houseName: 'Y',
      level: 1,
      lifetimePoints: 0,
    });
    expect(txt).toContain('https://9lv.net/p/x');
  });
});

describe('escapeHtml', () => {
  test('escapes ampersand, brackets, quotes', () => {
    expect(escapeHtml('a&b<c>"d\'e')).toBe('a&amp;b&lt;c&gt;&quot;d&#39;e');
  });
  test('returns empty string for null / undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  test('coerces numbers to strings', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('HOUSES catalog', () => {
  test('has 9 entries 1-9', () => {
    for (let i = 1; i <= 9; i++) {
      expect(HOUSES[i]).toBeDefined();
      expect(HOUSES[i].name).toBeTruthy();
      expect(HOUSES[i].color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
