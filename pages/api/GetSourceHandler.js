// pages/api/get-source.ts
import { supabase } from '../../lib/supabaseClient';

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

    return res.status(200).json({
      success: true,
      posteSourceId: posteSource?.id ?? null,
      data: posteSource?.data ?? null,
      results: posteSource?.results ?? null,
      meta: {
        enabled: posteSource?.enabled ?? null,
        label: posteSource?.label ?? null,
      },
    });

  } catch (err) {
    console.error("Handler Exception:", err);
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
}
