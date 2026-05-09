import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// /api/automation/analysis
//
// Dedicated route for the GHG Copilot Analysis Agent (Agent 2).
// Calls N8N_ANALYSIS_WEBHOOK — a separate webhook in n8n that goes
// directly to the Analysis Agent pipeline, with no Intent Router needed.
//
// N8N_AUTOMATION_WEBHOOK → Agent 1 (bill processing, file extraction)
// N8N_ANALYSIS_WEBHOOK   → Agent 2 (retrieve, compare, explain, benchmark)
// ─────────────────────────────────────────────────────────────────────────────

const N8N_WEBHOOK_URL = process.env.N8N_ANALYSIS_WEBHOOK || process.env.N8N_AUTOMATION_WEBHOOK;

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_AUTOMATION_SUPABASE_URL,
    process.env.AUTOMATION_SUPABASE_SERVICE_KEY
  );

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function logMessage(session_id, role, content) {
  try {
    await getSupabase()
      .from('messages')
      .insert({ session_id, role, content });
  } catch (e) {
    console.warn('[analysis] Failed to log message:', e.message);
  }
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

// Call n8n with exponential back-off (handles 429 / rate-limit)
async function callN8N(payload, maxRetries = 3) {
  let delay = 1000; // start at 1s — agent 2 is analysis-only, rate limits are rare
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000); // 55s hard timeout
      const res = await fetch(N8N_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  controller.signal,
      });
      clearTimeout(timeout);

      const raw = await res.text();

      if (!raw?.trim()) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        return null;
      }

      if (
        raw.includes('rate limit') ||
        raw.includes('Rate limit') ||
        raw.includes('"429"') ||
        res.status === 429
      ) {
        console.warn(`[analysis] Rate limit — waiting ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
      }

      try { return JSON.parse(raw); } catch { return { raw }; }

    } catch (e) {
      console.error(`[analysis] Fetch error attempt ${attempt}:`, e.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!N8N_WEBHOOK_URL) {
    return res.status(500).json({ error: 'N8N_AUTOMATION_WEBHOOK not configured' });
  }

  // ── Parse JSON body ────────────────────────────────────────────────────────
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const {
    session_id: rawSessionId,
    message,
    user_id,
    company_id,
  } = body;

  if (!rawSessionId || !message?.trim()) {
    return res.status(400).json({ error: 'Missing session_id or message' });
  }

  // session_id passed as-is — Webhook 2 goes directly to the Analysis Agent,
  // no Intent Router, no prefix enforcement needed.
  const session_id = rawSessionId;

  await logMessage(session_id, 'user', message.trim());

  // ── Call n8n Analysis webhook directly ────────────────────────────────────
  const payload = {
    session_id,
    message:    message.trim(),
    user_id:    user_id    ?? null,
    company_id: company_id ?? null,
  };

  const result = await callN8N(payload);

  if (!result) {
    return res.status(500).json({
      error: 'n8n returned an empty response after retries. Is the workflow activated?',
    });
  }

  // Extract the text response — n8n Analysis Agent returns { message, output, ... }
  const agentMessage =
    result?.message  ??
    result?.output   ??
    result?.text     ??
    (typeof result?.raw === 'string' ? result.raw : null);

  if (!agentMessage) {
    console.error('[analysis] Unexpected n8n response shape:', JSON.stringify(result).slice(0, 300));
    return res.status(502).json({
      error: 'Unexpected response format from n8n',
      raw:   JSON.stringify(result).slice(0, 500),
    });
  }

  await logMessage(session_id, 'agent', agentMessage);

  // ── Return structured response ─────────────────────────────────────────────
  return res.status(200).json({
    message:     agentMessage,
    answer_type: result?.answer_type ?? 'analysis',
    session_id,
    status:      result?.status      ?? 'complete',
    // Pass through any structured results the agent generated
    results:     result?.results     ?? null,
  });
}
