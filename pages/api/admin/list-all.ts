// pages/api/admin/list-all.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use your service role key!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. List users with admin API
  const { data: usersData, error: userError } = await supabase.auth.admin.listUsers()

  // 2. Fetch postes and visibilities as before
  const { data: postes, error: posteError } = await supabase
    .from('postes')
    .select('id, poste_num, poste_label')
  const { data: visibilities, error: visError } = await supabase
    .from('poste_visibility')
    .select('user_id, poste_id, is_hidden')

  if (userError || posteError || visError) {
    return res.status(500).json({
      error: userError?.message || posteError?.message || visError?.message
    })
  }

  // usersData.users is the array of user objects
  const users = usersData.users.map((u: any) => ({
    id: u.id,
    email: u.email
  }))

  return res.status(200).json({ users, postes, visibilities })
}
