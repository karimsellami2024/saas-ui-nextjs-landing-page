import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const N8N_WEBHOOK_URL = process.env.N8N_ASSISTANT_WEBHOOK_URL!
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET

// In-memory rate limit store: 30 req/min per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const SENSITIVE_KEYS = [
  'password', 'passwd', 'token', 'secret', 'credit_card', 'card_number',
  'cvv', 'cvc', 'ssn', 'social_security', 'bank_account', 'api_key',
  'authorization', 'auth',
]

function redactSensitiveFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields)) {
    const sensitive = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))
    out[k] = sensitive ? '[REDACTÉ]' : v
  }
  return out
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const WINDOW = 60_000
  const LIMIT = 30

  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW })
    return true
  }
  if (entry.count >= LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    // Validate auth token
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans une minute.' },
        { status: 429 }
      )
    }

    // Parse body
    const body = await req.json()
    const { message, mode, sessionId, pageContext, companyContext } = body

    if (!message?.trim() || !mode) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Redact sensitive form fields before forwarding
    const safePageContext = {
      ...pageContext,
      formFields: pageContext?.formFields
        ? redactSensitiveFields(pageContext.formFields)
        : {},
    }

    // Build n8n payload
    const n8nPayload = {
      message,
      mode,
      userId: user.id,
      sessionId: sessionId || `${user.id}_${mode}`,
      pageContext: safePageContext,
      companyContext: companyContext || {},
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (N8N_SECRET) headers['X-Webhook-Secret'] = N8N_SECRET

    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(n8nPayload),
    })

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      console.error('[assistant/chat] n8n error:', n8nRes.status, errText)
      return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 502 })
    }

    const data = await n8nRes.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[assistant/chat] Error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
