import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { company_id, production_sites, products, vehicle_fleet } = req.body;

    if (!company_id) {
      return res.status(400).json({ error: "Missing company_id" });
    }

    const { data, error } = await supabase
      .from("companies")
      .update({
        production_sites, // will be stored as jsonb
        products,
        vehicle_fleet,
      })
      .eq("id", company_id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, company: data[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
