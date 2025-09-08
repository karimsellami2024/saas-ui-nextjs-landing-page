import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  try {
    const year = (req.query.year || '').trim();
    const make = (req.query.make || '').trim();

    if (!year && !make) {
      const { data, error } = await supabaseAdmin
        .from('vehicle_reference')
        .select('year', { distinct: true })
        .order('year', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ years: (data || []).map(r => String(r.year)).filter(Boolean) });
    }

    if (year && !make) {
      const { data, error } = await supabaseAdmin
        .from('vehicle_reference')
        .select('make', { distinct: true })
        .eq('year', Number(year))
        .order('make', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ makes: (data || []).map(r => r.make).filter(Boolean) });
    }

    if (year && make) {
      const { data, error } = await supabaseAdmin
        .from('vehicle_reference')
        .select('model', { distinct: true })
        .eq('year', Number(year))
        .ilike('make', make)
        .order('model', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ models: (data || []).map(r => r.model).filter(Boolean) });
    }

    return res.status(400).json({ error: 'Bad params' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
