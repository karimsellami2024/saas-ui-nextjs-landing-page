import { IncomingForm } from 'formidable';
import { promises as fsPromises } from 'fs';
import { createClient } from '@supabase/supabase-js';

const N8N_WEBHOOK_URL = process.env.N8N_AUTOMATION_WEBHOOK;

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_AUTOMATION_SUPABASE_URL,
    process.env.AUTOMATION_SUPABASE_SERVICE_KEY
  );

export const config = { api: { bodyParser: false } };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function logMessage(session_id, role, content) {
  try { await getSupabase().from('messages').insert({ session_id, role, content }); }
  catch (e) { console.warn('[automation] Failed to log message:', e.message); }
}

// Fetch structured bill data from Supabase (saved by n8n Save Bill tool)
async function fetchBillResult(session_id) {
  try {
    const { data, error } = await getSupabase()
      .from('bills').select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(1).single();
    if (error || !data) return null;
    return data;
  } catch (e) { return null; }
}

// ─── French month names → zero-padded month numbers ──────────────────────────
const FR_MONTHS = {
  janvier:'01', février:'02', fevrier:'02', mars:'03', avril:'04',
  mai:'05', juin:'06', juillet:'07', août:'08', aout:'08',
  septembre:'09', octobre:'10', novembre:'11', décembre:'12', decembre:'12',
};

// ─── Bill type display name (FR/EN) → schema key ─────────────────────────────
const BILL_TYPE_KEYS = {
  'gaz naturel':'natural_gas', 'natural gas':'natural_gas', 'gaz':'natural_gas',
  'électricité':'electricity', 'electricite':'electricity', 'electricity':'electricity',
  'hydro':'electricity',
  'carburant':'fuel', 'fuel':'fuel', 'diesel':'fuel', 'essence':'gasoline',
  'gasoline':'gasoline', 'propane':'propane', 'mazout':'fuel_oil', 'fuel oil':'fuel_oil',
  'frigorigène':'refrigerant', 'frigorigene':'refrigerant',
  'refrigerant':'refrigerant', 'réfrigérant':'refrigerant', 'refrigerant':'refrigerant',
  'autre':'other', 'other':'other',
};

// Parse a date string that may be ISO, French ("15 janvier 2026"), or slash-separated
function parseDateStr(str) {
  if (!str) return null;
  const s = str.replace(/\*/g, '').trim();
  // ISO YYYY-MM-DD
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // French: "15 janvier 2026"
  const fr = s.match(/(\d{1,2})\s+([a-zéûàèù]+)\s+(\d{4})/i);
  if (fr) {
    const m = FR_MONTHS[fr[2].toLowerCase()];
    if (m) return `${fr[3]}-${m}-${fr[1].padStart(2, '0')}`;
  }
  // Slash/dash: YYYY/MM/DD
  const sl = s.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (sl) return `${sl[1]}-${sl[2].padStart(2, '0')}-${sl[3].padStart(2, '0')}`;
  return null;
}

