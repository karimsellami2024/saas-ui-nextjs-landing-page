import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id: userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  // 1. Find the latest submission for this user
  let { data: submissions, error: subErr } = await supabase
    .from('submissions')
    .select('id, reporting_year, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) // Most recent first
    .limit(1);

  if (subErr) {
    return res.status(500).json({ error: subErr.message });
  }
  if (!submissions || submissions.length === 0) {
    return res.status(404).json({ error: "No submission found for this user" });
  }
  const submission = submissions[0];

  // 2. Fetch all postes for this submission (poste_num, label, results)
  let { data: postes, error: posteErr } = await supabase
    .from('postes')
    .select('poste_num, poste_label, results')
    .eq('submission_id', submission.id);

  if (posteErr) {
    return res.status(500).json({ error: posteErr.message });
  }

  // 3. Map poste results for dashboard
  // Try to read tCO2eq from several possible fields (flat or in array)
  const posteResults = (postes || []).map((p) => {
    let tCO2eq;
    // Case 1: results is an array with total_ges_tco2e on first object
    if (Array.isArray(p.results) && p.results.length > 0 && p.results[0]?.total_ges_tco2e) {
      tCO2eq = parseFloat(
        String(p.results[0].total_ges_tco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')
      );
    } 
    // Case 2: results is an object with total_ges_tco2e
    else if (p.results && typeof p.results === 'object' && p.results.total_ges_tco2e) {
      tCO2eq = parseFloat(
        String(p.results.total_ges_tco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')
      );
    } else {
      tCO2eq = 0;
    }
    return {
      poste: p.poste_num,
      label: p.poste_label || `Poste ${p.poste_num}`,
      tCO2eq: isNaN(tCO2eq) ? 0 : tCO2eq,
      results: p.results,
    };
  });

  // 4. Compute summary (totals)
  const total_tCO2eq = posteResults.reduce((sum, r) => sum + (isNaN(r.tCO2eq) ? 0 : r.tCO2eq), 0);

  // You can extract more fields for CO2, CH4, N2O, etc, if needed here!

  // 5. Return for dashboard
  return res.status(200).json({
    poste_results: posteResults,
    total_tCO2eq,
    // Optional: add summary per gas here
  });
}
