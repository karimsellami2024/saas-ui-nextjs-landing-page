import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id, poste_id, source_code, is_hidden } = req.body;

  if (
    typeof user_id !== "string" ||
    typeof poste_id !== "string" ||
    typeof source_code !== "string" ||
    typeof is_hidden !== "boolean"
  ) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  // Upsert (insert or update) the source visibility
  const { data, error } = await supabaseAdmin
    .from("poste_source_visibility")
    .upsert(
      [{
        user_id,
        poste_id,
        source_code,
        is_hidden,
        updated_at: new Date().toISOString(),
      }],
      { onConflict: 'user_id,poste_id,source_code' }
    )
    .select() // Optional: return the upserted row(s)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, data });
}
