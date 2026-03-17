'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

// ─── Page metadata: add/update routes to match your app ──────────────────────
// description is sent to the AI so it understands what the page is about
const PAGE_META = {
  '/': {
    label: 'Accueil',
    scope: null,
    description: "Page d'accueil de la plateforme Carbone Québec.",
  },
  '/intro': {
    label: 'Introduction',
    scope: null,
    description:
      "Page d'introduction et d'onboarding. L'utilisateur découvre les grandes catégories d'émissions GES (ISO 14064) et configure son périmètre d'inventaire.",
  },
  '/source': {
    label: "Sources d'émission",
    scope: null,
    description:
      "Tableau de bord principal des sources d'émission GES. L'utilisateur navigue entre les 6 catégories ISO 14064 (Catégorie 1 à 6) pour saisir ses données d'activité.",
  },
  '/bilan': {
    label: 'Bilan GES',
    scope: null,
    description:
      "Page de synthèse du bilan GES annuel. Affiche le total des émissions en tCO₂eq réparties par scope (direct, énergie, indirect), les barres de progression par poste, et la comparaison avec l'année précédente.",
  },
  '/chart': {
    label: 'Graphiques & Analyses',
    scope: null,
    description:
      "Visualisations graphiques des émissions GES : évolution temporelle, répartition par catégorie, comparaison par scope. Utile pour identifier les postes prioritaires de réduction.",
  },
  '/submissions': {
    label: 'Soumissions',
    scope: null,
    description:
      "Historique des formulaires soumis. L'utilisateur peut consulter, réviser ou exporter les données d'émissions saisies précédemment.",
  },
  '/Agent': {
    label: 'Agent IA',
    scope: null,
    description:
      "Page dédiée à l'agent IA d'entretien d'intégration. Permet de configurer ou tester l'agent de collecte de données.",
  },
  '/admin': {
    label: 'Administration',
    scope: null,
    description:
      "Portail administrateur. Gestion des utilisateurs, des entreprises, des rôles et des paramètres globaux de la plateforme.",
  },
  '/clientside': {
    label: 'Vue client',
    scope: null,
    description: 'Vue côté client des données GES.',
  },
  '/ProjetGESFIN': {
    label: 'Projet GESFIN',
    scope: null,
    description: 'Projet pilote GESFIN – collecte et analyse des émissions GES.',
  },

  // ── GES category form pages ────────────────────────────────────────────────
  '/source/categorie-1': {
    label: 'Catégorie 1 – Émissions directes',
    scope: 1,
    description:
      "Catégorie 1 (Scope 1) – Émissions directes issues de sources appartenant à l'entreprise : " +
      "combustion fixe (chaudières, fours → source 1A1), combustion mobile des véhicules de flotte (sources 2A1, 2A3, 2B1), " +
      "et fuites de réfrigérants (sources 4A1, 4B1, 4B2). " +
      "Pour la combustion : saisir le type de carburant, la quantité consommée (L ou m³), et la période. " +
      "Pour les véhicules : marque, modèle, année, distance parcourue ou coûts d'essence. " +
      "Pour les réfrigérants : type de fluide (R410A, R134a…), quantité rechargée en kg.",
  },
  '/source/categorie-2': {
    label: "Catégorie 2 – Énergie importée",
    scope: 2,
    description:
      "Catégorie 2 (Scope 2) – Émissions indirectes liées à la consommation d'électricité ou de chaleur achetée. " +
      "Source 6A1 : méthode location-based (facteur du réseau électrique régional, ex. Hydro-Québec ≈ 1,7 gCO₂eq/kWh). " +
      "Source 6B1 : méthode market-based (certificats d'énergie renouvelable ou contrats directs). " +
      "Données requises : kWh consommés sur la période, fournisseur d'électricité.",
  },
  '/source/categorie-3': {
    label: 'Catégorie 3 – Transports indirects',
    scope: 3,
    description:
      "Catégorie 3 (Scope 3 partiel) – Émissions indirectes liées aux transports non contrôlés par l'entreprise. " +
      "Source 3A1 : navettage des employés (domicile–travail). Données : nombre d'employés, distance moyenne aller-retour, " +
      "mode de transport (voiture, transport en commun, vélo…), jours travaillés par an. " +
      "Sources 4A1 / 4B1 : déplacements des visiteurs et clients.",
  },
  '/source/categorie-4': {
    label: 'Catégorie 4 – Hors énergie et transport',
    scope: 3,
    description:
      "Catégorie 4 (Scope 3) – Émissions indirectes hors énergie et transport : " +
      "appareils numériques achetés (4.1A2), réseaux et transfert de données (4.1B1), " +
      "salles de serveurs (4.1C1), papier d'imprimante (4.1D1), " +
      "alimentation/repas (4.1E1, 4.1E2), traitement des eaux usées (4.3A1). " +
      "Méthode générale : quantité achetée × facteur d'émission ADEME ou fournisseur.",
  },
  '/source/categorie-5': {
    label: 'Catégorie 5 – Utilisation des produits',
    scope: 3,
    description:
      "Catégorie 5 (Scope 3) – Émissions liées à l'utilisation et à la fin de vie des produits vendus. " +
      "Source 5.1A1 : produits vendus consommant de l'électricité (ex. électroménager, équipements). " +
      "Source 5.1B1 : produits vendus consommant des combustibles. " +
      "Source 5.2A1 : mise en décharge en fin de vie. Source 5.2B1 : recyclage ou incinération.",
  },
  '/source/categorie-6': {
    label: 'Catégorie 6 – Autres émissions indirectes',
    scope: null,
    description:
      "Catégorie 6 – Autres émissions indirectes non couvertes par les catégories précédentes " +
      "(ex. émissions liées aux investissements, franchises, leasing opérationnel).",
  },
}

