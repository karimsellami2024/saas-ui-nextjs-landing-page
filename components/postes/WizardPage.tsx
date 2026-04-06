'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Box, VStack, HStack, Heading, Text, Button, Progress,
  Select, Input, Spinner, useToast, Badge, Flex, Icon, Divider,
  Table, Thead, Tbody, Tr, Th, Td, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
} from '@chakra-ui/react'
import { FiUploadCloud, FiCheck, FiArrowRight, FiArrowLeft, FiTruck } from 'react-icons/fi'
import { supabase } from '../../lib/supabaseClient'

/* ── Design tokens ───────────────────────────────────────────── */
const G = {
  dark:    '#1B2E25',
  brand:   '#264a3b',
  accent:  '#344E41',
  soft:    '#DDE5E0',
  bg:      '#F3F6EF',
  surface: '#FFFFFF',
  border:  '#E1E7E3',
  muted:   '#6B7A72',
}

/* ── Emission factors (ECCC 2022, contexte québécois) ────────── */
const COMBUSTION_FUELS = [
  { label: 'Gaz naturel',   unit: 'm³', kgco2e: 1.900, kwh: 10.35 },
  { label: 'Mazout léger',  unit: 'L',  kgco2e: 2.750, kwh: 10.08 },
  { label: 'Mazout lourd',  unit: 'L',  kgco2e: 3.170, kwh: 11.14 },
  { label: 'Propane',       unit: 'L',  kgco2e: 1.540, kwh: 6.93  },
  { label: 'Diesel',        unit: 'L',  kgco2e: 2.680, kwh: 9.97  },
  { label: 'Essence',       unit: 'L',  kgco2e: 2.290, kwh: 8.77  },
]
const MOBILE_FUELS = [
  { label: 'Essence', kgco2e: 2.290 },
  { label: 'Diesel',  kgco2e: 2.680 },
  { label: 'Propane', kgco2e: 1.540 },
]
const PROVINCES: Record<string, number> = {
  "QuÃ©bec": 0.002,
  "Ontario": 0.056,
  "Colombie-Britannique": 0.013,
  "Alberta": 0.670,
  "Manitoba": 0.004,
  "Saskatchewan": 0.510,
  "Nouvelle-Ã‰cosse": 0.670,
  "Nouveau-Brunswick": 0.300,
  "ÃŽle-du-Prince-Ã‰douard": 0.280,
  "Terre-Neuve-et-Labrador": 0.019,
  "Nunavut": 0.733,
  "Territoires du Nord-Ouest": 0.279,
  "Yukon": 0.073,
}
const REFRIGERANTS = [
  { label: 'R410A', prg: 2088 },
  { label: 'R22',   prg: 1810 },
  { label: 'R134a', prg: 1430 },
  { label: 'R-134a', prg: 1430 },
  { label: 'R404A', prg: 3922 },
  { label: 'R407C', prg: 1774 },
  { label: 'R32',   prg: 675  },
  { label: 'R507A', prg: 3985 },
]

/* ── Source metadata ─────────────────────────────────────────── */
const SOURCE_META: Record<string, { poste_num: number; label: string; icon: string; scope: 1|2|3 }> = {
  '1A1': { poste_num: 1, label: 'Combustion fixe',                icon: '🔥', scope: 1 },
  '2A1': { poste_num: 2, label: 'Véhicules — factures carburant', icon: '🚗', scope: 1 },
  '2A3': { poste_num: 2, label: 'Véhicules — dépenses ($)',       icon: '💳', scope: 1 },
  '2B1': { poste_num: 2, label: 'Véhicules — distance parcourue', icon: '📍', scope: 1 },
  '4A1': { poste_num: 4, label: 'Réfrigérants fixes',             icon: '❄️', scope: 1 },
  '4B1': { poste_num: 4, label: 'Réfrigérants véhicules (moy.)', icon: '🌡️', scope: 1 },
  '4B2': { poste_num: 4, label: 'Réfrigérants véhicules (data)', icon: '🌡️', scope: 1 },
  '6A1': { poste_num: 6, label: 'Électricité — réseau',           icon: '⚡', scope: 2 },
  '6B1': { poste_num: 6, label: 'Électricité — marché',           icon: '🌿', scope: 2 },
}

/* ── Default form data ───────────────────────────────────────── */
const DEFAULT_FORM: Record<string, Record<string, string>> = {
  '1A1': { fuel: 'Gaz naturel', qty: '' },
  '2A1': { fuel: 'Essence', qty: '' },
  '2A3': { fuel: 'Essence', estimateQty: '' },
  '2B1': { fuel: 'Essence', km: '', l100km: '10' },
  '4A1': { refrigerant: 'R-134a', qtyInEquipment: '', leakObserved: '' },
  '4B1': { refrigerant: 'R-134a', qtyInEquipment: '', leakObserved: '', climatisation: 'Oui' },
  '4B2': { refrigerant: 'R-134a', qtyInEquipment: '', leakObserved: '' },
  '6A1': { province: 'QuÃ©bec', kwh: '' },
  '6B1': { kwh: '', carbonIntensity: '' },
}

/* ── DB-backed refs (same tables as category forms) ──────────── */
type WizardRefs = {
  fixedEF: Array<{ label: string; unit?: string; gco2: number; gch4: number; gn2o: number; kwh: number }>
  mobileEF: Array<{ carburant: string; type_vehicule: string; unit?: string; co2: number; ch4: number; n2o: number; co2eq: number; kwh: number }>
  prpCO2: number
  prpCH4: number
  prpN2O: number
  refrigerantGWP: Record<string, number>
}

