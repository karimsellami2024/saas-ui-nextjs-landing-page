import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/bulk-source-visibility
 * Body: { company_id: string, visible_sources: string[] }
 *
 * Sets is_hidden=false for sources in visible_sources,
 * and is_hidden=true for ALL other Cat1+Cat2 sources.
 * Applies to ALL users of the company.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { company_id, visible_sources } = req.body;

  if (!company_id || !Array.isArray(visible_sources)) {
    return res.status(400).json({ error: 'Missing company_id or visible_sources' });
  }

  // 1. Get all users in the company
  const { data: users, error: usersErr } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('company_id', company_id);
  if (usersErr) return res.status(500).json({ error: usersErr.message });

  // 2. Get Cat1 and Cat2 postes for the company
  const { data: postes, error: postesErr } = await supabaseAdmin
    .from('postes')
    .select('id, num')
    .eq('company_id', company_id)
    .in('num', [1, 2]);
  if (postesErr) return res.status(500).json({ error: postesErr.message });

  if (!postes?.length) {
    return res.status(404).json({ error: 'No Cat1/Cat2 postes found for this company' });
  }

  const posteIds = postes.map(p => p.id);

  // 3. Get all Cat1+Cat2 sources
  const { data: sources, error: sourcesErr } = await supabaseAdmin
    .from('poste_sources')
    .select('poste_id, source_code')
    .in('poste_id', posteIds);
  if (sourcesErr) return res.status(500).json({ error: sourcesErr.message });

  if (!sources?.length) {
    return res.status(404).json({ error: 'No sources found for Cat1/Cat2' });
  }

  // 4. Build upsert rows for every user × every source
  const now = new Date().toISOString();
  const rows: Array<{
    user_id: string;
    poste_id: string;
    source_code: string;
    is_hidden: boolean;
    updated_at: string;
  }> = [];

  for (const user of (users ?? [])) {
    for (const source of sources) {
      rows.push({
        user_id: user.id,
        poste_id: source.poste_id,
        source_code: source.source_code,
        is_hidden: !visible_sources.includes(source.source_code),
        updated_at: now,
      });
    }
  }

  // 5. Bulk upsert
  const { error: upsertErr } = await supabaseAdmin
    .from('poste_source_visibility')
    .upsert(rows, { onConflict: 'user_id,poste_id,source_code' });
  if (upsertErr) return res.status(500).json({ error: upsertErr.message });

  return res.status(200).json({ success: true, updated: rows.length });
}
