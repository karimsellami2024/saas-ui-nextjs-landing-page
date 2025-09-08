// pages/api/vehicle-reference/reindex.ts
import * as XLSX from 'xlsx'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// ---------- helpers ----------
const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normKey = (k: string) =>
  stripDiacritics(String(k || ''))
    .replace(/\u00A0/g, ' ')            // nbsp → space
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '_')            // non-word → _
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_')

const normRowKeys = (row: Record<string, any>) => {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row || {})) out[normKey(k)] = v
  return out
}

const pick = (rowMap: Record<string, any>, aliases: string[]) => {
  // exact
  for (const a of aliases) {
    const key = normKey(a)
    if (key in rowMap) return rowMap[key]
  }
  // fuzzy contains
  const keys = Object.keys(rowMap)
  for (const a of aliases) {
    const token = normKey(a)
    const hit = keys.find(k => k.includes(token))
    if (hit) return rowMap[hit]
  }
  return null
}

const toNumber = (v: any) => {
  if (v == null) return null
  const s = String(v).replace(',', '.').replace(/[^0-9.\-]/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}
const toInt = (v: any) => {
  const n = toNumber(v)
  return n == null ? null : Math.round(n)
}

// detect the header row index (0-based) by scanning for Année/Marque/Modèle
function findHeaderRow(ws: XLSX.WorkSheet): number {
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null }) as any[][]
  for (let r = 0; r < rows.length; r++) {
    const cells = (rows[r] || []).map(c => normKey(String(c ?? '')))
    const hasYear  = cells.some(c => c.includes('annee') || c === 'year')
    const hasMake  = cells.some(c => c.includes('marque') || c === 'make')
    const hasModel = cells.some(c => c.includes('modele') || c === 'model')
    if (hasYear && hasMake && hasModel) return r
  }
  return 0 // fallback
}

function mapVehicleRow(raw: Record<string, any>) {
  const r = normRowKeys(raw)
  const V = (arr: string[] | string) => pick(r, Array.isArray(arr) ? arr : [arr])

  const year  = toInt(V(['year', 'annee', 'année']))
  const make  = V(['make', 'marque'])
  const model = V(['model', 'modele', 'modèle'])
  if (!year || !make || !model) return null

  // French columns from your screenshot
  const transmission = V(['transmission', 'transmission_1'])
  const fuel_type    = V(['fuel_type', 'type_de_carburant', 'type_de_carburant_1', 'type_carburant'])

  const city_l_100km     = toNumber(V([
    'city_l_100km',
    'consommation_en_ville_l_100km',
  ]))
  const highway_l_100km  = toNumber(V([
    'highway_l_100km',
    'consommation_sur_route_l_100km',
  ]))
  const combined_l_100km = toNumber(V([
    'combined_l_100km',
    'combinee_l_100km',        // ← “Combinée [L/100km]”
  ]))

  const co2_g_km = toNumber(V([
    'co2_g_km',
    'emissions_de_co2_g_km',   // ← “Émissions de CO2 [g/km]”
  ]))

  const displacement_l = toNumber(V([
    'displacement_l',
    'engine_l',
    'cylindree_l',             // ← “Cylindrée [L]”
  ]))

  const cylinders = toInt(V(['cylinders', 'cylindres']))

  const combined_kwh_100km = toNumber(V([
    'combined_kwh_100km',
    'kwh_100km',               // substring present in “Combinée … [kWh/100km]”
  ]))

  const weight_kg = toNumber(V(['weight_kg', 'poids_kg']))

  return {
    year,
    make: String(make).trim(),
    model: String(model).trim(),
    vehicle_category: V(['vehicle_category', 'categorie_de_vehicule', 'categorie', 'catégorie']) ?? null,
    displacement_l,
    cylinders,
    transmission: transmission ?? null,
    fuel_type: fuel_type ?? null,
    city_l_100km,
    highway_l_100km,
    combined_l_100km,
    co2_g_km,
    combined_kwh_100km,
    weight_kg,
  }
}

function parseSheet(ws: XLSX.WorkSheet) {
  const headerRow = findHeaderRow(ws)
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, {
    range: headerRow,         // start reading at the detected header row
    defval: null,
    raw: false,
  })
  const mapped = rawRows.map(mapVehicleRow).filter(Boolean)
  return { rawRows, mapped, headerRow }
}

// ---------- route ----------
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { bucket, path, sheet, truncate = true } = req.body || {}
    if (!bucket || !path) return res.status(400).json({ error: 'Missing bucket or path' })

    const { data: blob, error: dlErr } = await supabaseAdmin.storage.from(bucket).download(path)
    if (dlErr) return res.status(400).json({ error: `Storage download failed: ${dlErr.message}` })

    const ab = await blob.arrayBuffer()
    const wb = XLSX.read(Buffer.from(ab), { type: 'buffer' })

    const names = wb.SheetNames || []
    if (!names.length) return res.status(400).json({ error: 'Workbook has no sheets' })

    let use = sheet && names.includes(sheet) ? sheet : null
    let mapped: any[] = []
    let debug = { tried: [] as any[] }

    if (use) {
      const r = parseSheet(wb.Sheets[use])
      mapped = r.mapped
      debug.tried.push({ name: use, headerRow: r.headerRow, sampleKeys: Object.keys(normRowKeys(r.rawRows[0] || {})) })
    } else {
      for (const n of names) {
        const r = parseSheet(wb.Sheets[n])
        debug.tried.push({ name: n, headerRow: r.headerRow, sampleKeys: Object.keys(normRowKeys(r.rawRows[0] || {})) })
        if (r.mapped.length) { use = n; mapped = r.mapped; break }
      }
    }

    if (!mapped.length) {
      return res.status(200).json({
        ok: true,
        inserted: 0,
        note: 'No valid rows after normalization / header detection',
        debug,
      })
    }

    if (truncate) {
      const { error: delErr } = await supabaseAdmin.from('vehicle_reference').delete().neq('id', -1)
      if (delErr) return res.status(500).json({ error: `Truncate failed: ${delErr.message}` })
    }

    let inserted = 0
    const CHUNK = 1000
    for (let i = 0; i < mapped.length; i += CHUNK) {
      const slice = mapped.slice(i, i + CHUNK)
      const { error: insErr, count } = await supabaseAdmin
        .from('vehicle_reference')
        .insert(slice, { count: 'exact', defaultToNull: true })
      if (insErr) return res.status(500).json({ error: `Insert failed at batch ${i}: ${insErr.message}` })
      inserted += count ?? slice.length
    }

    return res.status(200).json({ ok: true, sheet: use, inserted, totalParsed: mapped.length })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' })
  }
}
