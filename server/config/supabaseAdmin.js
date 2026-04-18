// server/config/supabaseAdmin.js
// Supabase client with service role key — bypasses RLS for server-side writes
// Used by: packSystem.js, and any route that needs to write to protected tables

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

module.exports = supabaseAdmin;