// Normalize a bill type string (French or English display) to the schema enum key
function normalizeBillType(str) {
  if (!str) return null;
  const clean = str.replace(/\*/g, '').trim().toLowerCase();
  return BILL_TYPE_KEYS[clean] || clean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse structured data from any agent text output.
// Handles three formats the agent produces:
//   1. English markdown: "**Bill Type:** Gaz naturel\n**Total GHG Emissions (tCO2e):** 10.42 tCO2e"
//   2. Pipe format:      "**Type:** R-22 | **Charge:** 0.99 kg | **GWP:** 1810 | **Émissions:** 0.09 tCO₂e"
//   3. French markdown:  "**Type de facture:** Gaz naturel\n**Total GES:** 10.42 tCO2e"
// ─────────────────────────────────────────────────────────────────────────────
function parseResultsFromMessage(message) {
  if (!message || typeof message !== 'string') return null;

  // Field extractor — strips ** markers, stops at pipe | or newline
  // Handles: **Label (extra):** **value**  |  Label: value  |  - **Label:** value
  const field = (label) => {
    const p = new RegExp('(?:' + label + ')[^:\\n|]*:[*\\s]*([^\\n|]+)', 'i');
    const m = message.match(p);
    if (!m || m[1] == null) return null;
    return m[1].replace(/\*/g, '').trim() || null;
  };

  // Number parser — extracts the FIRST numeric token, ignoring trailing units
  // "10,415,800 gCO2e" → 10415800   "57,835.1 kWh" → 57835.1   "0.09 tCO₂e" → 0.09
  const num = (s) => {
    if (s == null) return null;
    // Strip leading ** markers, then grab first number-like token (stops before space/letters)
    const stripped = String(s).replace(/^\s*\*+\s*/, '');
    const match = stripped.match(/(-?[\d,]+\.?\d*|-?\d*\.\d+)/);
    if (!match) return null;
    const clean = match[1]
      .replace(/,(?=\d{3}(?:[,.]|$))/g, '')  // thousands: "10,415,800" → "10415800"
      .replace(',', '.');                      // decimal comma: "0,09" → "0.09"
    const v = parseFloat(clean);
    return isNaN(v) ? null : v;
  };

  const numField = (label) => num(field(label));

  // ── GHG totals — English labels first, then French, then pipe format ────────
  const tco2e =
    numField('Total GHG Emissions') ??
    numField('Total GES') ??
    numField('[ÉE]missions') ??
    numField('Emissions');

  const co2g =
    numField('Total CO2 Emissions') ??
    numField('Total CO2');

  const kwh =
    numField('Energy Equivalent') ??
    numField('[ÉE]nergie [eé]quivalente');

  // ── Consumption — extract number and unit from value or separate unit field ──
  const consRaw =
    field('Consumption Value') ||
    field('Consommation totale') ||
    field('Consommation');

  const consUnitField =
    field('Consumption Unit') ||
    field('Unit[eé]');

  const consNum  = consRaw ? num(consRaw) : null;
  const consUnit =
    consUnitField ||
    (consRaw ? (consRaw.match(/m[³3]|kWh|GJ|MWh|L\b|kg\b/i) || [])[0] : null) ||
    null;

  // ── Bill metadata ──────────────────────────────────────────────────────────
  const province =
    field('Province') || null;

  const billTypeRaw =
    field('Bill Type') ||
    field('Type de facture') ||
    field('Type de facturation') ||
    null;
  const bill_type = normalizeBillType(billTypeRaw);

  const provider =
    field('Provider') ||
    field('Fournisseur') ||
    null;

  // Bill date — handle ISO, French month names, slash formats
  const billDateRaw =
    field('Bill Date') ||
    field('Date de facturation') ||
    field('Date');
  const bill_date =
    parseDateStr(billDateRaw) ||
    parseDateStr((message.match(/\d{1,2}\s+[a-zéûàèù]+\s+\d{4}/i) || [])[0]) ||
    parseDateStr((message.match(/\d{4}[-/]\d{2}[-/]\d{2}/) || [])[0]) ||
    null;

  // ── Extended metadata (for form prefill) ──────────────────────────────────
  const meter_number =
    field('Meter Number') ||
    field('Num[eé]ro de compteur') ||
    field('Compteur') ||
    field('Account Number') ||
    field('Account') ||
    null;

  const address =
    field('Service Address') ||
    field('Address') ||
    field('Adresse de service') ||
    field('Adresse') ||
    null;

  const equipment_name =
    field('Equipment') ||
    field('[ÉE]quipement') ||
    field('Appliance') ||
    field('System') ||
    null;

  const site_name =
    field('Site') ||
    field('Location') ||
    field('Emplacement') ||
    field('Lieu') ||
    null;

  const fuel_sub_type =
    field('Fuel Type') ||
    field('Type de carburant') ||
    field('Type de combustible') ||
    null;

  const billing_period =
    field('Billing Period') ||
    field('[Pp][eé]riode de facturation') ||
    field('[Pp][eé]riode') ||
    null;

  // ── Refrigerant fields ─────────────────────────────────────────────────────
  // For pipe format (**Type:** R-22), use a specific pattern that requires
  // Type to appear at the start of the string or after a | separator,
  // preventing it from matching "Bill Type" or "Type de facture".
  const pipeTypeMatch = message.match(/(?:^|\|)\s*\*?\*?Type\*?\*?:\s*\*?\*?([^|*\n,]+)/i);
  const pipeTypeVal   = pipeTypeMatch ? pipeTypeMatch[1].replace(/\*/g, '').trim() || null : null;

  const refrigerant_type =
    field('Refrigerant Type') ||
    field('Type.*frigorigène') ||
    field('[Rr]éfrigérant') ||
    field('Frigorigène') ||
    pipeTypeVal ||              // pipe: **Type:** R-22 (NOT **Bill Type:** ...)
    null;

  const charge_kg =
    numField('Charge') ||       // labeled: **Charge:** 0.99 kg  OR  **Charge (kg):** 0.99
    numField('Quantité.*frigorigène') ||
    null;

  const gwp =
    numField('GWP') ||
    numField('PRG') ||
    null;

  // Return null if nothing useful was extracted
  if (tco2e === null && co2g === null && consNum === null && charge_kg === null) return null;

  return {
    total_ges_tco2e:         tco2e,
    total_co2_gco2e:         co2g,
    energie_equivalente_kwh: kwh,
    consumption_value:       consNum,
    consumption_unit:        consUnit,
    province,
    bill_type,
    provider,
    bill_date,
    meter_number,
    address,
    equipment_name,
    site_name,
    fuel_sub_type,
    billing_period,
    refrigerant_type,
    charge_kg,
    gwp,
  };
}

// Detect incomplete response — agent extracted but hasn't calculated yet
function isExtractionOnly(result) {
  if (result && typeof result === 'object') {
    // JSON Schema output: status partial + no GES value
    if (result.status === 'partial' && !result.total_ges_tco2e) return true;
  }
  const message = typeof result === 'string' ? result : result?.message;
  if (!message) return false;
  // Has GHG result in any format → complete
  if (/Total GHG Emissions|Total GES|tCO2e|tCO₂e/i.test(message)) return false;
  // Agent announced it will calculate but hasn't yet
  return /vais.*calculer|vais.*proc[eé]der|vais maintenant|calculer.*[eé]missions|proc[eé]der au calcul/i.test(message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalize n8n response — handles 3 shapes:
//   • [{output: "{JSON string}"}]  → parse output as JSON, merge to top level
//   • [{output: "markdown text"}]  → set as message for regex parsing
//   • {message:"...", ...}         → pass through as-is
// ─────────────────────────────────────────────────────────────────────────────
function normalizeN8NResult(result) {
  if (!result) return null;

  // Unwrap array
  if (Array.isArray(result)) result = result[0];
  if (!result) return null;

  if (result.output && typeof result.output === 'string') {
    const trimmed = result.output.trim();
    // JSON output (from LLM JSON Schema or structured agent)
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return { ...result, ...parsed };
      } catch {}
    }
    // Plain text / markdown — expose as message for regex parser
    if (!result.message) {
      return { ...result, message: result.output };
    }
  }

  return result;
}

// Call n8n with a plain text message (follow-up / retry)
async function callN8N(session_id, message) {
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, message }),
  });
  const raw = await res.text();
  if (!raw?.trim()) return null;
  try { return normalizeN8NResult(JSON.parse(raw)); } catch { return null; }
}

