// pages/api/company-info.js
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      company_id,
      production_sites = [],
      products = [],
      services = [],                 // NEW
      vehicle_fleet = [],
      company_references = [],       // NEW (JSONB array)
    } = req.body || {};

    if (!company_id) {
      return res.status(400).json({ error: 'Missing company_id' });
    }

    // Light coercion to arrays to avoid null/undefined writes
    const toArray = (v) => (Array.isArray(v) ? v : []);
    const updatePayload = {
      production_sites: toArray(production_sites),
      products: toArray(products),
      services: toArray(services),                 // NEW
      vehicle_fleet: toArray(vehicle_fleet),
      company_references: toArray(company_references), // NEW
    };

    const { data, error } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', company_id)
      .select('id, name, production_sites, products, services, vehicle_fleet, company_references')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, company: data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
}


// import { supabase } from '../../lib/supabaseClient';

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { company_id, production_sites, products, vehicle_fleet } = req.body;

//     if (!company_id) {
//       return res.status(400).json({ error: "Missing company_id" });
//     }

//     const { data, error } = await supabase
//       .from("companies")
//       .update({
//         production_sites, // will be stored as jsonb
//         products,
//         vehicle_fleet,
//       })
//       .eq("id", company_id)
//       .select();

//     if (error) {
//       return res.status(500).json({ error: error.message });
//     }

//     return res.status(200).json({ success: true, company: data[0] });
//   } catch (err) {
//     return res.status(500).json({ error: err.message || "Internal error" });
//   }
// }