// ─── Mode configuration ───────────────────────────────────────────────────────
const MODES = {
  guidance: {
    label: 'Guidage',
    emoji: '🧭',
    color: '#00c9a7',
    lightBg: '#e6fff9',
    suggestions: [
      'Que faire sur cette page ?',
      'Quelle méthodologie choisir ?',
      'Quelles données collecter ?',
      'Guide moi étape par étape',
    ],
  },
  form: {
    label: 'Formulaire',
    emoji: '⚡',
    color: '#4f8ef7',
    lightBg: '#eef4ff',
    suggestions: [
      'Vérifie mes saisies',
      'Y a-t-il des incohérences ?',
      'Explique ce champ',
      'Quelle méthode recommandes-tu ?',
    ],
  },
  knowledge: {
    label: 'Savoir',
    emoji: '📚',
    color: '#f7964f',
    lightBg: '#fff4eb',
    suggestions: [
      "Qu'est-ce que le GHG Protocol ?",
      'Différence Scope 1/2/3 ?',
      "C'est quoi les PRG ?",
      'Méthode dépenses vs activité ?',
    ],
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
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

  // Match current pathname (supports exact + prefix)
  const pageMeta =
    PAGE_META[pathname] ||
    Object.entries(PAGE_META).find(([k]) => k !== '/' && pathname.startsWith(k))?.[1] ||
    { label: pathname, scope: null }

  const cfg = MODES[mode]
  const currentMessages = messages[mode]

  // Auto-scroll
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Clear unread when panel opens
  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  // Focus input when panel opens or mode changes
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [mode, open])

  function readFormFields() {
    const fields = {}
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.type === 'password' || el.type === 'hidden') return
      const key =
        el.name || el.id || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('data-field')
      if (key && el.value) fields[key] = el.value
    })
    return fields
  }

  function readHeadings() {
    return Array.from(document.querySelectorAll('h1, h2, h3'))
      .map((h) => h.textContent?.trim())
      .filter(Boolean)
      .slice(0, 8)
  }

  // Reads the active navigation item from the sidebar / tabs
  function readActiveNav() {
    const candidates = [
      // Chakra / custom active states
      ...Array.from(document.querySelectorAll('[aria-current="page"], [data-active="true"], [aria-selected="true"]')),
      // Common CSS class patterns used in the app
      ...Array.from(document.querySelectorAll('.active, [class*="active"], [class*="selected"]')),
    ]
    const labels = candidates
      .map((el) => el.textContent?.trim())
      .filter((t) => t && t.length > 1 && t.length < 80)
    // Deduplicate
    return [...new Set(labels)].slice(0, 5)
  }

  // Reads visible section labels (badges, tags, breadcrumbs)
  function readVisibleContext() {
    const ctx = {}

    // Breadcrumbs
    const breadcrumbs = Array.from(document.querySelectorAll('[aria-label="breadcrumb"] *, nav ol li, .breadcrumb li'))
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
    if (breadcrumbs.length) ctx.breadcrumbs = breadcrumbs

    // Active tab labels
    const tabs = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"], [role="tab"].active'))
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
    if (tabs.length) ctx.activeTabs = tabs

    // Visible badge / status text (e.g. "Catégorie 1 · Scope 1")
    const badges = Array.from(document.querySelectorAll('[data-section-label], [data-scope], [data-category]'))
      .map((el) => el.textContent?.trim() || el.getAttribute('data-section-label') || el.getAttribute('data-scope'))
      .filter(Boolean)
    if (badges.length) ctx.badges = badges

    // First paragraph of main content — gives the AI a sentence of context
    const firstPara = document.querySelector('main p, [role="main"] p, .main-content p')
    if (firstPara?.textContent?.trim()) ctx.firstParagraph = firstPara.textContent.trim().slice(0, 200)

    return ctx
  }

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim()
      if (!trimmed || loading) return

      setMessages((prev) => ({
        ...prev,
        [mode]: [...prev[mode], { role: 'user', content: trimmed, ts: Date.now() }],
      }))
      setInput('')
      setLoading(true)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: trimmed,
            mode,
            sessionId: `${userId}_${mode}`,
            platformContext: {
              name: 'Carbone Québec',
              domain: 'GES – Gaz à Effet de Serre (greenhouse gas emissions)',
              standard: 'ISO 14064 / GHG Protocol',
              language: 'fr',
              note: "Cette plateforme concerne exclusivement les GES (Gaz à Effet de Serre). Ne pas confondre avec l'ESG (Environmental, Social, Governance). Toujours utiliser l'acronyme GES.",
            },
            pageContext: {
              pathname,
              pageLabel: pageMeta.label,
              pageDescription: pageMeta.description || '',
              scope: pageMeta.scope,
              headings: readHeadings(),
              activeNavItems: readActiveNav(),
              visibleContext: readVisibleContext(),
              formFields: mode === 'form' ? readFormFields() : {},
            },
            companyContext,
          }),
        })

        const data = await res.json()
        const reply = data.reply || "Désolé, je n'ai pas pu répondre."

        setMessages((prev) => ({
          ...prev,
          [mode]: [...prev[mode], { role: 'assistant', content: reply, ts: Date.now() }],
        }))

        if (!open) setUnread((n) => n + 1)
      } catch (err) {
        console.error('[AIAssistant]', err)
        setMessages((prev) => ({
          ...prev,
          [mode]: [
            ...prev[mode],
            { role: 'assistant', content: "Une erreur s'est produite. Veuillez réessayer.", ts: Date.now() },
          ],
        }))
      } finally {
        setLoading(false)
      }
    },
    [loading, mode, pathname, pageMeta, userId, companyContext, open]
  )

  // ─── Inline styles ──────────────────────────────────────────────────────────
  const fabStyle = {
    position: 'fixed',
    bottom: 28,
    right: 28,
    zIndex: 9999,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: cfg.color,
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.28)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  }

  const panelStyle = {
    position: 'fixed',
    bottom: 96,
    right: 28,
    zIndex: 9998,
    width: 390,
    maxWidth: 'calc(100vw - 48px)',
    height: 530,
    maxHeight: 'calc(100vh - 120px)',
    background: 'white',
    borderRadius: 18,
    boxShadow: '0 10px 48px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: `2px solid ${cfg.color}33`,
  }

  const msgStyle = (role) => ({
    maxWidth: '86%',
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    background: role === 'user' ? cfg.color : '#f4f4f4',
    color: role === 'user' ? 'white' : '#333',
    borderRadius: role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    padding: '10px 14px',
    fontSize: 14,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  })

  const tabStyle = (m) => ({
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    background: mode === m ? MODES[m].lightBg : 'transparent',
    color: mode === m ? MODES[m].color : '#999',
    fontWeight: mode === m ? 700 : 400,
    fontSize: 12,
    cursor: 'pointer',
    borderBottom: mode === m ? `2px solid ${MODES[m].color}` : '2px solid transparent',
    transition: 'all 0.12s',
  })

  const chipStyle = {
    background: cfg.lightBg,
    color: cfg.color,
    border: `1px solid ${cfg.color}55`,
    borderRadius: 20,
    padding: '5px 12px',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  }

  return (
    <>
      {/* Floating button */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={fabStyle}
          aria-label="Ouvrir l'assistant IA"
          title="Assistant IA – Carbone Québec"
        >
          {open ? '✕' : cfg.emoji}
        </button>
        {unread > 0 && !open && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#e53e3e',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <div
            style={{
              background: cfg.color,
              color: 'white',
              padding: '12px 16px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
                {cfg.emoji} Assistant GES
                {pageMeta.scope !== null && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.25)',
                      borderRadius: 20,
                      padding: '2px 9px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Scope {pageMeta.scope}
                  </span>
                )}
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                  opacity: 0.85,
                }}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>📍 {pageMeta.label}</div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
            {Object.entries(MODES).map(([m, c]) => (
              <button key={m} style={tabStyle(m)} onClick={() => setMode(m)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {currentMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: '20px 8px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{cfg.emoji}</div>
                <strong style={{ color: '#555' }}>Mode {cfg.label}</strong>
                <br />
                <span style={{ fontSize: 12 }}>
                  {mode === 'guidance' && 'Posez vos questions sur cette page ou sur la méthodologie à adopter.'}
                  {mode === 'form' && 'Je lis vos saisies en temps réel et détecte les incohérences.'}
                  {mode === 'knowledge' && 'GHG Protocol, ISO 14064, facteurs ADEME, Scope 1/2/3…'}
                </span>
              </div>
            )}

            {currentMessages.map((m, i) => (
              <div key={i} style={msgStyle(m.role)}>
                {m.content}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: 'flex',
                  gap: 5,
                  padding: '10px 14px',
                  background: '#f4f4f4',
                  borderRadius: '16px 16px 16px 4px',
                  alignSelf: 'flex-start',
                  width: 52,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#bbb',
                      animation: `cq-bounce 1s infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips (shown only when no messages yet) */}
          {currentMessages.length === 0 && (
            <div
              style={{
                padding: '6px 12px 10px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                borderTop: '1px solid #f0f0f0',
              }}
            >
              {cfg.suggestions.map((s, i) => (
                <button
                  key={i}
                  style={chipStyle}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              padding: '10px 12px',
              gap: 8,
              borderTop: '1px solid #f0f0f0',
              background: 'white',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder={`Message (mode ${cfg.label.toLowerCase()})…`}
              rows={1}
              style={{
                flex: 1,
                border: `1.5px solid ${cfg.color}66`,
                borderRadius: 20,
                padding: '9px 14px',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.4,
                maxHeight: 100,
                overflowY: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = cfg.color)}
              onBlur={(e) => (e.target.style.borderColor = `${cfg.color}66`)}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: loading || !input.trim() ? '#ddd' : cfg.color,
                color: 'white',
                border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              aria-label="Envoyer"
            >
              {loading ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animation for loading dots */}
      <style>{`
        @keyframes cq-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