/* normalise string for fuzzy lookup (same as 2A3 form) */
const norm = (s: any) =>
  String(s ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')

/* ── Result computation (same formula as category forms) ─────── */
function computeResults(code: string, fd: Record<string, any>, refs: WizardRefs | null) {
  const zero = {
    total_ges_tco2e: 0, total_co2_gco2e: 0,
    total_ges_ch4_gco2e: 0, total_ges_n2o_gco2e: 0,
    total_ges_gco2e: 0, total_energie_kwh: 0,
  }
  if (!refs) return zero

  const { prpCO2, prpCH4, prpN2O } = refs

  const make = (co2_g: number, ch4_g: number, n2o_g: number, kwh: number) => {
    const total_g = co2_g + ch4_g + n2o_g
    return {
      total_co2_gco2e:     co2_g,
      total_ges_ch4_gco2e: ch4_g,
      total_ges_n2o_gco2e: n2o_g,
      total_ges_gco2e:     total_g,
      total_ges_tco2e:     total_g / 1e6,
      total_energie_kwh:   kwh,
    }
  }

  /* helper: find mobile EF row by carburant name */
  const findMobile = (fuel: string) => {
    const k = norm(fuel)
    return refs.mobileEF.find(e =>
      norm(e.carburant) === k ||
      norm(e.type_vehicule) === k ||
      norm(e.carburant).includes(k) ||
      norm(e.type_vehicule).includes(k) ||
      k.includes(norm(e.carburant)) ||
      k.includes(norm(e.type_vehicule))
    )
  }

  /* helper: apply mobile EF to a litre quantity */
  const mobileCalc = (ef: WizardRefs['mobileEF'][0] | undefined, liters: number) => {
    if (!ef || liters === 0) return zero
    const hasGas = ef.co2 !== 0 || ef.ch4 !== 0 || ef.n2o !== 0
    if (hasGas) {
      return make(
        ef.co2 * liters * prpCO2,
        ef.ch4 * liters * prpCH4,
        ef.n2o * liters * prpN2O,
        ef.kwh * liters,
      )
    }
    const total_g = ef.co2eq * liters
    return { ...make(total_g, 0, 0, ef.kwh * liters), total_co2_gco2e: total_g }
  }

  /* ── 1A1 Combustion fixe ─── */
  if (code === '1A1') {
    const qty = parseFloat(fd.qty) || 0
    const k   = norm(fd.fuel ?? '')
    const ef  = refs.fixedEF.find(e => norm(e.label).includes(k) || k.split(' ').some(w => w.length > 3 && norm(e.label).includes(w)))
    if (!ef || qty === 0) return zero
    return make(
      ef.gco2 * qty * prpCO2,
      ef.gch4 * qty * prpCH4,
      ef.gn2o * qty * prpN2O,
      ef.kwh  * qty,
    )
  }

  /* ── 2A1 Véhicules — litres facturés ─── */
  if (code === '2A1') return mobileCalc(findMobile(fd.fuel), parseFloat(fd.qty) || 0)

  /* ── 2A3 Véhicules — dépenses $ ─── */
  if (code === '2A3') {
    const liters = parseFloat(fd.estimateQty) || 0
    return mobileCalc(findMobile(fd.fuel), liters)
  }

  /* ── 2B1 Véhicules — distance ─── */
  if (code === '2B1') {
    const km     = parseFloat(fd.km) || 0
    const l100   = parseFloat(fd.l100km) || 10
    return mobileCalc(findMobile(fd.fuel), km * l100 / 100)
  }

  /* ── 4A1 / 4B2 Réfrigérants (kg * GWP) ─── */
  if (code === '4A1' || code === '4B2') {
    const kg  = parseFloat(fd.kg) || 0
    const gwp = refs.refrigerantGWP[fd.refrigerant] ?? 0
    if (kg === 0 || gwp === 0) return zero
    const co2_g = kg * gwp * 1000   // kg × GWP → kgCO2e × 1000 → gCO2e
    return { ...zero, total_co2_gco2e: co2_g, total_ges_gco2e: co2_g, total_ges_tco2e: kg * gwp / 1000 }
  }

  /* ── 4B1 Réfrigérants véhicules (moyenne industrie) ─── */
  if (code === '4B1') {
    const count = parseInt(fd.count) || 0
    const gwp   = refs.refrigerantGWP['R134a'] ?? refs.refrigerantGWP['R-134a'] ?? 1430
    const kg    = 0.25 * count
    const co2_g = kg * gwp * 1000
    return { ...zero, total_co2_gco2e: co2_g, total_ges_gco2e: co2_g, total_ges_tco2e: kg * gwp / 1000 }
  }

  /* ── 6A1 Électricité réseau (facteur provincial) ─── */
  if (code === '6A1') {
    const kwhVal = parseFloat(fd.kwh) || 0
    const factor = PROVINCES[fd.province] ?? 0.002  // kgCO2e/kWh
    const co2_g  = factor * kwhVal * 1000           // kgCO2e × 1000 = gCO2e
    return { ...zero, total_co2_gco2e: co2_g, total_ges_gco2e: co2_g, total_ges_tco2e: factor * kwhVal / 1000, total_energie_kwh: kwhVal }
  }

  /* ── 6B1 Électricité marché (renouvelable certifiée = 0) ─── */
  if (code === '6B1') return { ...zero, total_energie_kwh: parseFloat(fd.kwh) || 0 }

  return zero
}

/* ── Fleet import ────────────────────────────────────────────── */
const VEHICLE_SOURCES = ['2A1', '2A3', '2B1', '4B1', '4B2']

type FleetRow = {
  qty: number; details: string; annee: string; marque: string; modele: string;
  transmission: string; distance_km: string; type_carburant: string; conso_l_100km: string;
  type_equipement_refrigeration: string; type_refrigerant: string; charge_lbs: string;
  fuites_lbs: string; climatisation: boolean;
}


function normalizeWizardFormData(code: string, fd: Record<string, string>) {
  if (code === '2A3') {
    return {
      ...fd,
      estimateQty: fd.estimateQty ?? '',
    }
  }

  if (code === '4A1' || code === '4B1' || code === '4B2') {
    return {
      ...fd,
      refrigerant: fd.refrigerant ?? 'R-134a',
      qtyInEquipment: fd.qtyInEquipment ?? '',
      leakObserved: fd.leakObserved ?? '',
    }
  }

  if (code === '6B1') {
    return {
      ...fd,
      carbonIntensity: fd.carbonIntensity ?? '',
    }
  }

  return fd
}

function computeWizardResults(code: string, fd: Record<string, string>, refs: WizardRefs | null) {
  const normalized = normalizeWizardFormData(code, fd)
  if (!refs) return computeResults(code, normalized, refs)

  if (code === '4A1' || code === '4B1' || code === '4B2') {
    const qtyInEquipment = parseFloat(normalized.qtyInEquipment) || 0
    const leakObserved = normalized.leakObserved === '' ? 0 : (parseFloat(normalized.leakObserved) || 0)
    const gwp =
      refs.refrigerantGWP[normalized.refrigerant]
      ?? refs.refrigerantGWP[String(normalized.refrigerant ?? '').replace('R-', 'R')]
      ?? 0

    if (qtyInEquipment === 0 || gwp === 0) {
      return {
        total_ges_tco2e: 0,
        total_co2_gco2e: 0,
        total_ges_ch4_gco2e: 0,
        total_ges_n2o_gco2e: 0,
        total_ges_gco2e: 0,
        total_energie_kwh: 0,
      }
    }

    const lbsPerKg = 2.20462
    const leakKg = code === '4A1' ? leakObserved : leakObserved / lbsPerKg
    const total_g = leakKg * gwp * 1000

    return {
      total_co2_gco2e: total_g,
      total_ges_ch4_gco2e: 0,
      total_ges_n2o_gco2e: 0,
      total_ges_gco2e: total_g,
      total_ges_tco2e: total_g / 1e6,
      total_energie_kwh: 0,
    }
  }

  if (code === '6B1') {
    const kwhVal = parseFloat(normalized.kwh) || 0
    const carbonIntensity = parseFloat(normalized.carbonIntensity) || 0
    const total_g = carbonIntensity * kwhVal
    return {
      total_co2_gco2e: total_g,
      total_ges_ch4_gco2e: 0,
      total_ges_n2o_gco2e: 0,
      total_ges_gco2e: total_g,
      total_ges_tco2e: total_g / 1e6,
      total_energie_kwh: kwhVal,
    }
  }

  return computeResults(code, normalized, refs)
}

async function parseFleetExcel(file: File): Promise<FleetRow[]> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/read-fleet', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error ?? 'Erreur serveur')
  return (data.vehicles ?? []) as FleetRow[]
}

