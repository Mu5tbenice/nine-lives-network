const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in your environment.');
  process.exit(1);
}

// Regular client (respects RLS - for public reads)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (bypasses RLS - for server-side writes)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback to regular client if no service key

if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - using anon key for admin operations');
}

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;