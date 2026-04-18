import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      user_id: userId,
      data,
      poste_num,
      source_code = 'A',
      submission_id,
      results,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing user_id" });
    }
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: "Missing or invalid data structure" });
    }
    if (!poste_num) {
      return res.status(400).json({ error: "Missing poste_num" });
    }
    if (!source_code) {
      return res.status(400).json({ error: "Missing source_code" });
    }

    // 1. Get company_id for user
    const { data: userProfile, error: userProfileErr } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userProfileErr || !userProfile?.company_id) {
      return res.status(400).json({ error: "User does not belong to any company" });
    }

    // 2. Get poste_id for this company + poste_num
    const { data: poste, error: posteErr } = await supabase
      .from('postes')
      .select('id')
      .eq('company_id', userProfile.company_id)
      .eq('num', poste_num)
      .single();

    if (posteErr || !poste?.id) {
      return res.status(400).json({ error: `Poste ${poste_num} not found for company` });
    }
    const posteId = poste.id;

    // 3. Find existing row by (poste_id, source_code) — unique constraint, no submission_id filter
    const { data: existing } = await supabase
      .from('poste_sources')
      .select('id')
      .eq('poste_id', posteId)
      .eq('source_code', source_code)
      .maybeSingle();

    let posteSourceIdFromDB = null;

    const updatePayload = { data, results: results ?? null };
    if (submission_id !== undefined) updatePayload.submission_id = submission_id ?? null;

    if (existing?.id) {
      // UPDATE existing row (set submission_id to track which bilan last saved)
      const { data: updated, error: updateErr } = await supabase
        .from('poste_sources')
        .update(updatePayload)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateErr) {
        console.error("Supabase update error (poste_sources):", updateErr);
        return res.status(500).json({ error: updateErr.message });
      }
      posteSourceIdFromDB = updated?.id ?? existing.id;
    } else {
      // INSERT new row (only happens for brand-new sources not yet in DB)
      const newRow = { poste_id: posteId, source_code, data, results: results ?? null };
      if (submission_id) newRow.submission_id = submission_id;

      const { data: inserted, error: insertErr } = await supabase
        .from('poste_sources')
        .insert([newRow])
        .select('id')
        .single();

      if (insertErr) {
        console.error("Supabase insert error (poste_sources):", insertErr);
        return res.status(500).json({ error: insertErr.message });
      }
      posteSourceIdFromDB = inserted?.id ?? null;
    }

    return res.status(200).json({
      success: true,
      poste_source: { id: posteSourceIdFromDB },
    });
  } catch (err) {
    console.error("Handler Exception:", err);
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
}
