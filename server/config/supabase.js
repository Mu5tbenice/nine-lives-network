const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;