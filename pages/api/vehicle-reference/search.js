import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const year = (req.query.year || '').trim();
    const make = (req.query.make || '').trim();
    const model = (req.query.model || '').trim();
    const limit = Math.min(parseInt(String(req.query.limit ?? '5'), 10) || 5, 25);

    if (!year || !make || !model)
      return res.status(400).json({ error: 'Missing year/make/model' });

    const { data, error } = await supabaseAdmin
      .from('vehicle_reference')
      .select(`
        year, make, model,
        transmission, fuel_type,
        city_l_100km, highway_l_100km, combined_l_100km,
        co2_g_km, combined_kwh_100km, weight_kg
      `)
      .eq('year', Number(year))
      .ilike('make', make)
      .ilike('model', model)
      .order('combined_l_100km', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) throw error;
    return res.status(200).json({ results: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
