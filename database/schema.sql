-- =====================================================================
-- Nine Lives Network — Supabase public schema
-- Generated: 2026-04-17T12:47:50.115Z
-- Source:    PostgREST OpenAPI spec at https://doorjltuhgouaraoxssz.supabase.co/rest/v1/
-- Script:    scripts/dump-schema.js
--
-- This file is a REST-introspected schema, not a true pg_dump. It contains
-- column definitions, defaults, primary keys, and foreign key relationships.
-- It does NOT contain: secondary indexes, RLS policies, unique constraints
-- (beyond PKs), check constraints, triggers, or sequence names.
-- Regenerate with: node scripts/dump-schema.js
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLES (59)
-- ---------------------------------------------------------------------

CREATE TABLE battles (
    id integer NOT NULL,
    challenger_nft_id integer,
    defender_nft_id integer,
    winner_nft_id integer,
    battle_log jsonb,
    challenger_damage_dealt integer DEFAULT 0,
    defender_damage_dealt integer DEFAULT 0,
    rounds integer DEFAULT 0,
    started_at timestamp without time zone DEFAULT now(),
    ended_at timestamp without time zone
);

CREATE TABLE boss_contributions (
    id integer NOT NULL,
    boss_id integer NOT NULL,
    player_id integer NOT NULL,
    guild_tag text,
    damage_dealt integer DEFAULT 0,
    cycles_survived integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE boss_deployments (
    id integer NOT NULL,
    boss_id integer,
    player_id integer,
    nine_id integer,
    guild_tag text,
    current_hp integer DEFAULT 20,
    max_hp integer DEFAULT 20,
    base_atk integer DEFAULT 3,
    base_spd integer DEFAULT 5,
    card_id integer,
    is_active boolean DEFAULT true,
    deployed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE boss_fights (
    id integer NOT NULL,
    boss_name text NOT NULL,
    total_hp integer DEFAULT 10000 NOT NULL,
    current_hp integer DEFAULT 10000 NOT NULL,
    phase integer DEFAULT 1,
    is_active boolean DEFAULT true,
    started_at timestamp with time zone DEFAULT now(),
    ends_at timestamp with time zone
);

CREATE TABLE bounties (
    id integer NOT NULL,
    target_player_id integer NOT NULL,
    hp_total integer NOT NULL,
    hp_current integer NOT NULL,
    reward_pool integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

CREATE TABLE bounty_damage (
    id integer NOT NULL,
    bounty_id integer NOT NULL,
    attacker_id integer NOT NULL,
    damage integer NOT NULL,
    tweet_id character varying,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE card_durability_log (
    id integer NOT NULL,
    card_id integer NOT NULL,
    action_type text NOT NULL,
    charges_before integer,
    charges_after integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE card_packs (
    id bigint NOT NULL,
    player_id bigint NOT NULL,
    pack_type character varying DEFAULT 'daily',
    season_id integer,
    cards jsonb NOT NULL,
    opened_at timestamp with time zone DEFAULT now(),
    game_day date DEFAULT 'CURRENT_DATE'
);

CREATE TABLE casts (
    id integer NOT NULL,
    player_id integer NOT NULL,
    spell_name character varying NOT NULL,
    target_player_id integer,
    zone_id integer,
    tweet_id character varying,
    mana_cost integer DEFAULT 1,
    points_earned integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    school_position integer,
    first_blood_bonus integer DEFAULT 0
);

CREATE TABLE chronicle_acts (
    id bigint NOT NULL,
    raid_date date NOT NULL,
    act_num smallint NOT NULL,
    act_name text,
    tweet_id text,
    tweet_text text,
    status text DEFAULT 'pending',
    participant_count integer DEFAULT 0,
    named_handles text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE chronicle_participants (
    id bigint NOT NULL,
    player_id bigint NOT NULL,
    raid_date date NOT NULL,
    act_num smallint NOT NULL,
    reply_tweet_id text,
    points_awarded integer DEFAULT 0 NOT NULL,
    quality_tier text DEFAULT 'base',
    named_in_story boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE combat_cycles (
    id integer NOT NULL,
    zone_id integer NOT NULL,
    cycle_number integer DEFAULT 1 NOT NULL,
    cycle_data jsonb,
    winning_guild text,
    total_participants integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone DEFAULT now()
);

CREATE TABLE communities (
    id integer NOT NULL,
    tag text NOT NULL,
    name text,
    image_url text,
    color text DEFAULT '#888888',
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE community_clashes (
    id bigint NOT NULL,
    team_a_tag character varying,
    team_a_color character varying DEFAULT '#D4A64B',
    team_b_tag character varying,
    team_b_color character varying DEFAULT '#00D4FF',
    team_a_points integer DEFAULT 0,
    team_b_points integer DEFAULT 0,
    season integer DEFAULT 0,
    week integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE daily_objectives (
    id integer NOT NULL,
    zone_id integer,
    tweet_id character varying,
    tweet_url text,
    game_day date DEFAULT 'CURRENT_DATE',
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE daily_quests (
    id integer NOT NULL,
    player_id integer,
    quest_date date NOT NULL,
    quest_type text NOT NULL,
    quest_desc text,
    target integer DEFAULT 1,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    reward_mana integer DEFAULT 0,
    reward_points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE daily_rotations (
    id integer NOT NULL,
    game_day date NOT NULL,
    rotation jsonb NOT NULL,
    ultimate_houses integer[],
    chaos_modifier character varying,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE drop_tickets (
    id integer NOT NULL,
    player_id integer NOT NULL,
    ticket_date date DEFAULT 'CURRENT_DATE' NOT NULL,
    tickets_earned integer DEFAULT 0,
    rolled boolean DEFAULT false,
    results jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE duel_history (
    id bigint NOT NULL,
    duel_id text NOT NULL,
    mode text DEFAULT '1v1' NOT NULL,
    winner_team text,
    is_perfect boolean DEFAULT false,
    team_a text[],
    team_b text[],
    duration_ticks integer DEFAULT 0,
    duration_ms integer DEFAULT 0,
    fight_log jsonb,
    results jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE duels (
    id integer NOT NULL,
    challenger_id integer,
    target_id integer,
    challenger_school_id integer,
    target_school_id integer,
    winner_id integer,
    loser_id integer,
    status character varying DEFAULT 'pending',
    points_won integer DEFAULT 10,
    points_lost integer DEFAULT 10,
    created_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone,
    expires_at timestamp without time zone DEFAULT '(now() + ''24:00:00''::interval)'
);

CREATE TABLE effect_definitions (
    id integer NOT NULL,
    tag text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    tooltip text NOT NULL,
    implementation text NOT NULL
);

CREATE TABLE events (
    id integer NOT NULL,
    event_type text NOT NULL,
    zone_id integer,
    modifier_data jsonb,
    starts_at timestamp with time zone DEFAULT now(),
    ends_at timestamp with time zone,
    is_active boolean DEFAULT true
);

CREATE TABLE gauntlet_runs (
    id bigint NOT NULL,
    player_id text NOT NULL,
    run_date date DEFAULT 'CURRENT_DATE' NOT NULL,
    highest_floor integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE guild_clashes (
    id integer NOT NULL,
    week integer DEFAULT 1 NOT NULL,
    guild_a text NOT NULL,
    guild_b text NOT NULL,
    color_a text DEFAULT '#FFD700',
    color_b text DEFAULT '#00BFFF',
    score_a integer DEFAULT 0,
    score_b integer DEFAULT 0,
    status text DEFAULT 'upcoming',
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE guilds (
    id integer NOT NULL,
    name text NOT NULL,
    tag text NOT NULL,
    contract_address text,
    ticker text,
    logo_url text,
    member_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE house_alliances (
    house_id character varying NOT NULL,
    ally_house_id character varying,
    affinity_bonus numeric DEFAULT 1.3,
    ally_bonus numeric DEFAULT 1.1
);

CREATE TABLE houses (
    id integer NOT NULL,
    name character varying NOT NULL,
    element character varying NOT NULL,
    primary_color character varying NOT NULL,
    secondary_color character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    atk integer DEFAULT 0,
    hp integer DEFAULT 0,
    spd integer DEFAULT 0,
    def integer DEFAULT 0,
    luck integer DEFAULT 0,
    role text DEFAULT '',
    slug text DEFAULT '',
    base_atk integer DEFAULT 0,
    base_hp integer DEFAULT 0,
    base_spd integer DEFAULT 0,
    base_def integer DEFAULT 0,
    base_luck integer DEFAULT 0
);

CREATE TABLE items (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    slot text NOT NULL,
    rarity text DEFAULT 'common',
    image_file text,
    bonus_atk integer DEFAULT 0,
    bonus_hp integer DEFAULT 0,
    bonus_spd integer DEFAULT 0,
    bonus_def integer DEFAULT 0,
    bonus_luck integer DEFAULT 0,
    description text,
    is_starter boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    effect_trigger text,
    effect_value jsonb,
    stat_atk integer DEFAULT 0,
    stat_hp integer DEFAULT 0,
    stat_spd integer DEFAULT 0,
    stat_def integer DEFAULT 0,
    stat_luck integer DEFAULT 0
);

CREATE TABLE narrative_raids (
    id integer NOT NULL,
    raid_date date NOT NULL,
    narrative_id integer,
    narrative_title text,
    status text DEFAULT 'pending',
    tweet_1_id text,
    tweet_2_id text,
    tweet_3_id text,
    tweet_4_id text,
    standings jsonb,
    winner_community text,
    winner_count integer DEFAULT 0,
    mvp_player_id integer,
    mvp_twitter_handle text,
    total_raiders integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    act_1_text text,
    act_2_text text,
    act_3_text text,
    act_4_text text,
    replies jsonb,
    named_players jsonb,
    ending_type text
);

CREATE TABLE narratives (
    id integer NOT NULL,
    title text NOT NULL,
    theme text NOT NULL,
    tweet_1 text NOT NULL,
    tweet_2_prompt text NOT NULL,
    tweet_3_prompt text NOT NULL,
    tweet_4_prompt text NOT NULL,
    images text[],
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE nerm_seen_tweets (
    id bigint NOT NULL,
    tweet_id text NOT NULL,
    type text DEFAULT 'mention',
    seen_at timestamp with time zone DEFAULT now()
);

CREATE TABLE nerm_user_memory (
    telegram_user_id bigint NOT NULL,
    name text,
    house text,
    times_roasted integer DEFAULT 0,
    times_talked integer DEFAULT 0,
    notes text[],
    last_seen timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE nfts (
    id integer NOT NULL,
    token_id integer NOT NULL,
    name character varying,
    owner_player_id integer,
    school_id integer,
    image_url character varying NOT NULL,
    trait_head_id integer,
    trait_robe_id integer,
    trait_staff_id integer,
    trait_accessory_id integer,
    trait_fur_id integer,
    total_hp integer DEFAULT 100,
    total_attack integer DEFAULT 10,
    total_defense integer DEFAULT 10,
    total_speed integer DEFAULT 10,
    total_mana integer DEFAULT 10,
    power_rating integer DEFAULT 100,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE nine_builds (
    id integer NOT NULL,
    player_id integer,
    nine_name text DEFAULT 'Unnamed Nine',
    config jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE pack_inventory (
    id bigint NOT NULL,
    player_id integer NOT NULL,
    pack_type character varying DEFAULT 'daily' NOT NULL,
    source character varying DEFAULT 'daily_login' NOT NULL,
    opened boolean DEFAULT false NOT NULL,
    opened_at timestamp with time zone,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    season_id integer,
    pack_data jsonb
);

CREATE TABLE player_cards (
    id bigint NOT NULL,
    player_id integer,
    spell_id integer,
    rarity character varying DEFAULT 'common',
    acquired_date date DEFAULT 'CURRENT_DATE',
    source character varying DEFAULT 'pack',
    created_at timestamp with time zone DEFAULT now(),
    spell_name character varying,
    spell_house character varying,
    spell_type character varying,
    spell_tier integer DEFAULT 0,
    spell_effects jsonb,
    is_burned boolean DEFAULT false,
    acquired_at timestamp with time zone DEFAULT now(),
    is_exhausted boolean DEFAULT false,
    sharpness smallint
);

CREATE TABLE player_items (
    id integer NOT NULL,
    player_id integer,
    item_id integer,
    acquired_at timestamp with time zone DEFAULT now(),
    source text DEFAULT 'starter',
    equipped boolean DEFAULT false
);

CREATE TABLE player_levels (
    id integer NOT NULL,
    player_id integer NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sharpening_kits integer DEFAULT 0,
    item_fragments integer DEFAULT 0
);

CREATE TABLE player_nines (
    id integer NOT NULL,
    player_id integer NOT NULL,
    house_id integer NOT NULL,
    name text,
    base_atk integer DEFAULT 5 NOT NULL,
    base_hp integer DEFAULT 20 NOT NULL,
    base_spd integer DEFAULT 5 NOT NULL,
    current_hp integer DEFAULT 20 NOT NULL,
    is_ko boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    base_def integer DEFAULT 2,
    base_luck integer DEFAULT 2,
    equipped_fur text,
    equipped_expression text,
    equipped_headwear text,
    equipped_outfit text,
    equipped_weapon text,
    equipped_familiar text,
    equipped_trinket_1 text,
    equipped_trinket_2 text,
    equipped_images jsonb
);

CREATE TABLE player_quests (
    id integer NOT NULL,
    player_id integer,
    quest_date date NOT NULL,
    quest_id text NOT NULL,
    quest_name text NOT NULL,
    quest_desc text,
    target integer DEFAULT 1,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    reward_claimed boolean DEFAULT false,
    reward_mana integer DEFAULT 0,
    reward_points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE player_weekly_rewards (
    id bigint NOT NULL,
    player_id bigint,
    week_start date NOT NULL,
    tier integer NOT NULL,
    claimed_at timestamp with time zone DEFAULT now()
);

-- §9.50 per-zone session metrics. Daily rollover is implicit via metric_date
-- defaulting to (now() AT TIME ZONE 'UTC')::date — no cron needed.
-- Writes: combatEngine batches deltas per-tick and calls a read+upsert
-- sequence (single-writer per zone, so safe without PL/pgSQL). Reads:
-- /api/zones/:zone_id/metrics. Idempotent migration — safe to re-run.
CREATE TABLE IF NOT EXISTS player_zone_metrics (
    player_id integer NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    zone_id integer NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    metric_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
    damage integer NOT NULL DEFAULT 0,
    heals integer NOT NULL DEFAULT 0,
    kos integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, zone_id, metric_date)
);
CREATE INDEX IF NOT EXISTS idx_pzm_zone_date ON player_zone_metrics(zone_id, metric_date);

CREATE TABLE players (
    id integer NOT NULL,
    twitter_handle character varying NOT NULL,
    twitter_id character varying,
    wallet_address character varying,
    school_id integer,
    guild_tag character varying,
    mana integer DEFAULT 3,
    lifetime_points integer DEFAULT 0,
    seasonal_points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    last_cast_at timestamp with time zone,
    is_active boolean DEFAULT true,
    profile_image text,
    lives integer DEFAULT 3,
    duel_wins integer DEFAULT 0,
    duel_losses integer DEFAULT 0,
    lives_last_reset timestamp without time zone,
    max_mana integer DEFAULT 7,
    arcane_energy integer DEFAULT 0,
    arcane_energy_today integer DEFAULT 0,
    streak integer DEFAULT 0,
    last_mana_regen timestamp with time zone DEFAULT now(),
    duel_elo integer DEFAULT 1000,
    season_points integer DEFAULT 0
);

CREATE TABLE point_log (
    id bigint NOT NULL,
    player_id integer NOT NULL,
    amount integer NOT NULL,
    source text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE scoring_config (
    key character varying NOT NULL,
    value numeric NOT NULL,
    description text
);

CREATE TABLE seasons (
    id integer NOT NULL,
    name character varying NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE spells (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    house text DEFAULT 'universal' NOT NULL,
    spell_type text DEFAULT 'attack' NOT NULL,
    base_effect text NOT NULL,
    bonus_effects jsonb,
    flavor_text text,
    motto text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    image_url text,
    in_pack_pool boolean DEFAULT true,
    is_always_available boolean DEFAULT false,
    rarity_weights jsonb,
    base_atk integer DEFAULT 3,
    base_hp integer DEFAULT 2,
    base_spd integer DEFAULT 0,
    base_def integer DEFAULT 0,
    base_luck integer DEFAULT 0,
    atk_pct smallint,
    hp_pct smallint,
    spd_pct smallint,
    def_pct smallint,
    luck_pct smallint,
    stat_pattern text DEFAULT 'balanced_support',
    card_type text DEFAULT 'attack',
    effect_1 text,
    effect_2 text
);

CREATE TABLE territory_actions (
    id integer NOT NULL,
    player_id integer NOT NULL,
    zone_id integer NOT NULL,
    school_id integer NOT NULL,
    action_type character varying NOT NULL,
    power_contributed integer DEFAULT 1,
    source character varying DEFAULT 'website',
    tweet_id character varying,
    game_day date DEFAULT 'CURRENT_DATE' NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    spell_id integer,
    spell_name character varying,
    spell_house character varying,
    spell_tier integer DEFAULT 0,
    spell_rarity character varying DEFAULT 'common',
    spell_effects jsonb,
    base_power integer DEFAULT 10,
    rarity_multiplier numeric DEFAULT 1,
    affinity_multiplier numeric DEFAULT 1,
    total_power integer DEFAULT 10,
    effects_applied jsonb,
    rarity text DEFAULT 'common',
    influence_change numeric DEFAULT 0,
    points_earned integer DEFAULT 0,
    guild_tag text
);

CREATE TABLE trait_categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    display_name character varying NOT NULL,
    slot_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE traits (
    id integer NOT NULL,
    category_id integer,
    name character varying NOT NULL,
    rarity character varying DEFAULT 'common',
    image_url character varying,
    stat_hp integer DEFAULT 0,
    stat_attack integer DEFAULT 0,
    stat_defense integer DEFAULT 0,
    stat_speed integer DEFAULT 0,
    stat_mana integer DEFAULT 0,
    element character varying,
    element_bonus integer DEFAULT 0,
    special_ability character varying,
    ability_value integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE zone_card_slots (
    id integer NOT NULL,
    deployment_id integer NOT NULL,
    card_id integer NOT NULL,
    is_active boolean DEFAULT true,
    equipped_at timestamp with time zone DEFAULT now(),
    slot_number integer DEFAULT 1
);

CREATE TABLE zone_community_snapshots (
    id integer NOT NULL,
    zone_id integer,
    community_tag text,
    power_score integer,
    snapshot_date date,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE zone_control (
    id integer NOT NULL,
    zone_id integer NOT NULL,
    controlling_guild text,
    snapshot_hp integer DEFAULT 0,
    dominant_house text,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE zone_control_history (
    id integer NOT NULL,
    zone_id integer NOT NULL,
    controlling_guild text,
    snapshot_hp integer DEFAULT 0,
    dominant_house text,
    branded_guild text,
    snapped_at timestamp with time zone DEFAULT now(),
    round_number integer
);

CREATE TABLE zone_daily_state (
    id bigint NOT NULL,
    zone_id integer,
    date date DEFAULT 'CURRENT_DATE' NOT NULL,
    flags jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE zone_deployments (
    id integer NOT NULL,
    player_id integer NOT NULL,
    nine_id integer NOT NULL,
    zone_id integer NOT NULL,
    guild_tag text,
    current_hp integer DEFAULT 20 NOT NULL,
    max_hp integer DEFAULT 20 NOT NULL,
    is_active boolean DEFAULT true,
    deployed_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_mercenary boolean DEFAULT false,
    ko_at timestamp with time zone,
    ko_until timestamp with time zone,
    damage_dealt integer DEFAULT 0,
    heals_done integer DEFAULT 0,
    kos_dealt integer DEFAULT 0,
    points_earned integer DEFAULT 0
);

CREATE TABLE zone_effects (
    id bigint NOT NULL,
    zone_id bigint NOT NULL,
    effect_type character varying NOT NULL,
    source_house character varying,
    source_player_id bigint,
    target_house character varying,
    value numeric DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    applied_at timestamp with time zone DEFAULT now(),
    game_day date DEFAULT 'CURRENT_DATE'
);

CREATE TABLE zone_guild_control (
    id bigint NOT NULL,
    zone_id integer NOT NULL,
    guild_tag text NOT NULL,
    control_percentage numeric DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE zone_influence_history (
    id bigint NOT NULL,
    zone_id integer,
    school_id integer,
    influence_pct numeric,
    snapshot_time timestamp with time zone DEFAULT now()
);

CREATE TABLE zones (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    zone_type character varying NOT NULL,
    bonus_effect text,
    is_current_objective boolean DEFAULT false,
    school_id integer,
    created_at timestamp with time zone DEFAULT now(),
    objective_tweet_id text,
    objective_posted_at timestamp with time zone,
    last_processed_tweet_id text,
    environment_image character varying,
    controlling_school_id integer,
    last_captured_at timestamp without time zone,
    narrative_title text,
    image_url text,
    is_active boolean DEFAULT true,
    time_limit_hours integer DEFAULT 0,
    controlled_by text,
    last_snapshot_at timestamp with time zone,
    snapshot_count integer DEFAULT 0,
    controlling_guild text,
    arena_image_url text,
    arena_polygon jsonb,
    dominant_house text,
    branded_guild text,
    house_bonus_label text
);

-- ---------------------------------------------------------------------
-- PRIMARY KEYS (59)
-- ---------------------------------------------------------------------

ALTER TABLE battles ADD CONSTRAINT battles_pkey PRIMARY KEY (id);
ALTER TABLE boss_contributions ADD CONSTRAINT boss_contributions_pkey PRIMARY KEY (id);
ALTER TABLE boss_deployments ADD CONSTRAINT boss_deployments_pkey PRIMARY KEY (id);
ALTER TABLE boss_fights ADD CONSTRAINT boss_fights_pkey PRIMARY KEY (id);
ALTER TABLE bounties ADD CONSTRAINT bounties_pkey PRIMARY KEY (id);
ALTER TABLE bounty_damage ADD CONSTRAINT bounty_damage_pkey PRIMARY KEY (id);
ALTER TABLE card_durability_log ADD CONSTRAINT card_durability_log_pkey PRIMARY KEY (id);
ALTER TABLE card_packs ADD CONSTRAINT card_packs_pkey PRIMARY KEY (id);
ALTER TABLE casts ADD CONSTRAINT casts_pkey PRIMARY KEY (id);
ALTER TABLE chronicle_acts ADD CONSTRAINT chronicle_acts_pkey PRIMARY KEY (id);
ALTER TABLE chronicle_participants ADD CONSTRAINT chronicle_participants_pkey PRIMARY KEY (id);
ALTER TABLE combat_cycles ADD CONSTRAINT combat_cycles_pkey PRIMARY KEY (id);
ALTER TABLE communities ADD CONSTRAINT communities_pkey PRIMARY KEY (id);
ALTER TABLE community_clashes ADD CONSTRAINT community_clashes_pkey PRIMARY KEY (id);
ALTER TABLE daily_objectives ADD CONSTRAINT daily_objectives_pkey PRIMARY KEY (id);
ALTER TABLE daily_quests ADD CONSTRAINT daily_quests_pkey PRIMARY KEY (id);
ALTER TABLE daily_rotations ADD CONSTRAINT daily_rotations_pkey PRIMARY KEY (id);
ALTER TABLE drop_tickets ADD CONSTRAINT drop_tickets_pkey PRIMARY KEY (id);
ALTER TABLE duel_history ADD CONSTRAINT duel_history_pkey PRIMARY KEY (id);
ALTER TABLE duels ADD CONSTRAINT duels_pkey PRIMARY KEY (id);
ALTER TABLE effect_definitions ADD CONSTRAINT effect_definitions_pkey PRIMARY KEY (id);
ALTER TABLE events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE gauntlet_runs ADD CONSTRAINT gauntlet_runs_pkey PRIMARY KEY (id);
ALTER TABLE guild_clashes ADD CONSTRAINT guild_clashes_pkey PRIMARY KEY (id);
ALTER TABLE guilds ADD CONSTRAINT guilds_pkey PRIMARY KEY (id);
ALTER TABLE house_alliances ADD CONSTRAINT house_alliances_pkey PRIMARY KEY (house_id);
ALTER TABLE houses ADD CONSTRAINT houses_pkey PRIMARY KEY (id);
ALTER TABLE items ADD CONSTRAINT items_pkey PRIMARY KEY (id);
ALTER TABLE narrative_raids ADD CONSTRAINT narrative_raids_pkey PRIMARY KEY (id);
ALTER TABLE narratives ADD CONSTRAINT narratives_pkey PRIMARY KEY (id);
ALTER TABLE nerm_seen_tweets ADD CONSTRAINT nerm_seen_tweets_pkey PRIMARY KEY (id);
ALTER TABLE nerm_user_memory ADD CONSTRAINT nerm_user_memory_pkey PRIMARY KEY (telegram_user_id);
ALTER TABLE nfts ADD CONSTRAINT nfts_pkey PRIMARY KEY (id);
ALTER TABLE nine_builds ADD CONSTRAINT nine_builds_pkey PRIMARY KEY (id);
ALTER TABLE pack_inventory ADD CONSTRAINT pack_inventory_pkey PRIMARY KEY (id);
ALTER TABLE player_cards ADD CONSTRAINT player_cards_pkey PRIMARY KEY (id);
ALTER TABLE player_items ADD CONSTRAINT player_items_pkey PRIMARY KEY (id);
ALTER TABLE player_levels ADD CONSTRAINT player_levels_pkey PRIMARY KEY (id);
ALTER TABLE player_nines ADD CONSTRAINT player_nines_pkey PRIMARY KEY (id);
ALTER TABLE player_quests ADD CONSTRAINT player_quests_pkey PRIMARY KEY (id);
ALTER TABLE player_weekly_rewards ADD CONSTRAINT player_weekly_rewards_pkey PRIMARY KEY (id);
ALTER TABLE players ADD CONSTRAINT players_pkey PRIMARY KEY (id);
ALTER TABLE point_log ADD CONSTRAINT point_log_pkey PRIMARY KEY (id);
ALTER TABLE scoring_config ADD CONSTRAINT scoring_config_pkey PRIMARY KEY (key);
ALTER TABLE seasons ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);
ALTER TABLE spells ADD CONSTRAINT spells_pkey PRIMARY KEY (id);
ALTER TABLE territory_actions ADD CONSTRAINT territory_actions_pkey PRIMARY KEY (id);
ALTER TABLE trait_categories ADD CONSTRAINT trait_categories_pkey PRIMARY KEY (id);
ALTER TABLE traits ADD CONSTRAINT traits_pkey PRIMARY KEY (id);
ALTER TABLE zone_card_slots ADD CONSTRAINT zone_card_slots_pkey PRIMARY KEY (id);
ALTER TABLE zone_community_snapshots ADD CONSTRAINT zone_community_snapshots_pkey PRIMARY KEY (id);
ALTER TABLE zone_control ADD CONSTRAINT zone_control_pkey PRIMARY KEY (id);
ALTER TABLE zone_control_history ADD CONSTRAINT zone_control_history_pkey PRIMARY KEY (id);
ALTER TABLE zone_daily_state ADD CONSTRAINT zone_daily_state_pkey PRIMARY KEY (id);
ALTER TABLE zone_deployments ADD CONSTRAINT zone_deployments_pkey PRIMARY KEY (id);
ALTER TABLE zone_effects ADD CONSTRAINT zone_effects_pkey PRIMARY KEY (id);
ALTER TABLE zone_guild_control ADD CONSTRAINT zone_guild_control_pkey PRIMARY KEY (id);
ALTER TABLE zone_influence_history ADD CONSTRAINT zone_influence_history_pkey PRIMARY KEY (id);
ALTER TABLE zones ADD CONSTRAINT zones_pkey PRIMARY KEY (id);

-- ---------------------------------------------------------------------
-- FOREIGN KEYS (62)
-- ---------------------------------------------------------------------

ALTER TABLE battles ADD CONSTRAINT battles_challenger_nft_id_fkey FOREIGN KEY (challenger_nft_id) REFERENCES nfts(id);
ALTER TABLE battles ADD CONSTRAINT battles_defender_nft_id_fkey FOREIGN KEY (defender_nft_id) REFERENCES nfts(id);
ALTER TABLE battles ADD CONSTRAINT battles_winner_nft_id_fkey FOREIGN KEY (winner_nft_id) REFERENCES nfts(id);
ALTER TABLE boss_contributions ADD CONSTRAINT boss_contributions_boss_id_fkey FOREIGN KEY (boss_id) REFERENCES boss_fights(id);
ALTER TABLE boss_contributions ADD CONSTRAINT boss_contributions_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE boss_deployments ADD CONSTRAINT boss_deployments_boss_id_fkey FOREIGN KEY (boss_id) REFERENCES boss_fights(id);
ALTER TABLE boss_deployments ADD CONSTRAINT boss_deployments_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE bounties ADD CONSTRAINT bounties_target_player_id_fkey FOREIGN KEY (target_player_id) REFERENCES players(id);
ALTER TABLE bounty_damage ADD CONSTRAINT bounty_damage_bounty_id_fkey FOREIGN KEY (bounty_id) REFERENCES bounties(id);
ALTER TABLE bounty_damage ADD CONSTRAINT bounty_damage_attacker_id_fkey FOREIGN KEY (attacker_id) REFERENCES players(id);
ALTER TABLE card_durability_log ADD CONSTRAINT card_durability_log_card_id_fkey FOREIGN KEY (card_id) REFERENCES player_cards(id);
ALTER TABLE card_packs ADD CONSTRAINT card_packs_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE casts ADD CONSTRAINT casts_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE casts ADD CONSTRAINT casts_target_player_id_fkey FOREIGN KEY (target_player_id) REFERENCES players(id);
ALTER TABLE casts ADD CONSTRAINT casts_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE chronicle_participants ADD CONSTRAINT chronicle_participants_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE combat_cycles ADD CONSTRAINT combat_cycles_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE daily_objectives ADD CONSTRAINT daily_objectives_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE daily_quests ADD CONSTRAINT daily_quests_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE drop_tickets ADD CONSTRAINT drop_tickets_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE duels ADD CONSTRAINT duels_challenger_id_fkey FOREIGN KEY (challenger_id) REFERENCES players(id);
ALTER TABLE duels ADD CONSTRAINT duels_target_id_fkey FOREIGN KEY (target_id) REFERENCES players(id);
ALTER TABLE duels ADD CONSTRAINT duels_challenger_school_id_fkey FOREIGN KEY (challenger_school_id) REFERENCES houses(id);
ALTER TABLE duels ADD CONSTRAINT duels_target_school_id_fkey FOREIGN KEY (target_school_id) REFERENCES houses(id);
ALTER TABLE duels ADD CONSTRAINT duels_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES players(id);
ALTER TABLE duels ADD CONSTRAINT duels_loser_id_fkey FOREIGN KEY (loser_id) REFERENCES players(id);
ALTER TABLE events ADD CONSTRAINT events_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE nfts ADD CONSTRAINT nfts_owner_player_id_fkey FOREIGN KEY (owner_player_id) REFERENCES players(id);
ALTER TABLE nfts ADD CONSTRAINT nfts_school_id_fkey FOREIGN KEY (school_id) REFERENCES houses(id);
ALTER TABLE nfts ADD CONSTRAINT nfts_trait_head_id_fkey FOREIGN KEY (trait_head_id) REFERENCES traits(id);
ALTER TABLE nfts ADD CONSTRAINT nfts_trait_robe_id_fkey FOREIGN KEY (trait_robe_id) REFERENCES traits(id);
ALTER TABLE nfts ADD CONSTRAINT nfts_trait_staff_id_fkey FOREIGN KEY (trait_staff_id) REFERENCES traits(id);
ALTER TABLE nfts ADD CONSTRAINT nfts_trait_accessory_id_fkey FOREIGN KEY (trait_accessory_id) REFERENCES traits(id);
ALTER TABLE nfts ADD CONSTRAINT nfts_trait_fur_id_fkey FOREIGN KEY (trait_fur_id) REFERENCES traits(id);
ALTER TABLE nine_builds ADD CONSTRAINT nine_builds_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE pack_inventory ADD CONSTRAINT pack_inventory_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_cards ADD CONSTRAINT player_cards_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_cards ADD CONSTRAINT player_cards_spell_id_fkey FOREIGN KEY (spell_id) REFERENCES spells(id);
ALTER TABLE player_items ADD CONSTRAINT player_items_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_items ADD CONSTRAINT player_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id);
ALTER TABLE player_levels ADD CONSTRAINT player_levels_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_nines ADD CONSTRAINT player_nines_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_nines ADD CONSTRAINT player_nines_house_id_fkey FOREIGN KEY (house_id) REFERENCES houses(id);
ALTER TABLE player_quests ADD CONSTRAINT player_quests_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_weekly_rewards ADD CONSTRAINT player_weekly_rewards_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE players ADD CONSTRAINT players_school_id_fkey FOREIGN KEY (school_id) REFERENCES houses(id);
ALTER TABLE point_log ADD CONSTRAINT point_log_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE territory_actions ADD CONSTRAINT territory_actions_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE territory_actions ADD CONSTRAINT territory_actions_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE territory_actions ADD CONSTRAINT territory_actions_school_id_fkey FOREIGN KEY (school_id) REFERENCES houses(id);
ALTER TABLE traits ADD CONSTRAINT traits_category_id_fkey FOREIGN KEY (category_id) REFERENCES trait_categories(id);
ALTER TABLE zone_card_slots ADD CONSTRAINT zone_card_slots_deployment_id_fkey FOREIGN KEY (deployment_id) REFERENCES zone_deployments(id);
ALTER TABLE zone_card_slots ADD CONSTRAINT zone_card_slots_card_id_fkey FOREIGN KEY (card_id) REFERENCES player_cards(id);
ALTER TABLE zone_community_snapshots ADD CONSTRAINT zone_community_snapshots_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE zone_daily_state ADD CONSTRAINT zone_daily_state_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE zone_deployments ADD CONSTRAINT zone_deployments_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE zone_deployments ADD CONSTRAINT zone_deployments_nine_id_fkey FOREIGN KEY (nine_id) REFERENCES player_nines(id);
ALTER TABLE zone_deployments ADD CONSTRAINT zone_deployments_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE zone_guild_control ADD CONSTRAINT zone_guild_control_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE zone_influence_history ADD CONSTRAINT zone_influence_history_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE zones ADD CONSTRAINT zones_school_id_fkey FOREIGN KEY (school_id) REFERENCES houses(id);
ALTER TABLE zones ADD CONSTRAINT zones_controlling_school_id_fkey FOREIGN KEY (controlling_school_id) REFERENCES houses(id);

-- ---------------------------------------------------------------------
-- INDEXES, RLS POLICIES, TRIGGERS, CHECK CONSTRAINTS
-- ---------------------------------------------------------------------
-- Not available via PostgREST. To capture these, run pg_dump with
-- DATABASE_URL set to the Supabase connection pooler, e.g.:
--   pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL"
-- or export from the Supabase Studio (Database > Schema).
