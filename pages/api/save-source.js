import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { poste_source_id, data } = req.body;
  if (!poste_source_id || !data) {
    return res.status(400).json({ error: "Missing poste_source_id or data" });
  }

  const { error } = await supabase
    .from('poste_sources')
    .update({ data })
    .eq('id', poste_source_id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
