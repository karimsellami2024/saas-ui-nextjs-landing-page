import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id: userId, data, poste_num, source_code = 'A' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing user_id" });
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.counters)) {
      return res.status(400).json({ error: "Missing or invalid data structure" });
    }
    if (!poste_num) {
      return res.status(400).json({ error: "Missing poste_num" });
    }
    if (!source_code) {
      return res.status(400).json({ error: "Missing source_code" });
    }

    // Get company_id for user
    const { data: userProfile, error: userProfileErr } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userProfileErr || !userProfile || !userProfile.company_id) {
      return res.status(400).json({ error: "User does not belong to any company" });
    }

    // Get poste_id for this company + poste_num
    const { data: poste, error: posteErr } = await supabase
      .from('postes')
      .select('id')
      .eq('company_id', userProfile.company_id)
      .eq('num', poste_num)
      .single();

    if (posteErr || !poste || !poste.id) {
      return res.status(400).json({ error: "Poste not found for company" });
    }
    const posteId = poste.id;

    // Save input directly in poste_sources
    const { data: updated, error: updateErr } = await supabase
      .from('poste_sources')
      .upsert([{
        poste_id: posteId,
        source_code: source_code,
        data: data
      }], {
        onConflict: ['poste_id', 'source_code']
      })
      .select();

    if (updateErr) {
      console.error("Supabase upsert error (poste_sources):", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    // Success!
    return res.status(200).json({
      success: true,
      poste_source: updated && updated.length > 0 ? updated[0] : null
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
//     const { user_id: userId, data, submission_id, poste_id } = req.body;
//     if (!userId) {
//       return res.status(400).json({ error: "Missing user_id" });
//     }
//     if (!data || typeof data !== 'object' || !Array.isArray(data.counters)) {
//       return res.status(400).json({ error: "Missing or invalid data structure" });
//     }

//     // ---- Build the flat array for backend ----
//     function toEtape1(row) {
//       return {
//         "Numéro de compteur": row.number ?? "",
//         "Adresse du compteur d’électricité": row.address ?? "",
//         "Province/pays": row.province ?? "",
//         "Consommation électrique totale pour l’année (kWh)": row.consumption ?? "",
//         "Références": row.reference ?? "",
//         "Numéro de compteur (rappel)": "",
//         "Adresse du compteur d’électricité (rappel)": "",
//         "No. ou date de facture": "",
//         "Consommation électrique (kWh)": "",
//         "Références (facultatif)": "",
//       };
//     }
//     function toEtape2(row) {
//       return {
//         "Numéro de compteur": "",
//         "Adresse du compteur d’électricité": "",
//         "Province/pays": "",
//         "Consommation électrique totale pour l’année (kWh)": "",
//         "Références": "",
//         "Numéro de compteur (rappel)": row.number ?? "",
//         "Adresse du compteur d’électricité (rappel)": row.address ?? "",
//         "No. ou date de facture": row.invoice ?? row.date ?? "",
//         "Consommation électrique (kWh)": row.consumption ?? "",
//         "Références (facultatif)": row.reference ?? "",
//       };
//     }

//     const countersForBackend = (data.counters || []).map(toEtape1);
//     const invoicesForBackend = (data.invoices || []).map(toEtape2);
//     const combinedRows = [...countersForBackend, ...invoicesForBackend];

//     // ---- Webhooks ----
//     fetch(
//       "https://another-webhook-592102073404.us-central1.run.app/traitement",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(combinedRows),
//       }
//     ).catch((err) => {
//       console.error("Second webhook error (ignored):", err);
//     });

//     const response = await fetch(
//       "https://poste6webhook-592102073404.us-central1.run.app/traitement",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(combinedRows),
//       }
//     );

//     if (!response.ok) {
//       const errorMsg = await response.text();
//       return res.status(500).json({ error: `First webhook failed: ${errorMsg}` });
//     }

//     const resultData = await response.json();

//     // ----- Database Step -----
//     let finalSubmissionId = submission_id;
//     if (!finalSubmissionId) {
//       // Try to find the latest submission for this user (shared with poste 2)
//       const { data: submissions, error: subErr } = await supabase
//         .from('submissions')
//         .select('id, locked')
//         .eq('user_id', userId)
//         .order('created_at', { ascending: false })
//         .limit(1);

//       if (subErr) {
//         console.error("Supabase fetch error (submissions):", subErr);
//         return res.status(500).json({ error: subErr.message });
//       }

//       if (submissions && submissions.length > 0) {
//         finalSubmissionId = submissions[0].id;

//         // ---- LOCK CHECK ----
//         if (submissions[0].locked) {
//           return res.status(403).json({ error: "Submission is locked and cannot be modified" });
//         }
//       } else {
//         // Only create if there is none
//         const { data: newSubmission, error: insertErr } = await supabase
//           .from('submissions')
//           .insert([{ user_id: userId }])
//           .select('id')
//           .single();
//         if (insertErr) {
//           console.error("Supabase insert error (submissions):", insertErr);
//           return res.status(500).json({ error: insertErr.message });
//         }
//         finalSubmissionId = newSubmission.id;
//       }
//     } else {
//       // If submission_id was provided, check lock status
//       const { data: submission, error: fetchErr } = await supabase
//         .from('submissions')
//         .select('locked')
//         .eq('id', finalSubmissionId)
//         .single();

//       if (fetchErr) {
//         return res.status(500).json({ error: fetchErr.message });
//       }
//       if (submission && submission.locked) {
//         return res.status(403).json({ error: "Submission is locked and cannot be modified" });
//       }
//     }

//     // Save poste6 object (raw UI structure) and the webhook result
//     let upsertData = {
//       submission_id: finalSubmissionId,
//       poste_num: 6,
//       data: data,
//       results: resultData
//     };
//     if (poste_id) upsertData.id = poste_id;

//     const { error: posteErr, data: posteData } = await supabase
//       .from('postes')
//       .upsert([upsertData], { onConflict: ['submission_id', 'poste_num'] })
//       .select();

//     if (posteErr) {
//       console.error("Supabase upsert error (postes):", posteErr);
//       return res.status(500).json({ error: posteErr.message });
//     }

//     // ---- SET LOCKED = TRUE after successful save ----
//     const { error: lockErr } = await supabase
//       .from('submissions')
//       .update({ locked: true })
//       .eq('id', finalSubmissionId);

//     if (lockErr) {
//       return res.status(500).json({ error: lockErr.message });
//     }

//     // Return result as array for frontend
//     if (Array.isArray(resultData)) {
//       return res.status(200).json(resultData);
//     } else if (resultData.results && Array.isArray(resultData.results)) {
//       return res.status(200).json(resultData.results);
//     } else {
//       return res.status(200).json([resultData]);
//     }
//   } catch (err) {
//     console.error("Cloud Run error:", err);
//     return res.status(500).json({ error: "Something went wrong" });
//   }
// }


// import { supabase } from '../../lib/supabaseClient';

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { user_id: userId, data, submission_id, poste_id } = req.body;
//     // data: { counters: [...], invoices: [...] }
//     if (!userId) {
//       return res.status(400).json({ error: "Missing user_id" });
//     }
//     if (!data || typeof data !== 'object' || !Array.isArray(data.counters)) {
//       return res.status(400).json({ error: "Missing or invalid data structure" });
//     }

//     // ---- Build the flat array for backend ----
//     function toEtape1(row) {
//       return {
//         "Numéro de compteur": row.number ?? "",
//         "Adresse du compteur d’électricité": row.address ?? "",
//         "Province/pays": row.province ?? "",
//         "Consommation électrique totale pour l’année (kWh)": row.consumption ?? "",
//         "Références": row.reference ?? "",
//         // Etape 2 fields: empty here
//         "Numéro de compteur (rappel)": "",
//         "Adresse du compteur d’électricité (rappel)": "",
//         "No. ou date de facture": "",
//         "Consommation électrique (kWh)": "",
//         "Références (facultatif)": "",
//       };
//     }
//     function toEtape2(row) {
//       return {
//         "Numéro de compteur": "",
//         "Adresse du compteur d’électricité": "",
//         "Province/pays": "",
//         "Consommation électrique totale pour l’année (kWh)": "",
//         "Références": "",
//         // Etape 2 fields
//         "Numéro de compteur (rappel)": row.number ?? "",
//         "Adresse du compteur d’électricité (rappel)": row.address ?? "",
//         "No. ou date de facture": row.invoice ?? row.date ?? "",
//         "Consommation électrique (kWh)": row.consumption ?? "",
//         "Références (facultatif)": row.reference ?? "",
//       };
//     }

//     // Compose final flat array for backend
//     const countersForBackend = (data.counters || []).map(toEtape1);
//     const invoicesForBackend = (data.invoices || []).map(toEtape2);
//     const combinedRows = [...countersForBackend, ...invoicesForBackend];

//     // ---- Webhooks ----
//     fetch(
//       "https://another-webhook-592102073404.us-central1.run.app/traitement",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(combinedRows),
//       }
//     ).catch((err) => {
//       console.error("Second webhook error (ignored):", err);
//     });

//     const response = await fetch(
//       "https://poste6webhook-592102073404.us-central1.run.app/traitement",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(combinedRows),
//       }
//     );

//     if (!response.ok) {
//       const errorMsg = await response.text();
//       return res.status(500).json({ error: `First webhook failed: ${errorMsg}` });
//     }

//     const resultData = await response.json();

//     // ----- Database Step -----
//     let finalSubmissionId = submission_id;
//     if (!finalSubmissionId) {
//       // Try to find the latest submission for this user (shared with poste 2)
//       const { data: submissions, error: subErr } = await supabase
//         .from('submissions')
//         .select('id')
//         .eq('user_id', userId)
//         .order('created_at', { ascending: false })
//         .limit(1);

//       if (subErr) {
//         console.error("Supabase fetch error (submissions):", subErr);
//         return res.status(500).json({ error: subErr.message });
//       }

//       if (submissions && submissions.length > 0) {
//         finalSubmissionId = submissions[0].id;
//       } else {
//         // Only create if there is none
//         const { data: newSubmission, error: insertErr } = await supabase
//           .from('submissions')
//           .insert([{ user_id: userId }])
//           .select('id')
//           .single();
//         if (insertErr) {
//           console.error("Supabase insert error (submissions):", insertErr);
//           return res.status(500).json({ error: insertErr.message });
//         }
//         finalSubmissionId = newSubmission.id;
//       }
//     }

//     // Save poste6 object (raw UI structure) and the webhook result
//     let upsertData = {
//       submission_id: finalSubmissionId,
//       poste_num: 6,
//       data: data,         // { counters: [...], invoices: [...] }
//       results: resultData
//     };
//     if (poste_id) upsertData.id = poste_id;

//     const { error: posteErr, data: posteData } = await supabase
//       .from('postes')
//       .upsert([upsertData], { onConflict: ['submission_id', 'poste_num'] })
//       .select();

//     if (posteErr) {
//       console.error("Supabase upsert error (postes):", posteErr);
//       return res.status(500).json({ error: posteErr.message });
//     }

//     // Return result as array for frontend
//     if (Array.isArray(resultData)) {
//       return res.status(200).json(resultData);
//     } else if (resultData.results && Array.isArray(resultData.results)) {
//       return res.status(200).json(resultData.results);
//     } else {
//       return res.status(200).json([resultData]);
//     }
//   } catch (err) {
//     console.error("Cloud Run error:", err);
//     return res.status(500).json({ error: "Something went wrong" });
//   }
// }

