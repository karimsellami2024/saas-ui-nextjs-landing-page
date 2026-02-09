import { supabase } from '../../lib/supabaseClient';

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  // keep digits, dot, comma, minus
  const cleaned = s.replace(/[^\d.,\-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const pickFirstObject = (results) => {
  if (Array.isArray(results)) return results[0] || {};
  return results || {};
};

// Energy metric extraction
// Accepts a variety of possible keys so your backend stays compatible with different sources.
const extractEnergyKwh = (src) => {
  // Prefer explicit energy totals
  const candidates = [
    src.total_kwh,
    src.total_energy_kwh,
    src.total_energie_kwh,
    src.energie_equivalente_kwh,
    src.energy_kwh,
    src.kwh,
  ];
  for (const c of candidates) {
    const n = toNumber(c);
    if (n !== 0) return n;
  }
  return 0;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id: userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  // 1) Get user's company
  const { data: userProfile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (profileErr || !userProfile?.company_id) {
    return res.status(404).json({ error: "No company found for this user" });
  }
  const companyId = userProfile.company_id;

  // 2) Get all postes for this company
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
  const posteIds = postes.map(p => p.id);

  // 3) Get all sources for these postes (in one query)
  const { data: sources, error: sourceErr } = await supabase
    .from('poste_sources')
    .select('poste_id, results, enabled')
    .in('poste_id', posteIds);

  if (sourceErr) {
    return res.status(500).json({ error: sourceErr.message });
  }

  // 4) Aggregate per poste:
  //    - bilan GES (existing)
  //    - bilan énergétique (new): kWh total per poste
  let total_tCO2eq = 0, total_co2 = 0, total_ch4 = 0, total_n2o = 0, total_ges = 0;
  let total_kwh = 0;

  const posteResultsMap = {};
  const energyResultsMap = {};

  for (const s of sources || []) {
    if (!s.enabled) continue;
    const poste = posteIdMap.get(s.poste_id);
    if (!poste) continue;

    const src = pickFirstObject(s.results);

    // ---- GES ----
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

    // NOTE: keep your original keys (and add a couple fallbacks safely)
    if (src.total_ges_tco2e !== undefined) {
      posteResultsMap[poste.id].tCO2eq += toNumber(src.total_ges_tco2e);
    }
    if (src.total_co2_gco2e !== undefined) {
      posteResultsMap[poste.id].co2 += toNumber(src.total_co2_gco2e);
    }
    if (src.total_ges_ch4_gco2e !== undefined) {
      posteResultsMap[poste.id].ch4 += toNumber(src.total_ges_ch4_gco2e);
    }
    if (src.total_ges_n2o_gco2e !== undefined) {
      posteResultsMap[poste.id].n2o += toNumber(src.total_ges_n2o_gco2e);
    }
    if (src.total_ges_gco2e !== undefined) {
      posteResultsMap[poste.id].ges += toNumber(src.total_ges_gco2e);
    }

    // ---- ENERGY ----
    // Aggregate ANY enabled source that contains energy keys.
    // If a poste has multiple sources producing energy, they will sum.
    const kwh = extractEnergyKwh(src);
    if (kwh !== 0) {
      if (!energyResultsMap[poste.id]) {
        energyResultsMap[poste.id] = {
          poste: poste.num,
          label: poste.label || `Poste ${poste.num}`,
          kwh: 0,
        };
      }
      energyResultsMap[poste.id].kwh += kwh;
    }
  }

  // Convert GES map to array and calculate totals
  const poste_results = Object.values(posteResultsMap).map((row) => {
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

  poste_results.forEach((row) => {
    row.percent = total_tCO2eq > 0 ? +(100 * row.tCO2eq / total_tCO2eq).toFixed(1) : 0;
  });

  // Convert ENERGY map to array and calculate totals
  const energy_results = Object.values(energyResultsMap).map((row) => {
    row.kwh = +Number(row.kwh || 0).toFixed(0);
    total_kwh += row.kwh;
    return row;
  });

  energy_results.forEach((row) => {
    row.percent = total_kwh > 0 ? +(100 * row.kwh / total_kwh).toFixed(0) : 0;
  });

  // OPTIONAL: build a simple trend (yearly) if you store it somewhere else.
  // For now, return empty; your frontend can hide it when no data.
  const energy_trend = [];

  return res.status(200).json({
    company_id: companyId,

    // ----- GES -----
    poste_results,
    summary: {
      total_tCO2eq: +total_tCO2eq.toFixed(2),
      co2: +total_co2.toFixed(2),
      ch4: +total_ch4.toFixed(2),
      n2o: +total_n2o.toFixed(2),
      ges: +total_ges.toFixed(2),
    },

    // ----- ENERGY -----
    energy_results,
    energy_summary: {
      total_kwh: +total_kwh.toFixed(0),
      // convenience for your toggle
      total_gj: +(total_kwh * 0.0036).toFixed(2),
    },
    energy_trend,
  });
}

// import { supabase } from '../../lib/supabaseClient';

// export default async function handler(req, res) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const { user_id: userId } = req.query;
//   if (!userId) {
//     return res.status(400).json({ error: "Missing user_id" });
//   }

//   // 1. Get user's company
//   const { data: userProfile, error: profileErr } = await supabase
//     .from('user_profiles')
//     .select('company_id')
//     .eq('id', userId)
//     .single();

//   if (profileErr || !userProfile?.company_id) {
//     return res.status(404).json({ error: "No company found for this user" });
//   }
//   const companyId = userProfile.company_id;

//   // 2. Get all postes for this company
//   const { data: postes, error: posteErr } = await supabase
//     .from('postes')
//     .select('id, num, label')
//     .eq('company_id', companyId);

//   if (posteErr) {
//     return res.status(500).json({ error: posteErr.message });
//   }
//   if (!postes || postes.length === 0) {
//     return res.status(404).json({ error: "No postes found for this company" });
//   }

//   const posteIdMap = new Map(postes.map(p => [p.id, p]));

//   // 3. Get all sources for these postes (in one query)
//   const posteIds = postes.map(p => p.id);
//   const { data: sources, error: sourceErr } = await supabase
//     .from('poste_sources')
//     .select('poste_id, results, enabled')
//     .in('poste_id', posteIds);

//   if (sourceErr) {
//     return res.status(500).json({ error: sourceErr.message });
//   }

//   // 4. Aggregate per poste
//   let total_tCO2eq = 0, total_co2 = 0, total_ch4 = 0, total_n2o = 0, total_ges = 0;
//   const posteResultsMap = {};

//   for (const s of sources || []) {
//     if (!s.enabled) continue;
//     const poste = posteIdMap.get(s.poste_id);
//     if (!poste) continue;
//     if (!posteResultsMap[poste.id]) {
//       posteResultsMap[poste.id] = {
//         poste: poste.num,
//         label: poste.label || `Poste ${poste.num}`,
//         tCO2eq: 0,
//         co2: 0,
//         ch4: 0,
//         n2o: 0,
//         ges: 0,
//       };
//     }
//     const src = Array.isArray(s.results) && s.results.length > 0 ? s.results[0] : (s.results || {});
//     if (src.total_ges_tco2e !== undefined) {
//       posteResultsMap[poste.id].tCO2eq += parseFloat(String(src.total_ges_tco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
//     }
//     if (src.total_co2_gco2e !== undefined) {
//       posteResultsMap[poste.id].co2 += parseFloat(String(src.total_co2_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
//     }
//     if (src.total_ges_ch4_gco2e !== undefined) {
//       posteResultsMap[poste.id].ch4 += parseFloat(String(src.total_ges_ch4_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
//     }
//     if (src.total_ges_n2o_gco2e !== undefined) {
//       posteResultsMap[poste.id].n2o += parseFloat(String(src.total_ges_n2o_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
//     }
//     if (src.total_ges_gco2e !== undefined) {
//       posteResultsMap[poste.id].ges += parseFloat(String(src.total_ges_gco2e).replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
//     }
//   }

//   // Convert map to array and calculate totals
//   const posteResults = Object.values(posteResultsMap).map(row => {
//     row.tCO2eq = +row.tCO2eq.toFixed(2);
//     row.co2 = +row.co2.toFixed(2);
//     row.ch4 = +row.ch4.toFixed(2);
//     row.n2o = +row.n2o.toFixed(2);
//     row.ges = +row.ges.toFixed(2);

//     total_tCO2eq += row.tCO2eq;
//     total_co2 += row.co2;
//     total_ch4 += row.ch4;
//     total_n2o += row.n2o;
//     total_ges += row.ges;
//     return row;
//   });

//   // Compute percent for each poste
//   posteResults.forEach((row) => {
//     row.percent = total_tCO2eq > 0 ? +(100 * row.tCO2eq / total_tCO2eq).toFixed(1) : 0;
//   });

//   // RETURN company_id in payload
//   return res.status(200).json({
//     company_id: companyId,
//     poste_results: posteResults,
//     total_tCO2eq: +total_tCO2eq.toFixed(2),
//     co2: +total_co2.toFixed(2),
//     ch4: +total_ch4.toFixed(2),
//     n2o: +total_n2o.toFixed(2),
//     ges: +total_ges.toFixed(2),
//     summary: {
//       total_tCO2eq: +total_tCO2eq.toFixed(2),
//       co2: +total_co2.toFixed(2),
//       ch4: +total_ch4.toFixed(2),
//       n2o: +total_n2o.toFixed(2),
//       ges: +total_ges.toFixed(2),
//     }
//   });
// }
