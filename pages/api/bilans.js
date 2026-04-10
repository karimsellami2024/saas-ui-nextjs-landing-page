import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/bilans?user_id=xxx
// Returns all bilans (submissions) for the user's company, newest first
async function handleGet(req, res) {
  const { user_id: userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (profileErr || !profile?.company_id) {
    return res.status(400).json({ error: 'User has no company' });
  }

  const { data: bilans, error } = await supabase
    .from('submissions')
    .select('id, name, period_start, period_end, status, reporting_year, created_at, updated_at, locked')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ bilans: bilans ?? [] });
}

// POST /api/bilans
// Body: { user_id, name, period_start, period_end, reporting_year }
// Creates a new bilan (submission) and returns its id
async function handlePost(req, res) {
  const { user_id: userId, name, period_start, period_end, reporting_year } = req.body;

  if (!userId) return res.status(400).json({ error: 'Missing user_id' });
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (profileErr || !profile?.company_id) {
    return res.status(400).json({ error: 'User has no company' });
  }

  const { data: bilan, error } = await supabase
    .from('submissions')
    .insert({
      user_id: userId,
      company_id: profile.company_id,
      name: name.trim(),
      period_start: period_start ?? null,
      period_end: period_end ?? null,
      reporting_year: reporting_year ?? null,
      status: 'en_cours',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(201).json({ bilan });
}
