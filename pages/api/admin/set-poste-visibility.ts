import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Service role for admin operations — keep in server!
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // ---------- GET: List users/postes/visibilities ----------
    // Get all users
    const { data: usersData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    if (userError) {
      return res.status(500).json({ error: userError.message })
    }
    const users = usersData.users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
    }))

    // Get all postes
    const { data: postes, error: postesError } = await supabaseAdmin
      .from('postes')
      .select('id,poste_num,poste_label')
    if (postesError) {
      return res.status(500).json({ error: postesError.message })
    }

    // Get all poste visibilities
    const { data: visibilities, error: visError } = await supabaseAdmin
      .from('poste_visibility')
      .select('*')
    if (visError) {
      return res.status(500).json({ error: visError.message })
    }

    return res.status(200).json({ users, postes, visibilities })
  }

  if (req.method === 'POST') {
    // ---------- POST: Update poste_visibility ----------
    const { user_id, poste_id, is_hidden } = req.body
    if (!user_id || !poste_id || typeof is_hidden !== "boolean") {
      return res.status(400).json({ error: 'Paramètres manquants ou invalides' })
    }

    const { error } = await supabaseAdmin
      .from('poste_visibility')
      .upsert(
        [{
          user_id,
          poste_id,
          is_hidden,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: 'user_id,poste_id' }
      )

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  }

  // If neither GET nor POST
  return res.status(405).json({ error: 'Méthode non autorisée' })
}
