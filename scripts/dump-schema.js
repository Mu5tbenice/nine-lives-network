#!/usr/bin/env node
// Dumps the live Supabase public-schema shape to database/schema.sql by
// reading PostgREST's OpenAPI spec with the service role key.
//
// Usage:  node scripts/dump-schema.js
//
// This is NOT a true pg_dump. PostgREST exposes columns, types, defaults,
// primary keys, and foreign keys — but not indexes, RLS policies, unique
// constraints (beyond PK), check constraints, triggers, or sequence names.
// See database/README.md for the list of gaps and how to fill them.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

function quoteIdent(name) {
  return /^[a-z_][a-z0-9_]*$/.test(name)
    ? name
    : `"${name.replace(/"/g, '""')}"`;
}

function sqlType(prop) {
  // PostgREST `format` is the underlying Postgres type.
  const fmt = prop.format;
  if (!fmt) return 'text'; // rare — unknown columns
  return fmt;
}

function quoteDefault(raw, type) {
  if (raw === null || raw === undefined) return null;
  // PostgREST returns defaults as strings that are already Postgres expressions
  // (e.g. "now()", "gen_random_uuid()", "0", "''::text").
  const s = String(raw);
  if (
    /^(now\(\)|CURRENT_TIMESTAMP|gen_random_uuid\(\)|uuid_generate_v4\(\)|null|true|false)$/i.test(
      s,
    )
  )
    return s;
  if (/^-?\d+(\.\d+)?$/.test(s)) return s; // numeric literal
  if (/^'.*'(::.*)?$/.test(s)) return s; // already-quoted literal
  if (/^\w+\(.*\)$/.test(s)) return s; // function call
  // otherwise treat as string literal
  return `'${s.replace(/'/g, "''")}'`;
}

function parsePkAndFk(description = '') {
  const isPk = /<pk\s*\/?>/i.test(description);
  const fkMatch = description.match(
    /<fk\s+table=['"]([^'"]+)['"]\s+column=['"]([^'"]+)['"]\s*\/?>/i,
  );
  return {
    isPk,
    fk: fkMatch ? { table: fkMatch[1], column: fkMatch[2] } : null,
  };
}

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) {
    console.error(
      `PostgREST spec fetch failed: ${res.status} ${res.statusText}`,
    );
    process.exit(1);
  }
  const spec = await res.json();
  const definitions = spec.definitions || spec.components?.schemas || {};
  const tables = Object.keys(definitions).sort();

  const lines = [];
  lines.push(
    '-- =====================================================================',
  );
  lines.push('-- Nine Lives Network — Supabase public schema');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(
    `-- Source:    PostgREST OpenAPI spec at ${SUPABASE_URL}/rest/v1/`,
  );
  lines.push('-- Script:    scripts/dump-schema.js');
  lines.push('--');
  lines.push(
    '-- This file is a REST-introspected schema, not a true pg_dump. It contains',
  );
  lines.push(
    '-- column definitions, defaults, primary keys, and foreign key relationships.',
  );
  lines.push(
    '-- It does NOT contain: secondary indexes, RLS policies, unique constraints',
  );
  lines.push(
    '-- (beyond PKs), check constraints, triggers, or sequence names.',
  );
  lines.push('-- Regenerate with: node scripts/dump-schema.js');
  lines.push(
    '-- =====================================================================',
  );
  lines.push('');

  // --- CREATE TABLE section ---
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push(`-- TABLES (${tables.length})`);
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push('');

  const fkStatements = [];
  const pkStatements = [];

  for (const table of tables) {
    const def = definitions[table];
    const props = def.properties || {};
    const required = new Set(def.required || []);
    const colNames = Object.keys(props);

    lines.push(`CREATE TABLE ${quoteIdent(table)} (`);
    const colLines = [];
    const pkCols = [];

    for (const col of colNames) {
      const prop = props[col];
      const { isPk, fk } = parsePkAndFk(prop.description || '');
      if (isPk) pkCols.push(col);
      if (fk) {
        fkStatements.push(
          `ALTER TABLE ${quoteIdent(table)} ADD CONSTRAINT ${quoteIdent(`${table}_${col}_fkey`)} ` +
            `FOREIGN KEY (${quoteIdent(col)}) REFERENCES ${quoteIdent(fk.table)}(${quoteIdent(fk.column)});`,
        );
      }

      const parts = [`    ${quoteIdent(col)} ${sqlType(prop)}`];
      const dflt = quoteDefault(prop.default, prop.format);
      if (dflt !== null) parts.push(`DEFAULT ${dflt}`);
      if (required.has(col)) parts.push('NOT NULL');
      if (Array.isArray(prop.enum) && prop.enum.length) {
        parts.push(`/* enum: ${prop.enum.join(', ')} */`);
      }
      colLines.push(parts.join(' '));
    }

    lines.push(colLines.join(',\n'));
    lines.push(');');

    if (pkCols.length) {
      pkStatements.push(
        `ALTER TABLE ${quoteIdent(table)} ADD CONSTRAINT ${quoteIdent(`${table}_pkey`)} ` +
          `PRIMARY KEY (${pkCols.map(quoteIdent).join(', ')});`,
      );
    }
    lines.push('');
  }

  // --- PRIMARY KEYS ---
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push(`-- PRIMARY KEYS (${pkStatements.length})`);
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push('');
  for (const s of pkStatements) lines.push(s);
  lines.push('');

  // --- FOREIGN KEYS ---
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push(`-- FOREIGN KEYS (${fkStatements.length})`);
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push('');
  for (const s of fkStatements) lines.push(s);
  lines.push('');

  // --- NOT EXPOSED BY POSTGREST ---
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push('-- INDEXES, RLS POLICIES, TRIGGERS, CHECK CONSTRAINTS');
  lines.push(
    '-- ---------------------------------------------------------------------',
  );
  lines.push(
    '-- Not available via PostgREST. To capture these, run pg_dump with',
  );
  lines.push('-- DATABASE_URL set to the Supabase connection pooler, e.g.:');
  lines.push(
    '--   pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL"',
  );
  lines.push('-- or export from the Supabase Studio (Database > Schema).');
  lines.push('');

  const outPath = path.join(__dirname, '..', 'database', 'schema.sql');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(
    `Wrote ${outPath} (${tables.length} tables, ${pkStatements.length} PKs, ${fkStatements.length} FKs)`,
  );
}

main().catch((e) => {
  console.error('Dump failed:', e);
  process.exit(1);
});
