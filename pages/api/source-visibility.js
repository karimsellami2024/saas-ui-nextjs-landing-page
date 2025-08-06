import { supabase } from '../../lib/supabaseClient';

// GET /api/source-visibility?user_id=...

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id: userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  // 1. Get user and company
  const { data: userProfile, error: userProfileError } = await supabase
    .from("user_profiles")
    .select("company_id")
    .eq("id", userId)
    .single();

  if (userProfileError || !userProfile?.company_id) {
    return res.status(400).json({ error: "User has no company." });
  }

  // 2. Get all enabled postes for this company
  const { data: postes, error: posteError } = await supabase
    .from("postes")
    .select("id, label, enabled")
    .eq("enabled", true)
    .eq("company_id", userProfile.company_id);

  if (posteError) {
    return res.status(500).json({ error: posteError.message });
  }
  if (!postes || !postes.length) {
    return res.status(200).json({ posteLabels: {}, posteVisibility: {}, sourceVisibility: {}, sources: {} });
  }
  const posteIds = postes.map(p => p.id);
  const posteLabelMap = {};
  postes.forEach(p => { posteLabelMap[p.id] = p.label; });

  // 3. Get poste-level visibility for this user
  const { data: posteVis, error: posteVisError } = await supabase
    .from("poste_visibility")
    .select("poste_id, is_hidden")
    .eq("user_id", userId)
    .in("poste_id", posteIds);

  if (posteVisError) {
    return res.status(500).json({ error: posteVisError.message });
  }
  const posteVisibility = {};
  posteVis?.forEach(row => {
    posteVisibility[row.poste_id] = row.is_hidden;
  });

  // 4. Get all enabled sources for those postes
  const { data: sources, error: sourceError } = await supabase
    .from("poste_sources")
    .select("id, poste_id, source_code, label, enabled") // Added 'id' to select
    .in("poste_id", posteIds)
    .eq("enabled", true);

  if (sourceError) {
    return res.status(500).json({ error: sourceError.message });
  }

  // Group by poste_id for easier frontend usage
  const sourcesByPoste = {};
  sources.forEach(src => {
    if (!sourcesByPoste[src.poste_id]) sourcesByPoste[src.poste_id] = [];
    sourcesByPoste[src.poste_id].push({
      id: src.id, // Include the id (posteSourceId)
      source_code: src.source_code,
      label: src.label,
      enabled: !!src.enabled,
    });
  });

  // 5. Get per-source visibility for this user
  const { data: srcVis, error: srcVisError } = await supabase
    .from("poste_source_visibility")
    .select("poste_id, source_code, is_hidden")
    .eq("user_id", userId)
    .in("poste_id", posteIds);

  if (srcVisError) {
    return res.status(500).json({ error: srcVisError.message });
  }

  // Build source-level map: { [poste_id]: { [source_code]: is_hidden } }
  const sourceVisibility = {};
  srcVis?.forEach(row => {
    if (!sourceVisibility[row.poste_id]) sourceVisibility[row.poste_id] = {};
    sourceVisibility[row.poste_id][row.source_code] = row.is_hidden;
  });

  // 6. Return result with label maps and all sources for the frontend
  return res.status(200).json({
    posteLabels: posteLabelMap,         // { poste_id: label }
    posteVisibility,                    // { poste_id: is_hidden }
    sourceVisibility,                   // { poste_id: { source_code: is_hidden } }
    sources: sourcesByPoste             // { poste_id: [ {id, source_code, label, enabled} ] }
  });
}

// import { supabase } from '../../lib/supabaseClient';

// // GET /api/source-visibility?user_id=...

// export default async function handler(req, res) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const { user_id: userId } = req.query;
//   if (!userId) {
//     return res.status(400).json({ error: "Missing user_id" });
//   }

//   // 1. Get user and company
//   const { data: userProfile, error: userProfileError } = await supabase
//     .from("user_profiles")
//     .select("company_id")
//     .eq("id", userId)
//     .single();

//   if (userProfileError || !userProfile?.company_id) {
//     return res.status(400).json({ error: "User has no company." });
//   }

//   // 2. Get all enabled postes for this company
//   const { data: postes, error: posteError } = await supabase
//     .from("postes")
//     .select("id, label, enabled")
//     .eq("enabled", true)
//     .eq("company_id", userProfile.company_id);

//   if (posteError) {
//     return res.status(500).json({ error: posteError.message });
//   }
//   if (!postes || !postes.length) {
//     return res.status(200).json({ posteLabels: {}, posteVisibility: {}, sourceVisibility: {}, sources: {} });
//   }
//   const posteIds = postes.map(p => p.id);
//   const posteLabelMap = {};
//   postes.forEach(p => { posteLabelMap[p.id] = p.label; });

//   // 3. Get poste-level visibility for this user
//   const { data: posteVis, error: posteVisError } = await supabase
//     .from("poste_visibility")
//     .select("poste_id, is_hidden")
//     .eq("user_id", userId)
//     .in("poste_id", posteIds);

//   if (posteVisError) {
//     return res.status(500).json({ error: posteVisError.message });
//   }
//   const posteVisibility = {};
//   posteVis?.forEach(row => {
//     posteVisibility[row.poste_id] = row.is_hidden;
//   });

//   // 4. Get all enabled sources for those postes
//   const { data: sources, error: sourceError } = await supabase
//     .from("poste_sources")
//     .select("poste_id, source_code, label, enabled")
//     .in("poste_id", posteIds)
//     .eq("enabled", true);

//   if (sourceError) {
//     return res.status(500).json({ error: sourceError.message });
//   }

//   // Group by poste_id for easier frontend usage
//   const sourcesByPoste = {};
//   sources.forEach(src => {
//     if (!sourcesByPoste[src.poste_id]) sourcesByPoste[src.poste_id] = [];
//     sourcesByPoste[src.poste_id].push({
//       source_code: src.source_code,
//       label: src.label,
//       enabled: !!src.enabled,
//     });
//   });

//   // 5. Get per-source visibility for this user
//   const { data: srcVis, error: srcVisError } = await supabase
//     .from("poste_source_visibility")
//     .select("poste_id, source_code, is_hidden")
//     .eq("user_id", userId)
//     .in("poste_id", posteIds);

//   if (srcVisError) {
//     return res.status(500).json({ error: srcVisError.message });
//   }

//   // Build source-level map: { [poste_id]: { [source_code]: is_hidden } }
//   const sourceVisibility = {};
//   srcVis?.forEach(row => {
//     if (!sourceVisibility[row.poste_id]) sourceVisibility[row.poste_id] = {};
//     sourceVisibility[row.poste_id][row.source_code] = row.is_hidden;
//   });

//   // 6. Return result with label maps and all sources for the frontend
//   return res.status(200).json({
//     posteLabels: posteLabelMap,         // { poste_id: label }
//     posteVisibility,                    // { poste_id: is_hidden }
//     sourceVisibility,                   // { poste_id: { source_code: is_hidden } }
//     sources: sourcesByPoste             // { poste_id: [ {source_code, label, enabled} ] }
//   });
// }

