import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      user_id: userId,
      data,
      poste_num,           // required: 4 for 4A1/4B1, etc.
      source_code,         // required: '4A1', '4B1', etc.
      poste_source_id,
      results: resultData = [],
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing required field: user_id" });
    }
    if (!poste_num || !source_code) {
      return res.status(400).json({ error: "Missing poste_num or source_code" });
    }
    if (!data || typeof data !== 'object' || (Array.isArray(data) && data.length === 0)) {
      return res.status(400).json({ error: "Missing or invalid data" });
    }

    // --- 1. Get company_id for user ---
    const { data: userProfile, error: userProfileErr } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userProfileErr || !userProfile || !userProfile.company_id) {
      return res.status(400).json({ error: "User does not belong to any company" });
    }

    // --- 2. Get poste_id for this company + poste_num ---
    const { data: poste, error: posteErr } = await supabase
      .from('postes')
      .select('id')
      .eq('company_id', userProfile.company_id)
      .eq('num', poste_num)
      .single();

    if (posteErr || !poste || !poste.id) {
      return res.status(400).json({ error: `Poste ${poste_num} not found for company` });
    }
    const posteId = poste.id;

    // --- 3. Upsert poste_sources ---
    const { data: updated, error: updateErr } = await supabase
      .from('poste_sources')
      .upsert([{
        poste_id: posteId,
        source_code,
        data,
        results: resultData,
      }], {
        onConflict: ['poste_id', 'source_code']
      })
      .select();

    if (updateErr) {
      console.error("Supabase upsert error (poste_sources):", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    const posteSourceIdFromDB =
      updated && updated.length > 0
        ? (updated[0].id || updated[0].posteSourceId)
        : null;

    if (poste_source_id && poste_source_id !== posteSourceIdFromDB) {
      console.warn(`Provided poste_source_id (${poste_source_id}) does not match DB id (${posteSourceIdFromDB})`);
    }

    return res.status(200).json({
      success: true,
      posteSourceId: posteSourceIdFromDB,
      poste_source: updated && updated.length > 0 ? updated[0] : null,
      results: resultData,
    });

  } catch (err) {
    console.error("Handler Exception:", err);
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
}

// import { supabase } from '../../lib/supabaseClient';

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const {
//       user_id: userId,
//       data,
//       poste_num = 4,
//       source_code = '4A1',
//       poste_source_id,
//       results: resultData = [],
//     } = req.body;

//     // --- Validate required fields ---
//     if (!userId) {
//       return res.status(400).json({ error: "Missing required field: user_id" });
//     }
//     if (!data || typeof data !== 'object' || (Array.isArray(data) && data.length === 0)) {
//       return res.status(400).json({ error: "Missing or invalid data" });
//     }

//     // --- 1. Get company_id for user ---
//     const { data: userProfile, error: userProfileErr } = await supabase
//       .from('user_profiles')
//       .select('company_id')
//       .eq('id', userId)
//       .single();

//     if (userProfileErr || !userProfile || !userProfile.company_id) {
//       return res.status(400).json({ error: "User does not belong to any company" });
//     }

//     // --- 2. Get poste_id for this company + poste_num ---
//     const { data: poste, error: posteErr } = await supabase
//       .from('postes')
//       .select('id')
//       .eq('company_id', userProfile.company_id)
//       .eq('num', poste_num)
//       .single();

//     if (posteErr || !poste || !poste.id) {
//       return res.status(400).json({ error: `Poste ${poste_num} not found for company` });
//     }
//     const posteId = poste.id;

//     // --- 3. Upsert poste_sources ---
//     const { data: updated, error: updateErr } = await supabase
//       .from('poste_sources')
//       .upsert([{
//         poste_id: posteId,
//         source_code: source_code,
//         data: data,
//         results: resultData,
//       }], {
//         onConflict: ['poste_id', 'source_code']
//       })
//       .select();

//     if (updateErr) {
//       console.error("Supabase upsert error (poste_sources):", updateErr);
//       return res.status(500).json({ error: updateErr.message });
//     }

//     // Extract posteSourceId from DB
//     const posteSourceIdFromDB =
//       updated && updated.length > 0
//         ? (updated[0].id || updated[0].posteSourceId)
//         : null;

//     if (poste_source_id && poste_source_id !== posteSourceIdFromDB) {
//       console.warn(`Provided poste_source_id (${poste_source_id}) does not match DB id (${posteSourceIdFromDB})`);
//     }

//     return res.status(200).json({
//       success: true,
//       posteSourceId: posteSourceIdFromDB,
//       poste_source: updated && updated.length > 0 ? updated[0] : null,
//       results: resultData,
//     });

//   } catch (err) {
//     console.error("Handler Exception:", err);
//     return res.status(500).json({ error: err?.message || "Something went wrong" });
//   }
// }
