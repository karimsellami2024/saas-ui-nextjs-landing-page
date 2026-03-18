'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

/* ─── Brand palette ─────────────────────────────────────────────────────────── */
const P = {
  dark:    '#1B2E25',
  brand:   '#344E41',
  accent:  '#588157',
  light:   '#A3B18A',
  soft:    '#DDE5E0',
  bg:      '#F5F6F4',
  border:  '#E4E6E1',
  muted:   '#6B7A72',
  white:   '#FFFFFF',
  text:    '#1E2D26',
}

/* ─── Page metadata ──────────────────────────────────────────────────────────── */
const PAGE_META = {
  '/': { label: 'Accueil', scope: null, description: "Page d'accueil de la plateforme Carbone Québec." },
  '/intro': { label: 'Introduction', scope: null, description: "Page d'introduction et d'onboarding. L'utilisateur découvre les grandes catégories d'émissions GES (ISO 14064) et configure son périmètre d'inventaire." },
  '/source': { label: "Sources d'émission", scope: null, description: "Tableau de bord principal des sources d'émission GES. L'utilisateur navigue entre les 6 catégories ISO 14064 (Catégorie 1 à 6) pour saisir ses données d'activité." },
  '/bilan': { label: 'Bilan GES', scope: null, description: "Page de synthèse du bilan GES annuel. Affiche le total des émissions en tCO₂eq réparties par scope (direct, énergie, indirect), les barres de progression par poste, et la comparaison avec l'année précédente." },
  '/chart': { label: 'Tableau de bord', scope: null, description: "Tableau de bord principal du calculateur GES. L'utilisateur saisit ses données par catégorie et consulte son bilan." },
  '/submissions': { label: 'Soumissions', scope: null, description: "Historique des formulaires soumis. L'utilisateur peut consulter, réviser ou exporter les données d'émissions saisies précédemment." },
  '/Agent': { label: 'Agent IA', scope: null, description: "Page dédiée à l'agent IA d'entretien d'intégration." },
  '/admin': { label: 'Administration', scope: null, description: "Portail administrateur. Gestion des utilisateurs, des entreprises, des rôles et des paramètres globaux de la plateforme." },
  '/source/categorie-1': { label: 'Catégorie 1 – Émissions directes', scope: 1, description: "Catégorie 1 (Scope 1) – Émissions directes issues de sources appartenant à l'entreprise : combustion fixe (chaudières, fours → source 1A1), combustion mobile des véhicules de flotte (sources 2A1, 2A3, 2B1), et fuites de réfrigérants (sources 4A1, 4B1, 4B2). Pour la combustion : saisir le type de carburant, la quantité consommée (L ou m³), et la période. Pour les véhicules : marque, modèle, année, distance parcourue ou coûts d'essence. Pour les réfrigérants : type de fluide (R410A, R134a…), quantité rechargée en kg." },
  '/source/categorie-2': { label: "Catégorie 2 – Énergie importée", scope: 2, description: "Catégorie 2 (Scope 2) – Émissions indirectes liées à la consommation d'électricité ou de chaleur achetée. Source 6A1 : méthode location-based (facteur du réseau électrique régional, ex. Hydro-Québec ≈ 1,7 gCO₂eq/kWh). Source 6B1 : méthode market-based (certificats d'énergie renouvelable ou contrats directs). Données requises : kWh consommés sur la période, fournisseur d'électricité." },
  '/source/categorie-3': { label: 'Catégorie 3 – Transports indirects', scope: 3, description: "Catégorie 3 (Scope 3 partiel) – Émissions indirectes liées aux transports non contrôlés par l'entreprise. Source 3A1 : navettage des employés (domicile–travail). Données : nombre d'employés, distance moyenne aller-retour, mode de transport (voiture, transport en commun, vélo…), jours travaillés par an." },
  '/source/categorie-4': { label: 'Catégorie 4 – Hors énergie et transport', scope: 3, description: "Catégorie 4 (Scope 3) – Émissions indirectes hors énergie et transport : appareils numériques achetés (4.1A2), réseaux et transfert de données (4.1B1), salles de serveurs (4.1C1), papier d'imprimante (4.1D1), alimentation/repas (4.1E1, 4.1E2), traitement des eaux usées (4.3A1)." },
  '/source/categorie-5': { label: 'Catégorie 5 – Utilisation des produits', scope: 3, description: "Catégorie 5 (Scope 3) – Émissions liées à l'utilisation et à la fin de vie des produits vendus. Source 5.1A1 : produits vendus consommant de l'électricité. Source 5.1B1 : produits vendus consommant des combustibles. Source 5.2A1 : mise en décharge en fin de vie. Source 5.2B1 : recyclage ou incinération." },
  '/source/categorie-6': { label: 'Catégorie 6 – Autres émissions indirectes', scope: null, description: "Catégorie 6 – Autres émissions indirectes non couvertes par les catégories précédentes (ex. émissions liées aux investissements, franchises, leasing opérationnel)." },
}

