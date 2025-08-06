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
      source_code = 'A1',
      poste_source_id
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

    // --- 3. Webhook call ---
    let resultData = null;
    // try {
    //   const response = await fetch(
    //     "https://poste2webhook-592102073404.us-central1.run.app/traitement",
    //     {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify(data),
    //     }
    //   );
    //   if (!response.ok) {
    //     const errorMsg = await response.text();
    //     return res.status(500).json({ error: `Webhook failed: ${errorMsg}` });
    //   }
    //   resultData = await response.json();
    // } catch (err) {
    //   console.warn("Webhook error (proceeding without results):", err);
    //   resultData = null;
    // }

    // --- 4. Upsert poste_sources ---
    const { data: updated, error: updateErr } = await supabase
      .from('poste_sources')
      .upsert([{
        poste_id: posteId,
        source_code: source_code,
        data: data,
        results: resultData,
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
      results: resultData,
    });

  } catch (err) {
    console.error("Handler Exception:", err);
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
}



// import { supabase } from '../../lib/supabaseClient';

// export default async function handler(req, res) {
//   if (req.method === 'POST') {
//     try {
//       const { user_id: userId, data } = req.body;

//       if (!userId) {
//         return res.status(400).json({ error: "Missing user_id" });
//       }
//       if (!data) {
//         return res.status(400).json({ error: "Missing data" });
//       }

//       // 1. Find the most recent submission for this user (any year)
//       let { data: submissions, error: subErr } = await supabase
//         .from('submissions')
//         .select('*')
//         .eq('user_id', userId)
//         .order('created_at', { ascending: false })
//         .limit(1);

//       let submissionId = null;
//       if (subErr) {
//         return res.status(500).json({ error: subErr.message });
//       }

//       if (submissions && submissions.length > 0) {
//         submissionId = submissions[0].id;
//         // --- LOCK LOGIC HERE ---
//         if (submissions[0].locked) {
//           return res.status(403).json({ error: "Submission is locked and cannot be modified" });
//         }
//       } else {
//         // If none found, create a new submission
//         let { data: created, error: createErr } = await supabase
//           .from('submissions')
//           .insert([{ user_id: userId, reporting_year: new Date().getFullYear() }])
//           .select()
//           .single();
//         if (createErr) {
//           console.error("Submission creation error:", createErr);
//           return res.status(500).json({ error: createErr.message });
//         }
//         submissionId = created.id;
//       }

//       // --- Call poste2webhook and get results ---
//       const response = await fetch(
//         "https://poste2webhook-592102073404.us-central1.run.app/traitement",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(data),
//         }
//       );

//       if (!response.ok) {
//         const errorMsg = await response.text();
//         return res.status(500).json({ error: `Webhook failed: ${errorMsg}` });
//       }

//       const resultData = await response.json();

//       // 2. Upsert poste 2 results (and optional legacy input data)
//       let { error: posteErr } = await supabase
//         .from('postes')
//         .upsert(
//           [{
//             submission_id: submissionId,
//             poste_num: 2,
//             poste_label: 'Combustion Mobile',
//             data: data, // optional; keep for legacy; can remove if only results are wanted
//             results: resultData,
//           }],
//           { onConflict: ['submission_id', 'poste_num'] }
//         );

//       if (posteErr) {
//         console.error("Poste upsert error:", posteErr);
//         return res.status(500).json({ error: posteErr.message });
//       }

//       // --- SET LOCKED = TRUE after successful save ---
//       let { error: lockErr } = await supabase
//         .from('submissions')
//         .update({ locked: true })
//         .eq('id', submissionId);

//       if (lockErr) {
//         return res.status(500).json({ error: lockErr.message });
//       }

//       // Return result(s) to frontend
//       if (Array.isArray(resultData)) {
//         return res.status(200).json(resultData);
//       } else if (resultData.results && Array.isArray(resultData.results)) {
//         return res.status(200).json(resultData.results);
//       } else {
//         return res.status(200).json([resultData]);
//       }

//     } catch (err) {
//       console.error("Cloud Run error:", err);
//       return res.status(500).json({ error: "Something went wrong" });
//     }
//   } else {
//     // Method not allowed
//     return res.status(405).json({ error: "Method not allowed" });
//   }
// }
