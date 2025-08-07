import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      user_id: userId,
      data,
      poste_num = 2,
      source_code = '2A1',
      poste_source_id,
      results // <-- NEW: Accept GES results from frontend!
    } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: "Missing required field: user_id" });
    }
    if (
      !data ||
      (typeof data !== 'object') ||
      (Array.isArray(data) && data.length === 0)
    ) {
      return res.status(400).json({ error: "Missing or invalid data" });
    }

    // 1. Get company_id for user
    const { data: userProfile, error: userProfileErr } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userProfileErr || !userProfile || !userProfile.company_id) {
      return res.status(400).json({ error: "User does not belong to any company" });
    }

    // 2. Get poste_id for this company + poste_num
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

    // 3. Upsert poste_sources with provided results!
    const { data: updated, error: updateErr } = await supabase
      .from('poste_sources')
      .upsert([{
        poste_id: posteId,
        source_code: source_code,
        data: data,
        results: results, // <--- Write the results from frontend
      }], {
        onConflict: ['poste_id', 'source_code']
      })
      .select();

    if (updateErr) {
      console.error("Supabase upsert error (poste_sources):", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    // Extract posteSourceId from DB
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
      results: results,
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
//       poste_num = 2,
//       source_code = '2A1',
//       poste_source_id
//     } = req.body;

//     // Validate required fields
//     if (!userId) {
//       return res.status(400).json({ error: "Missing required field: user_id" });
//     }
//     if (
//       !data ||
//       (typeof data !== 'object') ||
//       (Array.isArray(data) && data.length === 0)
//     ) {
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

//     // --- 3. Webhook call ---
//     let resultData = null;
//     // try {
//     //   const response = await fetch(
//     //     "https://poste2webhook-592102073404.us-central1.run.app/traitement",
//     //     {
//     //       method: "POST",
//     //       headers: { "Content-Type": "application/json" },
//     //       body: JSON.stringify(data),
//     //     }
//     //   );
//     //   if (!response.ok) {
//     //     const errorMsg = await response.text();
//     //     return res.status(500).json({ error: `Webhook failed: ${errorMsg}` });
//     //   }
//     //   resultData = await response.json();
//     // } catch (err) {
//     //   console.warn("Webhook error (proceeding without results):", err);
//     //   resultData = null;
//     // }

//     // --- 4. Upsert poste_sources ---
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