/* ─── Modes ──────────────────────────────────────────────────────────────────── */
const MODES = {
  guidance: {
    label: 'Guidage',
    icon: '🧭',
    color: P.brand,
    lightBg: '#EDF2EE',
    suggestions: ['Que faire sur cette page ?', 'Quelle méthodologie choisir ?', 'Quelles données collecter ?', 'Guide moi étape par étape'],
  },
  form: {
    label: 'Formulaire',
    icon: '⚡',
    color: P.accent,
    lightBg: '#EFF5EF',
    suggestions: ['Vérifie mes saisies', 'Y a-t-il des incohérences ?', 'Explique ce champ', 'Quelle méthode recommandes-tu ?'],
  },
  knowledge: {
    label: 'Savoir',
    icon: '📚',
    color: '#4A7C59',
    lightBg: '#EEF4EF',
    suggestions: ["Qu'est-ce que le GHG Protocol ?", 'Différence Scope 1/2/3 ?', "C'est quoi les PRG ?", 'Méthode dépenses vs activité ?'],
  },
}

/* ─── Component ──────────────────────────────────────────────────────────────── */
export default function AIAssistant({ userId, companyContext = {} }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('guidance')
  const [messages, setMessages] = useState({ guidance: [], form: [], knowledge: [] })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const pageMeta =
    PAGE_META[pathname] ||
    Object.entries(PAGE_META).find(([k]) => k !== '/' && pathname.startsWith(k))?.[1] ||
    { label: pathname, scope: null }

  const cfg = MODES[mode]
  const currentMessages = messages[mode]

  useEffect(() => { if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])
  useEffect(() => { if (open) setUnread(0) }, [open])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [mode, open])

  function readFormFields() {
    const fields = {}
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.type === 'password' || el.type === 'hidden') return
      const key = el.name || el.id || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('data-field')
      if (key && el.value) fields[key] = el.value
    })
    return fields
  }

  function readHeadings() {
    return Array.from(document.querySelectorAll('h1, h2, h3'))
      .map((h) => h.textContent?.trim()).filter(Boolean).slice(0, 8)
  }

  function readActiveNav() {
    const candidates = [
      ...Array.from(document.querySelectorAll('[aria-current="page"], [data-active="true"], [aria-selected="true"]')),
      ...Array.from(document.querySelectorAll('.active, [class*="active"], [class*="selected"]')),
    ]
    return [...new Set(candidates.map((el) => el.textContent?.trim()).filter((t) => t && t.length > 1 && t.length < 80))].slice(0, 5)
  }

  function readVisibleContext() {
    const ctx = {}
    const breadcrumbs = Array.from(document.querySelectorAll('[aria-label="breadcrumb"] *, nav ol li, .breadcrumb li')).map((el) => el.textContent?.trim()).filter(Boolean)
    if (breadcrumbs.length) ctx.breadcrumbs = breadcrumbs
    const tabs = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"], [role="tab"].active')).map((el) => el.textContent?.trim()).filter(Boolean)
    if (tabs.length) ctx.activeTabs = tabs
    return ctx
  }

  const sendMessage = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed || loading) return
    setMessages((prev) => ({ ...prev, [mode]: [...prev[mode], { role: 'user', content: trimmed, ts: Date.now() }] }))
    setInput('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          message: trimmed, mode, sessionId: `${userId}_${mode}`,
          platformContext: { name: 'Carbone Québec', domain: 'GES – Gaz à Effet de Serre', standard: 'ISO 14064 / GHG Protocol', language: 'fr', note: "Cette plateforme concerne exclusivement les GES. Toujours utiliser l'acronyme GES." },
          pageContext: { pathname, pageLabel: pageMeta.label, pageDescription: pageMeta.description || '', scope: pageMeta.scope, headings: readHeadings(), activeNavItems: readActiveNav(), visibleContext: readVisibleContext(), formFields: mode === 'form' ? readFormFields() : {} },
          companyContext,
        }),
      })
      const data = await res.json()
      const reply = data.reply || "Désolé, je n'ai pas pu répondre."
      setMessages((prev) => ({ ...prev, [mode]: [...prev[mode], { role: 'assistant', content: reply, ts: Date.now() }] }))
      if (!open) setUnread((n) => n + 1)
    } catch (err) {
      console.error('[AIAssistant]', err)
      setMessages((prev) => ({ ...prev, [mode]: [...prev[mode], { role: 'assistant', content: "Une erreur s'est produite. Veuillez réessayer.", ts: Date.now() }] }))
    } finally {
      setLoading(false)
    }
  }, [loading, mode, pathname, pageMeta, userId, companyContext, open])

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── FAB ── */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Ouvrir l'assistant IA"
          style={{
            width: 54, height: 54, borderRadius: '50%',
            background: open ? P.accent : P.brand,
            color: 'white', border: 'none', cursor: 'pointer',
            fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 20px rgba(52,78,65,0.40)`,
            transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(52,78,65,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(52,78,65,0.40)' }}
        >
          {open ? '✕' : '💬'}
        </button>

        {/* Unread badge */}
        {unread > 0 && !open && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#E53E3E', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>

      {/* ── Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 94, right: 28, zIndex: 9998,
          width: 390, maxWidth: 'calc(100vw - 48px)',
          height: 540, maxHeight: 'calc(100vh - 120px)',
          background: P.white, borderRadius: 20,
          boxShadow: '0 16px 56px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: `1px solid ${P.border}`,
        }}>

          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${P.dark} 0%, ${P.brand} 100%)`,
            color: 'white', padding: '14px 16px 12px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {/* Avatar */}
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  💬
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Assistant GES</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A3B18A', animation: 'cq-pulse 2s ease infinite' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {pageMeta.scope !== null ? `Scope ${pageMeta.scope} · ` : ''}{pageMeta.label}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14, width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }} aria-label="Fermer">✕</button>
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: P.bg, borderBottom: `1px solid ${P.border}` }}>
            {Object.entries(MODES).map(([m, c]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '9px 4px', border: 'none',
                background: mode === m ? P.white : 'transparent',
                color: mode === m ? c.color : P.muted,
                fontWeight: mode === m ? 700 : 400,
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                borderBottom: mode === m ? `2px solid ${c.color}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: P.muted, fontSize: 13, padding: '24px 12px 0' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>{cfg.icon}</div>
                <div style={{ fontWeight: 700, color: P.text, marginBottom: 4, fontSize: 14 }}>Mode {cfg.label}</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: P.muted }}>
                  {mode === 'guidance' && 'Posez vos questions sur cette page ou sur la méthodologie à adopter.'}
                  {mode === 'form' && 'Je lis vos saisies en temps réel et détecte les incohérences.'}
                  {mode === 'knowledge' && 'GHG Protocol, ISO 14064, facteurs ADEME, Scope 1/2/3…'}
                </div>
              </div>
            )}

            {currentMessages.map((m, i) => (
              <div key={i} style={{
                maxWidth: '86%',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? P.brand : P.bg,
                color: m.role === 'user' ? 'white' : P.text,
                border: m.role === 'user' ? 'none' : `1px solid ${P.border}`,
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: 'flex', gap: 5, padding: '10px 14px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '16px 16px 16px 4px', alignSelf: 'flex-start', width: 56 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: P.light, animation: `cq-bounce 1s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {currentMessages.length === 0 && (
            <div style={{ padding: '6px 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: `1px solid ${P.border}`, background: P.bg }}>
              {cfg.suggestions.map((s, i) => (
                <button key={i} disabled={loading} onClick={() => sendMessage(s)} style={{
                  background: P.white, color: cfg.color,
                  border: `1px solid ${P.border}`,
                  borderRadius: 20, padding: '5px 12px',
                  fontSize: 11.5, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit', fontWeight: 500,
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', alignItems: 'flex-end', padding: '10px 12px', gap: 8, borderTop: `1px solid ${P.border}`, background: P.white }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder={`Message (${cfg.label.toLowerCase()})…`}
              rows={1}
              style={{
                flex: 1, border: `1.5px solid ${P.border}`, borderRadius: 16,
                padding: '9px 14px', fontSize: 13.5, outline: 'none',
                resize: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                maxHeight: 100, overflowY: 'auto', color: P.text,
                background: P.bg, transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = P.brand)}
              onBlur={(e) => (e.target.style.borderColor = P.border)}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: loading || !input.trim() ? P.soft : P.brand,
                color: 'white', border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
              aria-label="Envoyer"
            >
              {loading ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cq-bounce { 0%,80%,100%{transform:translateY(0);opacity:0.5} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes cq-pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </>
  )
}