// Call n8n with exponential backoff on rate limit errors (429 / "rate limit" in body)
async function callN8NWithBackoff(payload, maxRetries = 3) {
  let delay = 5000; // start at 5s
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      if (!raw?.trim()) {
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, delay)); delay *= 2; continue; }
        return null;
      }
      // Check if n8n itself returned a rate-limit error from OpenAI
      if (raw.includes('rate limit') || raw.includes('Rate limit') || raw.includes('429')) {
        console.warn(`[automation] Rate limit hit, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, delay)); delay *= 2; continue; }
      }
      try { return normalizeN8NResult(JSON.parse(raw)); } catch { return { raw }; }
    } catch (e) {
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, delay)); delay *= 2; }
    }
  }
  return null;
}

// If total_ges_tco2e is a suspiciously round integer (agent rounding artefact) but
// total_co2_gco2e is available and precise, recompute tco2e from gco2e / 1_000_000.
// Example: agent says "2 tCO₂e" but co2g = 1 350 291.2 → correct answer is 1.3503 tCO₂e.
function fixRoundedTco2e(obj) {
  if (!obj) return obj;
  const tco2e = obj.total_ges_tco2e;
  const co2g  = obj.total_co2_gco2e;
  if (co2g != null && co2g > 0 && tco2e != null && Number.isInteger(tco2e)) {
    const derived = co2g / 1_000_000;
    // Only replace if the derived value is meaningfully different (> 5 % off)
    if (Math.abs(derived - tco2e) / Math.max(Math.abs(tco2e), 1e-9) > 0.05) {
      return { ...obj, total_ges_tco2e: Math.round(derived * 1e6) / 1e6 };
    }
  }
  return obj;
}

// Build final result: LLM structured fields > Supabase row > regex parse from message
async function buildResult(session_id, result) {
  const fromDb = await fetchBillResult(session_id);

  // Extract LLM-structured fields (present after normalizeN8NResult parses the output string)
  const LLM_FIELDS = [
    'total_ges_tco2e','total_co2_gco2e','energie_equivalente_kwh',
    'consumption_value','consumption_unit','bill_type','province',
    'provider','bill_date',
    'meter_number','address','equipment_name','site_name','fuel_sub_type','billing_period',
    'refrigerant_type','charge_kg','gwp','status',
  ];
  const fromLLM = {};
  LLM_FIELDS.forEach(k => {
    const v = result?.[k];
    // Skip zeros and empty strings from schema required fields (non-applicable)
    if (v !== undefined && v !== null && v !== '' && v !== 0) fromLLM[k] = v;
  });

  // Fallback: regex parse from message text (legacy)
  const fromMsg = parseResultsFromMessage(result?.message);

  // Priority: LLM structured > DB authoritative numbers > regex parse
  const base = { ...fromMsg, ...fromLLM };
  let merged;
  if (fromDb) {
    merged = { ...base, ...fromDb }; // DB wins for fields it has
  } else {
    merged = Object.keys(base).length ? base : null;
  }

  // Correct any integer-rounded tco2e using the precise gco2e value
  return fixRoundedTco2e(merged);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!N8N_WEBHOOK_URL)      return res.status(500).json({ error: 'N8N_AUTOMATION_WEBHOOK not set' });

  const contentType = req.headers['content-type'] || '';

  // ── JSON body (file as base64 or plain text message) ───────────────────────
  if (contentType.includes('application/json')) {
    let body;
    try { body = await readJsonBody(req); }
    catch { return res.status(400).json({ error: 'Invalid JSON body' }); }

    const { session_id, message, user_id, company_id, company_name,
            file_base64, file_mime, file_name,
            auto_calculate, bill_type, province, fuel_type } = body;

    if (!session_id || !message) return res.status(400).json({ error: 'Missing session_id or message' });

    await logMessage(session_id, 'user', message);

    // Upload file to Supabase Storage if present, get public URL
    let file_url = null;
    if (file_base64 && file_name) {
      try {
        const supabase = getSupabase();
        const fileBuffer = Buffer.from(file_base64, 'base64');
        const storagePath = `${session_id}/${Date.now()}-${file_name}`;
        const { error: uploadError } = await supabase.storage
          .from('bill-files')
          .upload(storagePath, fileBuffer, { contentType: file_mime || 'application/octet-stream', upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('bill-files').getPublicUrl(storagePath);
          file_url = publicUrl;
        } else {
          console.error('[automation] Storage upload error:', uploadError.message);
        }
      } catch (e) { console.error('[automation] Storage error:', e.message); }
    }

    // ── Call n8n (with retry on empty response) ────────────────────────────
    const payload = { session_id, message, user_id, company_id, company_name,
                      file_url, file_mime, file_name,
                      auto_calculate, bill_type, province, fuel_type };

    // Call n8n with automatic backoff on rate-limit errors
    let result = await callN8NWithBackoff(payload);
    if (!result) return res.status(500).json({ error: 'n8n returned empty response after retries. Is the workflow activated?' });

    await logMessage(session_id, 'agent', result?.message || '');

    // FIX 2: If agent only extracted (didn't calculate), auto-send follow-up
    if (isExtractionOnly(result)) {
      console.log('[automation] Extraction-only response detected, sending follow-up...');
      const followUp = await callN8N(
        session_id,
        'Calcule maintenant les émissions GES et sauvegarde dans Supabase. Ne pose pas de questions.'
      );
      if (followUp?.message && !isExtractionOnly(followUp)) {
        // FIX 3: Merge extraction info + calculation results
        const extractionData = parseResultsFromMessage(result.message); // has province/provider/consumption
        const calcData       = parseResultsFromMessage(followUp.message); // has GES values
        // Merge: keep all non-null values from both; calc wins on GES fields
        const merged = { ...extractionData, ...Object.fromEntries(Object.entries(calcData || {}).filter(([, v]) => v !== null)) };
        const fromDb = await fetchBillResult(session_id);
        return res.status(200).json({
          ...followUp,
          results: fromDb ? { ...merged, ...fromDb } : (Object.keys(merged).length ? merged : null),
        });
      }
      // Follow-up also failed — use whatever we have
      result = followUp || result;
    }

    const billResults = await buildResult(session_id, result);
    return res.status(200).json({ ...result, results: billResults });
  }

  // ── Multipart file upload ──────────────────────────────────────────────────
  const parseForm = () =>
    new Promise((resolve, reject) => {
      const form = new IncomingForm({ keepExtensions: true, uploadDir: require('os').tmpdir(), multiples: false });
      form.parse(req, (err, fields, files) => { if (err) return reject(err); resolve({ fields, files }); });
    });

  try {
    const { fields, files } = await parseForm();
    const getField = f => Array.isArray(f) ? f[0] : f;

    const session_id = getField(fields.session_id);
    const user_id    = getField(fields.user_id);
    const company_id = getField(fields.company_id);

    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    let fileEntry = files.file;
    if (!fileEntry) return res.status(400).json({ error: 'No file uploaded' });
    if (Array.isArray(fileEntry)) fileEntry = fileEntry[0];

    const fileBuffer   = await fsPromises.readFile(fileEntry.filepath);
    const file_mime    = fileEntry.mimetype || 'application/octet-stream';
    const file_name    = fileEntry.originalFilename || fileEntry.newFilename;
    const storagePath  = `${session_id}/${Date.now()}-${file_name}`;

    const supabase = getSupabase();
    const { error: uploadError } = await supabase.storage
      .from('bill-files').upload(storagePath, fileBuffer, { contentType: file_mime, upsert: true });

    await fsPromises.unlink(fileEntry.filepath).catch(() => {});
    if (uploadError) return res.status(500).json({ error: 'Storage upload failed', detail: uploadError.message });

    const { data: { publicUrl: file_url } } = supabase.storage.from('bill-files').getPublicUrl(storagePath);

    const userMessage = `Voici ma facture : ${file_name}`;
    await logMessage(session_id, 'user', userMessage);

    const payload = { session_id, message: userMessage, file_url, file_mime, file_name, user_id, company_id };

    let result = await callN8NWithBackoff(payload);
    if (!result) return res.status(500).json({ error: 'n8n returned empty response after retries. Is the workflow activated?' });

    await logMessage(session_id, 'agent', result?.message || '');

    // Auto follow-up for extraction-only
    if (isExtractionOnly(result)) {
      const followUp = await callN8N(session_id, 'Calcule maintenant les émissions GES et sauvegarde dans Supabase. Ne pose pas de questions.');
      if (followUp?.message && !isExtractionOnly(followUp)) {
        const extractionData2 = parseResultsFromMessage(result.message);
        const calcData2       = parseResultsFromMessage(followUp.message);
        const merged = { ...extractionData2, ...Object.fromEntries(Object.entries(calcData2 || {}).filter(([, v]) => v !== null)) };
        const fromDb = await fetchBillResult(session_id);
        return res.status(200).json({ ...followUp, results: fromDb ? { ...merged, ...fromDb } : merged });
      }
      result = followUp || result;
    }

    const billResults = await buildResult(session_id, result);
    return res.status(200).json({ ...result, results: billResults });

  } catch (err) {
    console.error('[automation/process-bill] Error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
