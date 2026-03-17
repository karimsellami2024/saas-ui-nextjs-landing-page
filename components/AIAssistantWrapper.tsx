'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import AIAssistant from './AIAssistant'

// Pages where the assistant should NOT appear
const HIDDEN_PATHS = ['/login', '/signup', '/']

interface CompanyContext {
  name: string
  sector: string
  reportingYear: number
}

export default function AIAssistantWrapper() {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [companyContext, setCompanyContext] = useState<Partial<CompanyContext>>({})

  useEffect(() => {
    async function loadUserData(uid: string) {
      setUserId(uid)

      // Fetch company name via user_profiles → companies join
      const { data } = await supabase
        .from('user_profiles')
        .select('company_id, companies(name)')
        .eq('id', uid)
        .single()

      if (data?.companies) {
        const company = data.companies as { name: string } | { name: string }[]
        const name = Array.isArray(company) ? company[0]?.name : company?.name
        setCompanyContext({
          name: name || 'Entreprise',
          sector: 'Général',
          reportingYear: new Date().getFullYear(),
        })
      }
    }

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserData(session.user.id)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        setUserId(null)
        setCompanyContext({})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Don't render on marketing / auth pages, or when not logged in
  if (HIDDEN_PATHS.includes(pathname) || !userId) return null

  return <AIAssistant userId={userId} companyContext={companyContext} />
}
