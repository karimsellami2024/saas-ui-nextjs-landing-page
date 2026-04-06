// pages/api/get-source.ts
import { supabase } from '../../lib/supabaseClient';

const LEGACY_POSTE_NUM_BY_SOURCE = {
  '2A1': 1,
  '2A3': 1,
  '2B1': 1,
  '4A1': 1,
  '4B1': 1,
  '4B2': 1,
  '6A1': 2,
  '6B1': 2,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      user_id: userId,     // from query string ?user_id=...&poste_num=...&source_code=...
      poste_num,
      source_code
    } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing required field: user_id" });
    }
    if (!poste_num || !source_code) {
      return res.status(400).json({ error: "Missing poste_num or source_code" });
    }

    // --- 1. Get company_id for user ---
    const { data: userProfile, error: userProfileErr } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userProfileErr || !userProfile?.company_id) {
      return res.status(400).json({ error: "User does not belong to any company" });
    }

    // --- 2. Get poste_id for this company + poste_num ---
    const { data: poste, error: posteErr } = await supabase
      .from('postes')
      .select('id')
      .eq('company_id', userProfile.company_id)
      .eq('num', poste_num)
      .single();

    if (posteErr || !poste?.id) {
      return res.status(404).json({ error: `Poste ${poste_num} not found for company` });
    }
    const posteId = poste.id;

    // --- 3. Fetch poste_sources row for this poste + source_code ---
    const { data: posteSource, error: psErr } = await supabase
      .from('poste_sources')
      .select('id, data, results, enabled, label')
      .eq('poste_id', posteId)
      .eq('source_code', source_code)
      .maybeSingle();

    if (psErr) {
      console.error("Supabase fetch error (poste_sources):", psErr);
      return res.status(500).json({ error: psErr.message });
    }

    let resolvedPosteSource = posteSource;

    if (!resolvedPosteSource) {
      const legacyPosteNum = LEGACY_POSTE_NUM_BY_SOURCE[String(source_code)];

      if (legacyPosteNum && Number(legacyPosteNum) !== Number(poste_num)) {
        const { data: legacyPoste, error: legacyPosteErr } = await supabase
          .from('postes')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .eq('num', legacyPosteNum)
          .single();

        if (!legacyPosteErr && legacyPoste?.id) {
          const { data: legacyPosteSource, error: legacyPsErr } = await supabase
            .from('poste_sources')
            .select('id, data, results, enabled, label')
            .eq('poste_id', legacyPoste.id)
            .eq('source_code', source_code)
            .maybeSingle();

          if (legacyPsErr) {
            console.error("Supabase legacy fetch error (poste_sources):", legacyPsErr);
          } else if (legacyPosteSource) {
            resolvedPosteSource = legacyPosteSource;
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      posteSourceId: resolvedPosteSource?.id ?? null,
      data: resolvedPosteSource?.data ?? null,
      results: resolvedPosteSource?.results ?? null,
      meta: {
        enabled: resolvedPosteSource?.enabled ?? null,
        label: resolvedPosteSource?.label ?? null,
      },
    });

  } catch (err) {
    console.error("Handler Exception:", err);
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
}
