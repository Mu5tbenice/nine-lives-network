# database/

## `schema.sql`

A reconstruction of the live Supabase `public` schema for Nine Lives Network. It contains every table, column type, default, primary key, and foreign key relationship. It is the local, checked-in reference for the database shape.

### What it is *not*

`schema.sql` is not a full `pg_dump`. It is introspected from PostgREST's OpenAPI spec using the service role key, which does **not** expose:

- Secondary indexes (beyond primary keys)
- Row Level Security policies
- Unique constraints beyond primary keys
- Check constraints
- Triggers and functions
- Sequence ownership / explicit sequence definitions
- Enum types (columns with enums appear as `text` with a `/* enum: ... */` comment)

For a faithful schema dump of the above, run `pg_dump --schema-only` directly against the Supabase Postgres connection pooler, or export from Supabase Studio under *Database → Schema*.

## How to regenerate

```bash
node scripts/dump-schema.js
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Writes to `database/schema.sql`. Safe to run anytime — it's read-only against the database (just reads the OpenAPI spec at `/rest/v1/`).

The script is at `scripts/dump-schema.js`. Limitations of the approach are inlined as a comment block at the top of each generated `schema.sql`.

## `seeds/`

Initial data for the game. These are applied once when bootstrapping a new Supabase project:

- `schools.sql` — the nine houses/schools with their base stats
- `spells.sql` — the spell/card catalog
- `zones.sql` — the initial territory map

Apply via Supabase Studio (SQL editor) or `psql` against `$DATABASE_URL`.
