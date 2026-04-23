// ══════════════════════════════════════════════════════════════════════
// server/services/chronicleJobLog.js
//
// §9.78 — persistent logger for Chronicle scheduler runs. Replaces the
// in-memory jobLog that vaporized on every restart and hid 6+ weeks of
// silent failures (V4 engine stopped posting 2026-03-10; V2 never
// successfully posted — chronicle_acts still has 0 rows).
//
// Missing-table tolerance: if the chronicle_job_log table hasn't been
// migrated yet, we latch `_tableMissing` after the first 42P01 so we
// don't log-spam; cron jobs continue normally.
//
// Usage from scheduler.js or from admin routes:
//   const chronicleJobLog = require('./chronicleJobLog');
//   await chronicleJobLog.record({
//     job_name: 'chronicle_act1',
//     status: 'success',
//     duration_ms: elapsed,
//     tweet_id: tid,
//     act_num: 1,
//   });
//   // or on error:
//   await chronicleJobLog.record({
//     job_name: 'chronicle_act1',
//     status: 'error',
//     error_message: e.message,
//     error_code: e.code || null,
//     act_num: 1,
//   });
// ══════════════════════════════════════════════════════════════════════
'use strict';

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let _tableMissing = false;

async function record({
  job_name,
  status,
  duration_ms = null,
  tweet_id = null,
  error_message = null,
  error_code = null,
  act_num = null,
  metadata = null,
}) {
  if (_tableMissing) return { skipped: true };
  if (!job_name || !status) return { error: 'job_name and status required' };
  try {
    const { error } = await supabaseAdmin.from('chronicle_job_log').insert({
      job_name,
      status,
      duration_ms,
      tweet_id,
      error_message: error_message ? String(error_message).slice(0, 2000) : null,
      error_code: error_code ? String(error_code).slice(0, 64) : null,
      act_num,
      metadata,
    });
    if (error) {
      if (
        error.code === '42P01' ||
        /relation .* does not exist/i.test(error.message || '')
      ) {
        _tableMissing = true;
        console.warn(
          '[§9.78] chronicle_job_log table missing — run the migration (see database/schema.sql). Suppressing further writes until restart.',
        );
        return { skipped: true, reason: 'table_missing' };
      }
      console.error('[chronicleJobLog] insert error:', error.message);
      return { error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('[chronicleJobLog] unexpected:', e.message);
    return { error: e.message };
  }
}

/** Read recent runs for the health endpoint. */
async function recent({ job_name = null, limit = 20 } = {}) {
  if (_tableMissing) return [];
  try {
    let q = supabaseAdmin
      .from('chronicle_job_log')
      .select('id, job_name, status, run_at, duration_ms, tweet_id, error_message, error_code, act_num')
      .order('run_at', { ascending: false })
      .limit(limit);
    if (job_name) q = q.eq('job_name', job_name);
    const { data, error } = await q;
    if (error) {
      if (error.code === '42P01') {
        _tableMissing = true;
        return [];
      }
      return [];
    }
    return data || [];
  } catch (e) {
    return [];
  }
}

/** Latest SUCCESS per job_name, for the health endpoint. */
async function latestSuccessPerJob() {
  if (_tableMissing) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('chronicle_job_log')
      .select('job_name, run_at, tweet_id, act_num')
      .eq('status', 'success')
      .order('run_at', { ascending: false });
    if (error) {
      if (error.code === '42P01') { _tableMissing = true; return []; }
      return [];
    }
    const seen = new Set();
    const latest = [];
    for (const row of data || []) {
      if (seen.has(row.job_name)) continue;
      seen.add(row.job_name);
      latest.push(row);
    }
    return latest;
  } catch (e) {
    return [];
  }
}

module.exports = { record, recent, latestSuccessPerJob };
