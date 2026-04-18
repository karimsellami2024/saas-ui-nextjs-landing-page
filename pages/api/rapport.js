import { supabase } from '../../lib/supabaseClient';

const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const pick = (results) => {
  if (Array.isArray(results)) return results[0] || {};
  return results || {};
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id: userId, bilan_id: bilanId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (!profile?.company_id) return res.status(404).json({ error: 'No company' });
  const companyId = profile.company_id;

  const { data: company } = await supabase
    .from('companies')
    .select('name, fiscal_year_start, fiscal_year_end')
    .eq('id', companyId)
    .single();

  const { data: postes } = await supabase
    .from('postes')
    .select('id, num')
    .eq('company_id', companyId);

  const posteIds = (postes || []).map((p) => p.id);

  // One row per (poste_id, source_code) — filter by bilan_id if provided
  let sourcesQuery = supabase
    .from('poste_sources')
    .select('source_code, results, enabled')
    .in('poste_id', posteIds);
  if (bilanId) {
    sourcesQuery = sourcesQuery.eq('submission_id', bilanId);
  }
  const { data: sources } = await sourcesQuery;

  // Aggregate per source_code
  const byCode = {};
  for (const s of sources || []) {
    if (!s.enabled) continue;
    const code = s.source_code;
    if (!code) continue;
    const src = pick(s.results);

    if (!byCode[code]) byCode[code] = { co2: 0, ch4: 0, n2o: 0, total: 0 };
    byCode[code].total += toNum(src.total_ges_tco2e);
    // gas component fields are stored in gCO2e → convert to tCO2e
    byCode[code].co2   += toNum(src.total_co2_gco2e)   / 1_000_000;
    byCode[code].ch4   += toNum(src.total_ges_ch4_gco2e) / 1_000_000;
    byCode[code].n2o   += toNum(src.total_ges_n2o_gco2e) / 1_000_000;
  }

  // Round
  for (const k of Object.keys(byCode)) {
    const r = byCode[k];
    r.co2   = +r.co2.toFixed(2);
    r.ch4   = +r.ch4.toFixed(2);
    r.n2o   = +r.n2o.toFixed(2);
    r.total = +r.total.toFixed(2);
  }

  const grandTotal = Object.values(byCode).reduce((acc, r) => acc + r.total, 0);
  const grandCo2   = Object.values(byCode).reduce((acc, r) => acc + r.co2, 0);
  const grandCh4   = Object.values(byCode).reduce((acc, r) => acc + r.ch4, 0);
  const grandN2o   = Object.values(byCode).reduce((acc, r) => acc + r.n2o, 0);

  return res.status(200).json({
    company: company ?? {},
    by_source_code: byCode,
    totals: {
      co2:   +grandCo2.toFixed(2),
      ch4:   +grandCh4.toFixed(2),
      n2o:   +grandN2o.toFixed(2),
      total: +grandTotal.toFixed(2),
    },
  });
}