/* ── Types ───────────────────────────────────────────────────── */
type WizardSource = {
  source_code: string
  poste_num: number
  label: string
  icon: string
  scope: 1|2|3
  saved: boolean
  formData: Record<string, string>
}

/* ── Input style ─────────────────────────────────────────────── */
const IS = {
  bg: '#F8FAF8',
  border: '1px solid #E1E7E3',
  borderRadius: 'lg',
  fontSize: 'sm',
}

/* ════════════════════════════════════════════════════════════════
   WIZARD PAGE
════════════════════════════════════════════════════════════════ */
export default function WizardPage({ onFinish }: { onFinish?: () => void }) {
  const [userId, setUserId]       = useState<string | null>(null)
  const [steps, setSteps]         = useState<WizardSource[]>([])
  const [current, setCurrent]     = useState(-1) // -1 = intro
  const [loading, setLoading]     = useState(true)
  const [refs, setRefs]           = useState<WizardRefs | null>(null)
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [extracted, setExtracted]     = useState<{ filename: string; fields: Record<string, any>; ok: boolean }[]>([])
  const [dragOver, setDragOver]       = useState(false)
  const [fileCount, setFileCount]     = useState(0)
  const [fleetRows, setFleetRows]     = useState<FleetRow[]>([])
  const [fleetSaving, setFleetSaving] = useState(false)
  const [companyId, setCompanyId]     = useState<string | null>(null)
  const { isOpen: isFleetOpen, onOpen: openFleet, onClose: closeFleet } = useDisclosure()
  const fileRef    = useRef<HTMLInputElement>(null)
  const fleetRef   = useRef<HTMLInputElement>(null)
  const toast = useToast()

  /* ── Load active sources ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('user_profiles').select('company_id').eq('id', user.id).single()
      if (profile?.company_id) setCompanyId(profile.company_id)

      const res = await fetch(`/api/source-visibility?user_id=${user.id}`)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()

      const list: WizardSource[] = []
      const seen = new Set<string>()
      Object.entries(data.sources || {}).forEach(([, srcs]: [string, any]) => {
        srcs.forEach((src: any) => {
          if (seen.has(src.source_code)) return
          const isHidden = Object.values(data.sourceVisibility || {}).some(
            (pv: any) => pv[src.source_code] === true
          )
          if (isHidden) return
          const meta = SOURCE_META[src.source_code]
          if (!meta) return
          seen.add(src.source_code)
          list.push({
            source_code: src.source_code,
            poste_num: meta.poste_num,
            label: meta.label,
            icon: meta.icon,
            scope: meta.scope,
            saved: false,
            formData: { ...(DEFAULT_FORM[src.source_code] || {}) },
          })
        })
      })

      list.sort((a, b) => a.source_code.localeCompare(b.source_code))
      setSteps(list)
      setLoading(false)
    })()
  }, [])

  /* ── Load emission factor refs from DB (same tables as category forms) ── */
  useEffect(() => {
    (async () => {
      try {
        // PRP + refrigerant GWP from gaz_effet_serre
        const { data: gesRows } = await supabase
          .from('gaz_effet_serre')
          .select('formule_chimique, prp_100ans')

        const prpMap: Record<string, number> = Object.fromEntries(
          (gesRows ?? [])
            .filter((r: any) => r?.formule_chimique && r?.prp_100ans != null)
            .map((r: any) => [String(r.formule_chimique).trim().toUpperCase(), Number(r.prp_100ans)])
        )

        const prpCO2 = prpMap['CO2'] ?? 1
        const prpCH4 = prpMap['CH4'] ?? 28
        const prpN2O = prpMap['N2O'] ?? 265

        // Refrigerant GWP: look for R-codes in gaz_effet_serre, fallback to REFRIGERANTS defaults
        const refrigerantGWP: Record<string, number> = {
          'R410A': 2088, 'R22': 1810, 'R134a': 1430,
          'R404A': 3922, 'R407C': 1774, 'R32': 675, 'R507A': 3985,
        }
        ;(gesRows ?? []).forEach((r: any) => {
          const code = String(r?.formule_chimique ?? '').trim()
          if (/^R-?\d/i.test(code)) {
            const normalized = code.replace('R-', 'R')
            refrigerantGWP[normalized] = Number(r.prp_100ans)
          }
        })

        // Fixed combustion factors from emission_factors table (used by 1A1 form)
        const { data: efRows } = await supabase
          .from('emission_factors')
          .select('label, energy_kwh_per_unit, gco2_per_unit, gch4_per_unit, gn2o_per_unit')

        const fixedEF = (efRows ?? []).map((r: any) => ({
          label: String(r.label ?? ''),
          gco2:  Number(r.gco2_per_unit ?? 0),
          gch4:  Number(r.gch4_per_unit ?? 0),
          gn2o:  Number(r.gn2o_per_unit ?? 0),
          kwh:   Number(r.energy_kwh_per_unit ?? 0),
        }))

        // Mobile combustion factors from equipements_mobiles (used by 2A1/2A3/2B1 forms)
        const { data: mobRows } = await supabase
          .from('equipements_mobiles')
          .select('type_vehicule, carburant, co2_g_unite, ch4_g_unite, n2o_g_unite, co2eq_g_unite, conversion_kwh_unite')

        const mobileEF = (mobRows ?? []).map((r: any) => ({
          carburant:     String(r.carburant ?? ''),
          type_vehicule: String(r.type_vehicule ?? ''),
          co2:   Number(r.co2_g_unite ?? 0),
          ch4:   Number(r.ch4_g_unite ?? 0),
          n2o:   Number(r.n2o_g_unite ?? 0),
          co2eq: Number(r.co2eq_g_unite ?? 0),
          kwh:   Number(r.conversion_kwh_unite ?? 0),
        }))

        setRefs({ fixedEF, mobileEF, prpCO2, prpCH4, prpN2O, refrigerantGWP })
      } catch (e) {
        console.error('WizardPage: failed to load emission factor refs', e)
      }
    })()
  }, [])

  /* ── Helpers ── */
  const updateField = (key: string, value: string) => {
    setSteps(prev => {
      const copy = [...prev]
      copy[current] = {
        ...copy[current],
        formData: { ...copy[current].formData, [key]: value },
      }
      return copy
    })
  }

  const tryAutoFill = (data: any) => {
    // Unpack single-result array if the backend still returns [{...}]
    const d = Array.isArray(data) ? data[0]?.result ?? data[0] : data
    if (!d || typeof d !== 'object') return
    const code = steps[current]?.source_code

    const qty = d.quantity ?? d.quantite ?? d.consumption ?? d.consommation
    if (qty != null) {
      if (['6A1', '6B1'].includes(code)) updateField('kwh', String(qty))
      else if (d.kwh != null) updateField('kwh', String(d.kwh))
      else if (['1A1', '2A1'].includes(code)) updateField('qty', String(qty))
    } else if (d.kwh != null) {
      updateField('kwh', String(d.kwh))
    }

    const amount = d.amount ?? d.montant ?? d.total
    if (amount != null) updateField('amount', String(amount))

    if (d.province) {
      const rawProvince = String(d.province).trim()
      const provinceMap: Record<string, string> = {
        QC: 'QuÃ©bec',
        ON: 'Ontario',
        BC: 'Colombie-Britannique',
        AB: 'Alberta',
        MB: 'Manitoba',
        SK: 'Saskatchewan',
        NS: 'Nouvelle-Ã‰cosse',
        NB: 'Nouveau-Brunswick',
        PE: 'ÃŽle-du-Prince-Ã‰douard',
        NL: 'Terre-Neuve-et-Labrador',
        NU: 'Nunavut',
        NT: 'Territoires du Nord-Ouest',
        YT: 'Yukon',
      }
      updateField('province', provinceMap[rawProvince.toUpperCase()] ?? rawProvince)
    }

    const fuel = d.fuel_type ?? d.carburant
    if (fuel) updateField('fuel', fuel)

    if (d.refrigerant) updateField('refrigerant', d.refrigerant)
    if (d.kg != null) updateField('kg', String(d.kg))
  }

  /* ── Invoice upload (supports multiple files, appends to previous results) ── */
  const handleUpload = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    setFileCount(files.length)
    try {
      const form = new FormData()
      files.forEach(f => form.append('file', f))
      const res = await fetch('/api/upload-bill', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Extraction échouée')
      const data = await res.json()

      // Normalize to array
      const items: any[] = Array.isArray(data) ? data : [data]
      const valid = items.filter(d => !d.error)

      if (valid.length === 0) {
        toast({ title: 'Aucune donnée extraite', description: items[0]?.error ?? 'Fichier illisible.', status: 'warning', duration: 4000 })
        return
      }

      // Append new results to existing ones
      setExtracted(prev => {
        const newEntries = items.map(d => ({
          filename: d.filename ?? '—',
          ok: !d.error,
          fields: d.error ? { erreur: d.error } : {
            ...(d.source_hint    != null && { 'Type détecté':  d.source_hint }),
            ...(d.quantity       != null && { 'Quantité':      d.quantity }),
            ...(d.kwh            != null && { 'kWh':           d.kwh }),
            ...(d.amount         != null && { 'Montant ($)':   d.amount }),
            ...(d.fuel_type      != null && { 'Carburant':     d.fuel_type }),
            ...(d.refrigerant    != null && { 'Réfrigérant':   d.refrigerant }),
            ...(d.kg             != null && { 'kg':            d.kg }),
            ...(d.province       != null && { 'Province':      d.province }),
            ...(d.billing_period != null && { 'Période':       d.billing_period }),
          },
          _raw: d,
        }))
        return [...prev, ...newEntries]
      })

      // Aggregate across ALL valid results (prev + new) for autofill
      setExtracted(prev => {
        const allValid = prev.filter(e => e.ok).map(e => (e as any)._raw).filter(Boolean)
        const sumField = (key: string) => {
          const total = allValid.reduce((acc: number, d: any) => acc + (parseFloat(d[key]) || 0), 0)
          return total > 0 ? total : null
        }
        const mostCommon = (key: string) => {
          const counts: Record<string, number> = {}
          allValid.forEach((d: any) => { if (d[key]) counts[d[key]] = (counts[d[key]] || 0) + 1 })
          return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
        }
        tryAutoFill({
          quantity: sumField('quantity'), kwh: sumField('kwh'),
          amount: sumField('amount'), montant: sumField('montant'), kg: sumField('kg'),
          province: mostCommon('province'), fuel_type: mostCommon('fuel_type'),
          carburant: mostCommon('carburant'), refrigerant: mostCommon('refrigerant'),
        })
        return prev
      })

      toast({
        title: `${valid.length} facture${valid.length > 1 ? 's' : ''} lue${valid.length > 1 ? 's' : ''} ✓`,
        description: 'Résultats ajoutés. Vérifiez les champs.',
        status: 'success',
        duration: 3000,
      })
    } catch (e: any) {
      toast({ title: 'Erreur lecture', description: e.message, status: 'error', duration: 4000 })
    } finally {
      setUploading(false)
    }
  }

  /* ── Build data payload compatible with each category form's prefill ── */
  const buildData = (code: string, fd: Record<string, string>) => {
    if (code === '1A1') {
      return {
        wizard: true,
        rows: [{
          equipment: '',
          description: '',
          date: '',
          site: '',
          product: '',
          reference: '',
          usageAndFuel: fd.fuel ?? '',
          qty: fd.qty ?? '',
          unit: (COMBUSTION_FUELS.find(f => f.label === fd.fuel)?.unit ?? ''),
        }],
      }
    }

    if (code === '2A1') {
      return {
        wizard: true,
        groups: [{
          vehicle: 'Wizard',
          fuelType: fd.fuel ?? '',
          rows: [{
            details: '',
            date: '',
            invoiceNumber: '',
            qty: fd.qty ?? '',
          }],
        }],
      }
    }

    // 2A3 expects { rows: A3Row[] }
    if (code === '2A3') {
      return {
        wizard: true,
        rows: [{
          vehicle: fd.fuel ?? '',
          type: fd.fuel ?? '',
          date: '',
          cost: '',
          avgPrice: '',
          estimateQty: fd.estimateQty ?? '',
          reference: '',
        }],
      }
    }

    if (code === '4A1') {
      return {
        wizard: true,
        rows: [{
          equipment: 'Wizard',
          description: '',
          date: '',
          months: '',
          site: '',
          product: '',
          reference: '',
          equipmentType: '',
          refrigerantType: fd.refrigerant ?? '',
          qty: fd.qtyInEquipment ?? '',
          leaks: fd.leakObserved ?? '',
        }],
      }
    }

    if (code === '4B1' || code === '4B2') {
      return {
        wizard: true,
        rows: [{
          vehicle: 'Wizard',
          date: '',
          description: '',
          months: '',
          site: '',
          product: '',
          reference: '',
          refrigerationType: '',
          refrigerant: fd.refrigerant ?? '',
          qtyInEquipment: fd.qtyInEquipment ?? '',
          leakObserved: fd.leakObserved ?? '',
          climatisation: fd.climatisation ?? 'Oui',
        }],
      }
    }

    if (code === '6A1') {
      return {
        wizard: true,
        counters: [{ number: 'Wizard', address: '', province: fd.province ?? '' }],
        invoices: [{
          number: 'Wizard',
          address: '',
          province: fd.province ?? '',
          date: '',
          consumption: fd.kwh ?? '',
          reference: '',
        }],
      }
    }

    if (code === '6B1') {
      return {
        wizard: true,
        counters: [{ number: 'Wizard', address: '', province: '' }],
        invoices: [{
          number: 'Wizard',
          address: '',
          province: '',
          date: '',
          site: '',
          product: '',
          consumption: fd.kwh ?? '',
          carbonIntensity: fd.carbonIntensity ?? '',
          reference: '',
        }],
      }
    }

    // All other sources: flat formData (category forms read prefillData directly)
    return { wizard: true, ...fd }
  }

  /* ── Save step ── */
  const handleSave = async () => {
    if (!userId) return
    const step = steps[current]
    const normalizedFormData = normalizeWizardFormData(step.source_code, step.formData)
    let results = computeWizardResults(step.source_code, normalizedFormData, refs)
    setSaving(true)
    try {
      if (step.source_code === '4A1' || step.source_code === '4B1') {
        const webhookPayload = {
          user_id: userId,
          poste_num: step.poste_num,
          source_code: step.source_code,
          data: buildData(step.source_code, normalizedFormData),
        }

        try {
          const webhookRes = await fetch(`https://allposteswebhook-129138384907.us-central1.run.app/submit/${step.source_code}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          })
          const webhookData = await webhookRes.json()
          if (webhookRes.ok && Array.isArray(webhookData.results) && webhookData.results.length > 0) {
            results = webhookData.results[0]
          }
        } catch {}
      }

      const res = await fetch('/api/4submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          poste_num: step.poste_num,
          source_code: step.source_code,
          data: buildData(step.source_code, normalizedFormData),
          results: [results],
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur')
      setSteps(prev => {
        const copy = [...prev]
        copy[current] = { ...copy[current], saved: true }
        return copy
      })
      toast({ title: 'Sauvegardé ✓', status: 'success', duration: 2000 })
      setTimeout(() => { setExtracted([]); setCurrent(c => c + 1) }, 600)
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, status: 'error', duration: 4000 })
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => { setExtracted([]); setCurrent(c => c + 1) }
  const handleBack = () => { setExtracted([]); setCurrent(c => Math.max(-1, c - 1)) }

  const handleFleetFile = async (file: File) => {
    try {
      const rows = await parseFleetExcel(file)
      if (!rows.length) {
        toast({ title: 'Fichier vide ou colonnes non reconnues', status: 'warning', duration: 3000 })
        return
      }
      setFleetRows(rows)
      openFleet()
    } catch (e: any) {
      toast({ title: 'Erreur lecture Excel', description: e.message, status: 'error', duration: 4000 })
    }
  }

  const handleFleetSave = async () => {
    if (!companyId || !fleetRows.length) return
    setFleetSaving(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({ vehicle_fleet: fleetRows })
        .eq('id', companyId)
      if (error) throw error
      toast({ title: `${fleetRows.length} véhicule${fleetRows.length > 1 ? 's' : ''} importé${fleetRows.length > 1 ? 's' : ''} ✓`, status: 'success', duration: 3000 })
      closeFleet()
      setFleetRows([])
    } catch (e: any) {
      toast({ title: 'Erreur sauvegarde', description: e.message, status: 'error', duration: 4000 })
    } finally {
      setFleetSaving(false)
    }
  }

  /* ── Fleet preview modal ── */
  const fleetModal = (
    <Modal isOpen={isFleetOpen} onClose={closeFleet} size="5xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader borderBottom={`1px solid ${G.border}`} fontSize="md" fontWeight={700} color={G.dark}>
          <HStack spacing={2}>
            <Icon as={FiTruck} color={G.brand} />
            <Text>Aperçu — {fleetRows.length} véhicule{fleetRows.length > 1 ? 's' : ''} détecté{fleetRows.length > 1 ? 's' : ''}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={4}>
          <Text fontSize="xs" color={G.muted} mb={3}>
            Vérifiez les données avant d'importer. Ces véhicules remplaceront la flotte actuelle dans l'onglet Entreprise.
          </Text>
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead bg={G.bg}>
                <Tr>
                  {['Qté','Année','Marque','Modèle','Carburant','Conso (L/100)','Distance (km)','Clim'].map(h => (
                    <Th key={h} fontSize="9px" color={G.muted} py={2}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {fleetRows.map((v, i) => (
                  <Tr key={i} _hover={{ bg: G.bg }}>
                    <Td fontSize="xs">{v.qty}</Td>
                    <Td fontSize="xs">{v.annee}</Td>
                    <Td fontSize="xs">{v.marque}</Td>
                    <Td fontSize="xs">{v.modele}</Td>
                    <Td fontSize="xs">{v.type_carburant}</Td>
                    <Td fontSize="xs">{v.conso_l_100km}</Td>
                    <Td fontSize="xs">{v.distance_km}</Td>
                    <Td fontSize="xs">{v.climatisation ? '✓' : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </ModalBody>
        <ModalFooter borderTop={`1px solid ${G.border}`} gap={3}>
          <Button variant="ghost" size="sm" onClick={closeFleet} color={G.muted}>Annuler</Button>
          <Button
            size="sm" bg={G.brand} color="white" _hover={{ bg: G.accent }}
            borderRadius="lg" fontWeight={700} px={6}
            onClick={handleFleetSave} isLoading={fleetSaving} loadingText="Sauvegarde…"
          >
            Importer {fleetRows.length} véhicule{fleetRows.length > 1 ? 's' : ''} →
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )

  /* ── Loading ── */
  if (loading) return (
    <Box display="flex" alignItems="center" justifyContent="center" minH="400px">
      <Spinner size="xl" color={G.brand} />
    </Box>
  )

  /* ── No sources ── */
  if (steps.length === 0) return (
    <Box bg={G.surface} p={8} rounded="2xl" border={`1px solid ${G.border}`} textAlign="center" maxW="600px" mx="auto">
      <Text fontSize="2xl" mb={3}>🎯</Text>
      <Heading size="md" color={G.brand} mb={2}>Aucune source configurée</Heading>
      <Text color={G.muted} fontSize="sm">
        Configurez vos sources d'émissions dans l'onglet Entreprise pour commencer.
      </Text>
    </Box>
  )

  /* ── Intro ── */
  if (current === -1) return (
    <>
    {fleetModal}
    <Box bg={G.surface} rounded="2xl" border={`1px solid ${G.border}`} overflow="hidden" maxW="680px" mx="auto">
      <Box bgGradient={`linear(135deg, ${G.dark}, ${G.brand})`} px={8} py={6}>
        <Text fontSize="28px" mb={2}>🌿</Text>
        <Heading size="lg" color="white" fontWeight={700}>Assistant de saisie</Heading>
        <Text fontSize="sm" color={G.soft} mt={1} lineHeight="1.6">
          Complétez chaque source d'émissions une par une. Importez vos factures pour
          remplir les données automatiquement.
        </Text>
      </Box>
      <Box px={8} py={6}>
        <Text fontSize="xs" fontWeight={700} color={G.muted} mb={3} textTransform="uppercase" letterSpacing="0.06em">
          {steps.length} source{steps.length > 1 ? 's' : ''} à compléter
        </Text>
        <VStack spacing={2} align="stretch" mb={6}>
          {steps.map(s => (
            <HStack key={s.source_code} px={3} py={2.5} rounded="lg" bg={G.bg} spacing={3}>
              <Text fontSize="18px">{s.icon}</Text>
              <Box flex={1}>
                <Text fontSize="sm" fontWeight={600} color={G.dark}>{s.label}</Text>
                <Text fontSize="xs" color={G.muted}>{s.source_code}</Text>
              </Box>
              <Badge colorScheme={s.scope === 1 ? 'purple' : 'teal'} fontSize="9px">Scope {s.scope}</Badge>
            </HStack>
          ))}
        </VStack>
        {/* Fleet import — shown only when vehicle sources are active */}
        {steps.some(s => VEHICLE_SOURCES.includes(s.source_code)) && (
          <Box mb={4} p={4} rounded="xl" border={`1px dashed ${G.border}`} bg={G.bg}>
            <HStack mb={2} spacing={2}>
              <Icon as={FiTruck} color={G.brand} boxSize={4} />
              <Text fontSize="sm" fontWeight={700} color={G.dark}>Importer votre flotte de véhicules</Text>
            </HStack>
            <Text fontSize="xs" color={G.muted} mb={3} lineHeight="1.5">
              Glissez-déposez un fichier Excel (.xlsx) contenant votre flotte. Les colonnes reconnues sont :
              Année, Marque, Modèle, Type de carburant, Consommation (L/100km), Distance (km), etc.
            </Text>
            <Box
              border="2px dashed" borderColor={G.border} rounded="lg" p={3}
              textAlign="center" cursor="pointer"
              _hover={{ borderColor: G.brand, bg: '#EEF5EE' }}
              transition="all 0.15s"
              onClick={() => fleetRef.current?.click()}
              onDragOver={e => { e.preventDefault() }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFleetFile(f) }}
            >
              <Icon as={FiUploadCloud} boxSize={5} color={G.muted} mb={1} />
              <Text fontSize="xs" color={G.muted}>Glissez un fichier .xlsx ici ou cliquez pour parcourir</Text>
            </Box>
            <input
              ref={fleetRef} type="file" accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFleetFile(f); e.target.value = '' }}
            />
          </Box>
        )}

        <Button
          w="full" size="lg" bg={G.brand} color="white" _hover={{ bg: G.accent }}
          borderRadius="xl" fontWeight={700} onClick={() => setCurrent(0)}
          rightIcon={<Icon as={FiArrowRight} />}
        >
          Commencer
        </Button>
      </Box>
    </Box>
    </>
  )

  /* ── Completion ── */
  if (current >= steps.length) {
    const savedCount = steps.filter(s => s.saved).length
    return (
      <Box bg={G.surface} rounded="2xl" border={`1px solid ${G.border}`} p={8} textAlign="center" maxW="680px" mx="auto">
        <Text fontSize="3xl" mb={3}>✅</Text>
        <Heading size="lg" color={G.brand} mb={2}>Saisie terminée !</Heading>
        <Text fontSize="sm" color={G.muted} mb={6} lineHeight="1.6">
          {savedCount}/{steps.length} source{savedCount > 1 ? 's' : ''} sauvegardée{savedCount > 1 ? 's' : ''}.
          Votre bilan GES a été mis à jour automatiquement.
        </Text>
        <VStack spacing={2} mb={8} align="stretch">
          {steps.map(s => (
            <HStack key={s.source_code} px={4} py={2.5} rounded="xl" bg={s.saved ? '#EEF5EE' : G.bg} spacing={3}>
              <Text fontSize="16px">{s.icon}</Text>
              <Text fontSize="sm" flex={1} color={G.dark}>{s.label}</Text>
              {s.saved
                ? <Icon as={FiCheck} color="green.500" boxSize={4} />
                : <Text fontSize="xs" color={G.muted}>Ignorée</Text>}
            </HStack>
          ))}
        </VStack>
        <Button
          size="lg" bg={G.brand} color="white" _hover={{ bg: G.accent }}
          borderRadius="xl" fontWeight={700} onClick={onFinish}
          rightIcon={<Icon as={FiArrowRight} />}
        >
          Voir mon bilan
        </Button>
      </Box>
    )
  }

  /* ── Active step ── */
  const step = steps[current]
  const pct = Math.round((current / steps.length) * 100)
  const results = computeWizardResults(step.source_code, step.formData, refs)
  const tco2e = results.total_ges_tco2e

  return (
    <>
    {fleetModal}
    <Box maxW="900px" mx="auto">
      {/* Step header */}
      <Box bg={G.surface} rounded="2xl" border={`1px solid ${G.border}`} overflow="hidden" mb={4}>
        <Box bgGradient={`linear(135deg, ${G.dark}, ${G.brand})`} px={6} py={4}>
          <HStack justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Text fontSize="18px">{step.icon}</Text>
              <Heading size="sm" color="white">{step.label}</Heading>
              <Badge colorScheme="whiteAlpha" fontSize="9px" px={2} py={0.5}>{step.source_code}</Badge>
              <Badge colorScheme={step.scope === 1 ? 'purple' : 'teal'} fontSize="9px">Scope {step.scope}</Badge>
            </HStack>
            <Text fontSize="xs" color={G.soft}>
              Étape {current + 1} / {steps.length}
            </Text>
          </HStack>
          <Progress value={pct} size="xs" colorScheme="green" bg="rgba(255,255,255,0.2)" borderRadius="full" />
        </Box>
      </Box>

      {/* Body */}
      <Flex gap={4} direction={{ base: 'column', md: 'row' }} align="stretch">

        {/* Form panel */}
        <Box flex="1" bg={G.surface} rounded="2xl" border={`1px solid ${G.border}`} p={6}>
          <Text fontSize="xs" fontWeight={700} color={G.muted} mb={4} textTransform="uppercase" letterSpacing="0.06em">
            Données de la source
          </Text>
          <SourceForm
            sourceCode={
              step.source_code === '2A3' ? '2A3-wizard'
              : step.source_code === '4A1' ? '4A1-wizard'
              : step.source_code === '4B1' ? '4B1-wizard'
              : step.source_code === '4B2' ? '4B2-wizard'
              : step.source_code === '6B1' ? '6B1-wizard'
              : step.source_code
            }
            formData={step.formData}
            onChange={updateField}
          />

          {/* Computed result */}
          {tco2e > 0 && (
            <Box mt={5} p={4} bg="#EEF5EE" rounded="xl" border="1px solid #C3DFC3">
              <Text fontSize="xs" color={G.muted} mb={0.5}>Estimation calculée</Text>
              <Text fontSize="2xl" fontWeight={800} color={G.brand}>
                {tco2e.toLocaleString('fr-CA', { maximumFractionDigits: 3 })} tCO₂e
              </Text>
              <Text fontSize="10px" color={G.muted} mt={0.5}>
                Facteurs d'émission ECCC 2022 — valeur indicative, affinée dans les catégories.
              </Text>
            </Box>
          )}
        </Box>

        {/* Invoice upload panel */}
        <Box w={{ base: 'full', md: '270px' }} bg={G.surface} rounded="2xl" border={`1px solid ${G.border}`} p={5}>
          <Text fontSize="xs" fontWeight={700} color={G.muted} mb={3} textTransform="uppercase" letterSpacing="0.06em">
            Importer une facture
          </Text>

          <Box
            border="2px dashed"
            borderColor={dragOver ? G.brand : uploading ? G.accent : G.border}
            rounded="xl" p={4} textAlign="center"
            cursor="pointer"
            bg={dragOver ? '#EEF5EE' : uploading ? G.bg : 'transparent'}
            transition="all 0.15s"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const files = Array.from(e.dataTransfer.files).filter(
                f => /\.(pdf|jpg|jpeg|png|zip)$/i.test(f.name)
              )
              if (files.length) handleUpload(files)
            }}
          >
            {uploading ? (
              <VStack spacing={2}>
                <Spinner size="sm" color={G.brand} />
                <Text fontSize="xs" color={G.muted}>
                  Lecture de {fileCount} fichier{fileCount > 1 ? 's' : ''}…
                </Text>
              </VStack>
            ) : (
              <VStack spacing={2}>
                <Icon as={FiUploadCloud} boxSize={7} color={dragOver ? G.brand : G.muted} />
                <Text fontSize="xs" color={G.muted} lineHeight="1.4">
                  Glissez vos factures ici<br />ou cliquez pour parcourir
                </Text>
                <Text fontSize="9px" color={G.muted}>PDF, JPG, PNG, ZIP — jusqu'à 100 fichiers</Text>
                <Button size="xs" variant="outline" borderColor={G.border} color={G.brand} borderRadius="lg">
                  Parcourir
                </Button>
              </VStack>
            )}
          </Box>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.zip"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              const files = Array.from(e.target.files ?? [])
              if (files.length) handleUpload(files)
              e.target.value = ''
            }}
          />

          {extracted.length > 0 && (
            <Box mt={3} rounded="lg" border={`1px solid ${G.border}`} overflow="hidden">
              <HStack px={3} py={1.5} bg={G.bg} borderBottom={`1px solid ${G.border}`} justify="space-between">
                <Text fontSize="9px" fontWeight={700} color={G.muted} textTransform="uppercase">
                  {extracted.length} fichier{extracted.length > 1 ? 's' : ''} — {extracted.filter(e => e.ok).length} ✅ {extracted.filter(e => !e.ok).length > 0 ? `· ${extracted.filter(e => !e.ok).length} ❌` : ''}
                </Text>
                <HStack spacing={2}>
                  <Text
                    fontSize="9px" color={G.brand} fontWeight={700} cursor="pointer"
                    _hover={{ textDecoration: 'underline' }}
                    onClick={() => fileRef.current?.click()}
                  >
                    + Ajouter
                  </Text>
                  <Text
                    fontSize="9px" color={G.muted} cursor="pointer"
                    _hover={{ textDecoration: 'underline' }}
                    onClick={() => setExtracted([])}
                  >
                    Effacer
                  </Text>
                </HStack>
              </HStack>
              <VStack spacing={0} align="stretch" maxH="220px" overflowY="auto">
                {extracted.map((item, i) => (
                  <Box
                    key={i}
                    px={3} py={2}
                    bg={item.ok ? G.surface : '#FFF5F5'}
                    borderBottom={i < extracted.length - 1 ? `1px solid ${G.border}` : 'none'}
                  >
                    <HStack spacing={1.5} mb={1}>
                      <Text fontSize="9px">{item.ok ? '✅' : '❌'}</Text>
                      <Text fontSize="10px" fontWeight={700} color={item.ok ? G.dark : '#C53030'} noOfLines={1}>
                        {item.filename}
                      </Text>
                    </HStack>
                    {Object.entries(item.fields).map(([k, v]) => (
                      <HStack key={k} spacing={1} pl={4}>
                        <Text fontSize="9px" color={G.muted} minW="80px">{k} :</Text>
                        <Text fontSize="9px" color={G.dark} fontWeight={600}>{String(v)}</Text>
                      </HStack>
                    ))}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}

          <Divider my={4} borderColor={G.border} />
          <Text fontSize="10px" color={G.muted} lineHeight="1.5">
            La facture est analysée pour pré-remplir les champs. Vérifiez toujours les valeurs avant de sauvegarder.
          </Text>
        </Box>
      </Flex>

      {/* Navigation */}
      <HStack mt={4} justify="space-between">
        <Button
          size="sm" variant="ghost" color={G.muted}
          leftIcon={<Icon as={FiArrowLeft} />}
          onClick={handleBack}
          isDisabled={current === 0}
        >
          Précédent
        </Button>
        <HStack spacing={3}>
          <Button
            size="sm" variant="outline" borderColor={G.border} color={G.muted}
            onClick={handleSkip}
          >
            Ignorer
          </Button>
          <Button
            size="md" bg={G.brand} color="white" _hover={{ bg: G.accent }}
            borderRadius="xl" fontWeight={700} px={6}
            onClick={handleSave}
            isLoading={saving}
            loadingText="Sauvegarde…"
          >
            Sauvegarder et continuer →
          </Button>
        </HStack>
      </HStack>
    </Box>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════
   SOURCE FORMS
════════════════════════════════════════════════════════════════ */
function SourceForm({ sourceCode, formData, onChange }: {
  sourceCode: string
  formData: Record<string, string>
  onChange: (k: string, v: string) => void
}) {
  const label = (text: string) => (
    <Text fontSize="xs" fontWeight={600} color="#4B5563" mb={1}>{text}</Text>
  )

  if (sourceCode === '1A1') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de combustible')}
        <Select {...IS} value={formData.fuel} onChange={e => onChange('fuel', e.target.value)}>
          {COMBUSTION_FUELS.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
        </Select>
      </Box>
      <Box>
        {label(`Quantité (${COMBUSTION_FUELS.find(f => f.label === formData.fuel)?.unit ?? 'unité'})`)}
        <Input {...IS} type="number" placeholder="0" value={formData.qty}
          onChange={e => onChange('qty', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '2A1') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de carburant')}
        <Select {...IS} value={formData.fuel} onChange={e => onChange('fuel', e.target.value)}>
          {MOBILE_FUELS.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
        </Select>
      </Box>
      <Box>
        {label('Litres consommés (L)')}
        <Input {...IS} type="number" placeholder="0" value={formData.qty}
          onChange={e => onChange('qty', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '2A3-wizard') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de carburant')}
        <Select {...IS} value={formData.fuel} onChange={e => onChange('fuel', e.target.value)}>
          {MOBILE_FUELS.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
        </Select>
      </Box>
      <Box>
        {label('QuantitÃ© totale (L)')}
        <Input {...IS} type="number" placeholder="0" value={formData.estimateQty}
          onChange={e => onChange('estimateQty', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '2A3') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de carburant')}
        <Select {...IS} value={formData.fuel} onChange={e => onChange('fuel', e.target.value)}>
          {MOBILE_FUELS.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
        </Select>
      </Box>
      <Box>
        {label('Montant total dépensé ($)')}
        <Input {...IS} type="number" placeholder="0.00" value={formData.amount}
          onChange={e => onChange('amount', e.target.value)} />
      </Box>
      <Box>
        {label('Prix moyen du carburant ($/L)')}
        <Input {...IS} type="number" placeholder="1.70" value={formData.pricePerL}
          onChange={e => onChange('pricePerL', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '2B1') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de carburant')}
        <Select {...IS} value={formData.fuel} onChange={e => onChange('fuel', e.target.value)}>
          {MOBILE_FUELS.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
        </Select>
      </Box>
      <Box>
        {label('Distance totale parcourue (km)')}
        <Input {...IS} type="number" placeholder="0" value={formData.km}
          onChange={e => onChange('km', e.target.value)} />
      </Box>
      <Box>
        {label('Consommation moyenne (L/100 km)')}
        <Input {...IS} type="number" placeholder="10" value={formData.l100km}
          onChange={e => onChange('l100km', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '4A1-wizard' || sourceCode === '4B2-wizard') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de rÃ©frigÃ©rant')}
        <Select {...IS} value={formData.refrigerant} onChange={e => onChange('refrigerant', e.target.value)}>
          {REFRIGERANTS.map(r => (
            <option key={r.label} value={r.label}>{r.label} â€” PRG {r.prg.toLocaleString('fr-CA')}</option>
          ))}
        </Select>
      </Box>
      <Box>
        {label(sourceCode === '4A1-wizard' ? 'Charge de rÃ©frigÃ©rant (kg)' : 'Charge de rÃ©frigÃ©rant (lbs)')}
        <Input {...IS} type="number" placeholder="0" value={formData.qtyInEquipment}
          onChange={e => onChange('qtyInEquipment', e.target.value)} />
      </Box>
      <Box>
        {label(sourceCode === '4A1-wizard' ? 'Fuite observÃ©e (kg)' : 'Fuite observÃ©e (lbs)')}
        <Input {...IS} type="number" placeholder="0" value={formData.leakObserved}
          onChange={e => onChange('leakObserved', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '4B1-wizard') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de rÃ©frigÃ©rant')}
        <Select {...IS} value={formData.refrigerant} onChange={e => onChange('refrigerant', e.target.value)}>
          {REFRIGERANTS.map(r => (
            <option key={r.label} value={r.label}>{r.label} â€” PRG {r.prg.toLocaleString('fr-CA')}</option>
          ))}
        </Select>
      </Box>
      <Box>
        {label('Charge de rÃ©frigÃ©rant (lbs)')}
        <Input {...IS} type="number" placeholder="0" value={formData.qtyInEquipment}
          onChange={e => onChange('qtyInEquipment', e.target.value)} />
      </Box>
      <Box>
        {label('Fuite observÃ©e (lbs)')}
        <Input {...IS} type="number" placeholder="0" value={formData.leakObserved}
          onChange={e => onChange('leakObserved', e.target.value)} />
      </Box>
      <Box>
        {label('Climatisation prÃ©sente')}
        <Select {...IS} value={formData.climatisation} onChange={e => onChange('climatisation', e.target.value)}>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </Select>
      </Box>
    </VStack>
  )

  if (sourceCode === '4A1' || sourceCode === '4B2') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Type de réfrigérant')}
        <Select {...IS} value={formData.refrigerant} onChange={e => onChange('refrigerant', e.target.value)}>
          {REFRIGERANTS.map(r => (
            <option key={r.label} value={r.label}>{r.label} — PRG {r.prg.toLocaleString('fr-CA')}</option>
          ))}
        </Select>
      </Box>
      <Box>
        {label('Quantité rechargée (kg)')}
        <Input {...IS} type="number" placeholder="0" value={formData.kg}
          onChange={e => onChange('kg', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '4B1') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Nombre de véhicules avec climatisation')}
        <Input {...IS} type="number" placeholder="0" value={formData.count}
          onChange={e => onChange('count', e.target.value)} />
      </Box>
      <Box p={3} bg="#F8FAF8" rounded="lg" border="1px solid #E1E7E3">
        <Text fontSize="xs" color={G.muted} lineHeight="1.5">
          Facteur appliqué : <strong>0,25 kg R134a / véhicule / an</strong> (moyenne industrie).
          Utilisez la source 4B2 pour des données précises par véhicule.
        </Text>
      </Box>
    </VStack>
  )

  if (sourceCode === '6A1') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Province')}
        <Select {...IS} value={formData.province} onChange={e => onChange('province', e.target.value)}>
          {Object.entries(PROVINCES).map(([p, f]) => (
            <option key={p} value={p}>{p} — {f} kgCO₂e/kWh</option>
          ))}
        </Select>
      </Box>
      <Box>
        {label('Consommation totale (kWh)')}
        <Input {...IS} type="number" placeholder="0" value={formData.kwh}
          onChange={e => onChange('kwh', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '6B1-wizard') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Consommation totale (kWh)')}
        <Input {...IS} type="number" placeholder="0" value={formData.kwh}
          onChange={e => onChange('kwh', e.target.value)} />
      </Box>
      <Box>
        {label('IntensitÃ© carbone (gCOâ‚‚e/kWh)')}
        <Input {...IS} type="number" placeholder="0" value={formData.carbonIntensity}
          onChange={e => onChange('carbonIntensity', e.target.value)} />
      </Box>
    </VStack>
  )

  if (sourceCode === '6B1') return (
    <VStack spacing={4} align="stretch">
      <Box>
        {label('Énergie renouvelable certifiée consommée (kWh)')}
        <Input {...IS} type="number" placeholder="0" value={formData.kwh}
          onChange={e => onChange('kwh', e.target.value)} />
      </Box>
      <Box p={3} bg="#EEF5EE" rounded="lg" border="1px solid #C3DFC3">
        <Text fontSize="xs" color="#344E41" lineHeight="1.5">
          L'énergie renouvelable certifiée est comptabilisée à <strong>0 kgCO₂e/kWh</strong> (approche basée sur le marché, ISO 14064).
        </Text>
      </Box>
    </VStack>
  )

  return (
    <Box p={4} bg={G.bg} rounded="lg">
      <Text fontSize="sm" color={G.muted}>Formulaire non disponible pour cette source ({sourceCode}).</Text>
    </Box>
  )
}

