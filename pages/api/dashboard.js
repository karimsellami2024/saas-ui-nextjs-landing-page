import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id: userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  // 1. Get user's company
  const { data: userProfile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (profileErr || !userProfile?.company_id) {
    return res.status(404).json({ error: "No company found for this user" });
  }
  const companyId = userProfile.company_id;

  // 2. Get all postes for this company
  const { data: postes, error: posteErr } = await supabase
    .from('postes')
    .select('id, num, label')
    .eq('company_id', companyId);

  if (posteErr) {
    return res.status(500).json({ error: posteErr.message });
  }
  if (!postes || postes.length === 0) {
    return res.status(404).json({ error: "No postes found for this company" });
  }

  const posteIdMap = new Map(postes.map(p => [p.id, p]));

  // 3. Get all sources for these postes (in one query)
  const posteIds = postes.map(p => p.id);
  const { data: sources, error: sourceErr } = await supabase
    .from('poste_sources')
    .select('poste_id, results, enabled')
    .in('poste_id', posteIds);

  if (sourceErr) {
    return res.status(500).json({ error: sourceErr.message });
  }

  // 4. Aggregate per poste
  let total_tCO2eq = 0, total_co2 = 0, total_ch4 = 0, total_n2o = 0, total_ges = 0;
  const posteResultsMap = {};

  for (const s of sources || []) {
    if (!s.enabled) continue;
    const poste = posteIdMap.get(s.poste_id);
    if (!poste) continue;
    if (!posteResultsMap[poste.id]) {
      posteResultsMap[poste.id] = {
        poste: poste.num,
        label: poste.label || `Poste ${poste.num}`,
        tCO2eq: 0,
        co2: 0,
        ch4: 0,
        n2o: 0,
        ges: 0,
      };
    }
    const src = Array.isArray(s.results) && s.results.length > 0 ? s.results[0] : (s.results || {});
    if (src.total_ges_tco2e !== undefined) {
      posteResultsMap[poste.id].tCO2eq += parseFloat(String(src.total_ges_tco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    }
    if (src.total_co2_gco2e !== undefined) {
      posteResultsMap[poste.id].co2 += parseFloat(String(src.total_co2_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    }
    if (src.total_ges_ch4_gco2e !== undefined) {
      posteResultsMap[poste.id].ch4 += parseFloat(String(src.total_ges_ch4_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    }
    if (src.total_ges_n2o_gco2e !== undefined) {
      posteResultsMap[poste.id].n2o += parseFloat(String(src.total_ges_n2o_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    }
    if (src.total_ges_gco2e !== undefined) {
      posteResultsMap[poste.id].ges += parseFloat(String(src.total_ges_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    }
  }

  // Convert map to array and calculate totals
  const posteResults = Object.values(posteResultsMap).map(row => {
    row.tCO2eq = +row.tCO2eq.toFixed(2);
    row.co2 = +row.co2.toFixed(2);
    row.ch4 = +row.ch4.toFixed(2);
    row.n2o = +row.n2o.toFixed(2);
    row.ges = +row.ges.toFixed(2);

    total_tCO2eq += row.tCO2eq;
    total_co2 += row.co2;
    total_ch4 += row.ch4;
    total_n2o += row.n2o;
    total_ges += row.ges;
    return row;
  });

  // Compute percent for each poste
  posteResults.forEach((row) => {
    row.percent = total_tCO2eq > 0 ? +(100 * row.tCO2eq / total_tCO2eq).toFixed(1) : 0;
  });

  // RETURN company_id in payload
  return res.status(200).json({
    company_id: companyId,
    poste_results: posteResults,
    total_tCO2eq: +total_tCO2eq.toFixed(2),
    co2: +total_co2.toFixed(2),
    ch4: +total_ch4.toFixed(2),
    n2o: +total_n2o.toFixed(2),
    ges: +total_ges.toFixed(2),
    summary: {
      total_tCO2eq: +total_tCO2eq.toFixed(2),
      co2: +total_co2.toFixed(2),
      ch4: +total_ch4.toFixed(2),
      n2o: +total_n2o.toFixed(2),
      ges: +total_ges.toFixed(2),
    }
  });
}
