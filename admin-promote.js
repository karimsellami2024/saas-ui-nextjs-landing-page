// admin-promote.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wnkjmyncvfvdbvxgzhmg.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indua2pteW5jdmZ2ZGJ2eGd6aG1nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM0Njc4MiwiZXhwIjoyMDY1OTIyNzgyfQ.P6TCm7cYJ1-J5sSwUXMJmcxJ6btk47XI51dKI1Ca5rA'

// The user id to promote
const USER_ID = 'e4a65e68-7463-468b-bb39-5e83074e54e3' // Replace with your actual user UUID

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function promoteToAdmin(user_id) {
  const { data, error } = await supabase.auth.admin.updateUserById(user_id, {
    user_metadata: { role: 'admin' }
  })
  if (error) {
    console.error('Failed to promote:', error)
  } else {
    console.log('User promoted to admin:', data)
  }
}

promoteToAdmin(USER_ID)
