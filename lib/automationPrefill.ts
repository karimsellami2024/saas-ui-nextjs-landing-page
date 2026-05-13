/**
 * Automation → Source Forms prefill bridge.
 * Saves processed bill records from the automation tab to localStorage so that
 * Source 1A1 (natural gas), Source 6A1 (electricity) and Source 4A1 (refrigerant)
 * forms can auto-fill themselves on mount.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type AutomationBillRecord = {
  // Core emissions
  total_ges_tco2e?:         number | null;
  total_co2_gco2e?:         number | null;
  energie_equivalente_kwh?: number | null;
  // Consumption
  consumption_value?:       number | null;
  consumption_unit?:        string | null; // "m3" | "kWh" | "L" | "kg" | "GJ" | "MWh"
  // Bill metadata
  bill_date?:               string | null; // YYYY-MM-DD
  provider?:                string | null;
  province?:                string | null;
  bill_type?:               string | null;
  // Extended (new fields from expanded n8n parser)
  meter_number?:            string | null;
  address?:                 string | null;
  equipment_name?:          string | null;
  site_name?:               string | null;
  fuel_sub_type?:           string | null;
  billing_period?:          string | null;
  // Refrigerant-specific
  refrigerant_type?:        string | null;
  charge_kg?:               number | null;
  gwp?:                     number | null;
};

export type AutomationPrefillStore = {
  savedAt:     string; // ISO timestamp
  natural_gas: AutomationBillRecord[];
  electricity: AutomationBillRecord[];
  refrigerant: AutomationBillRecord[];
  fuel:        AutomationBillRecord[];
};

// ── localStorage helpers ───────────────────────────────────────────────────────

const LS_KEY = "automation_prefill_v1";

export function saveAutomationPrefill(data: AutomationPrefillStore): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export function readAutomationPrefill(): AutomationPrefillStore | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AutomationPrefillStore;
  } catch { return null; }
}

export function clearAutomationPrefill(): void {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// ── Mapping: natural_gas bills → Source1ARow[] ────────────────────────────────

// Source1ARow shape (mirrors Source1A1Form.tsx types)
export type PrefillSource1AEntry = { date: string; qty: string; unit: string; reference: string };
export type PrefillSource1ARow = {
  equipment: string; description: string; site: string;
  product: string; usageAndFuel: string; unit: string;
  entries: PrefillSource1AEntry[];
};

function inferFuelOption(
  bill_type:      string | null | undefined,
  fuel_sub_type:  string | null | undefined,
  consumption_unit: string | null | undefined,
): string {
  const sub  = (fuel_sub_type   ?? "").toLowerCase();
  const unit = (consumption_unit ?? "").toLowerCase();
  const type = (bill_type        ?? "").toLowerCase();

  if (type === "natural_gas" || sub.includes("gaz naturel") || sub.includes("natural gas")) {
    return "Chauffage - Gaz naturel [m3]";
  }
  if (sub.includes("propane")) {
    if (unit === "kg")  return "Autre - Propane [kg]";
    if (unit === "lbs") return "Autre - Propane [lbs]";
    return "Chauffage - Propane [L]";
  }
  if (sub.includes("diesel")) return "Génératrice - Diesel [L]";
  if (sub.includes("mazout") || sub.includes("fuel oil")) return "Chauffage - Mazout [L]";
  if (sub.includes("essence") || sub.includes("gasoline")) return "Génératrice - Essence [L]";
  if (sub.includes("bois") || sub.includes("wood")) return "Chauffage - Bois [kg]";
  if (sub.includes("acétylène") || sub.includes("acetylene")) return "Soudure - Acétylène [kg]";
  // Default for "fuel" bill type
  if (type === "fuel" || type === "fuel_oil" || type === "gasoline") return "Chauffage - Mazout [L]";
  return "Chauffage - Gaz naturel [m3]";
}

function normalizeUnit(raw: string | null | undefined): string {
  const u = (raw ?? "").toLowerCase().replace(/[³3]/, "3");
  if (u.includes("m3")) return "m3";
  if (u === "kg")  return "kg";
  if (u === "lbs") return "lbs";
  return "L";
}

export function mapNaturalGasToRows(bills: AutomationBillRecord[]): PrefillSource1ARow[] {
  return bills
    .filter(b => (b.consumption_value ?? 0) > 0)
    .map(b => {
      const unit = normalizeUnit(b.consumption_unit);
      const usageAndFuel = inferFuelOption(b.bill_type, b.fuel_sub_type, b.consumption_unit);
      const reference = b.provider ? `Fournisseur: ${b.provider}` : "";
      return {
        equipment:   b.equipment_name ?? "Équipement gaz naturel",
        description: b.provider ?? "",
        site:        b.site_name ?? "",
        product:     "",
        usageAndFuel,
        unit,
        entries: [{
          date:      b.bill_date ?? "",
          qty:       String(b.consumption_value ?? ""),
          unit,
          reference,
        }],
      };
    });
}

// ── Mapping: electricity bills → CompteurGroup[] ──────────────────────────────

// CompteurGroup shape (mirrors Source6A1Form.tsx types)
export type PrefillCompteurDetailRow = { date: string; consumption: string; reference: string; periode: string };
export type PrefillCompteurGroup = {
  number: string; address: string; province: string;
  site: string; commentaires: string;
  details: PrefillCompteurDetailRow[];
};

const FR_MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function derivePeriode(bill_date: string | null | undefined): string {
  if (!bill_date) return "";
  try {
    const d = new Date(bill_date + "T12:00:00"); // noon to avoid TZ off-by-one
    if (isNaN(d.getTime())) return "";
    return FR_MONTH_NAMES[d.getMonth()] ?? "";
  } catch { return ""; }
}

export function mapElectricityToGroups(bills: AutomationBillRecord[]): PrefillCompteurGroup[] {
  return bills
    .filter(b => (b.consumption_value ?? 0) > 0)
    .map(b => ({
      number:       b.meter_number ?? "",
      address:      b.address ?? "",
      province:     b.province ?? "",
      site:         b.site_name ?? "",
      commentaires: b.provider ?? "",
      details: [{
        date:        b.bill_date ?? "",
        consumption: String(b.consumption_value ?? ""),
        reference:   b.provider ? `Fournisseur: ${b.provider}` : "",
        periode:     derivePeriode(b.bill_date),
      }],
    }));
}

// ── Mapping: refrigerant bills → Source4A1Row[] ───────────────────────────────

// Source4A1Row shape (mirrors Source4A1Form.tsx types)
export type PrefillSource4A1Row = {
  equipment: string; description: string; date: string; months: string;
  site: string; product: string; reference: string;
  refrigerationType: string; refrigerant: string;
  qtyInEquipment: string; leakObserved: string;
};

function deriveMonths(billing_period: string | null | undefined): string {
  if (!billing_period) return "12";
  // Try to find a number of months explicitly
  const m = billing_period.match(/(\d+)\s*(?:mois|months?)/i);
  if (m) return m[1];
  return "12";
}

// ── Mapping: fuel bills → CarburantGroup[] (Source 2A1) ──────────────────────

export type PrefillCarburantRow = {
  details: string; date: string; invoiceNumber: string; qty: string;
};
export type PrefillCarburantGroup = {
  vehicle: string; fuelType: string; rows: PrefillCarburantRow[];
};

function mapCarburantType(fuel_sub_type: string | null | undefined): string {
  const sub = (fuel_sub_type ?? '').toLowerCase();
  if (sub.includes('diesel'))                                          return 'Diesel';
  if (sub.includes('essence') || sub.includes('gasoline'))            return 'Essence';
  if (sub.includes('propane'))                                         return 'Propane';
  if (sub.includes('gaz naturel') || sub.includes('natural gas') ||
      sub.includes('gnc') || sub.includes('cng'))                      return 'Gaz naturel comprimé';
  return fuel_sub_type ?? '';
}

export function mapFuelToCarburantGroups(bills: AutomationBillRecord[]): PrefillCarburantGroup[] {
  const grouped = new Map<string, PrefillCarburantGroup>();

  for (const b of bills.filter(b => (b.consumption_value ?? 0) > 0)) {
    const vehicle  = b.equipment_name ?? '';
    const fuelType = mapCarburantType(b.fuel_sub_type);
    const key      = `${vehicle}||${fuelType}`;

    if (!grouped.has(key)) {
      grouped.set(key, { vehicle, fuelType, rows: [] });
    }
    grouped.get(key)!.rows.push({
      details:       b.provider ?? '',
      date:          b.bill_date ?? '',
      invoiceNumber: '',
      qty:           String(b.consumption_value ?? ''),
    });
  }

  return Array.from(grouped.values());
}

// ── Mapping: refrigerant bills → Source4A1Row[] ───────────────────────────────

export function mapRefrigerantToRows(bills: AutomationBillRecord[]): PrefillSource4A1Row[] {
  return bills
    .filter(b => (b.charge_kg ?? 0) > 0)
    .map(b => ({
      equipment:        b.equipment_name ?? "Équipement réfrigération",
      description:      b.provider ?? "",
      date:             b.bill_date ?? "",
      months:           deriveMonths(b.billing_period),
      site:             b.site_name ?? "",
      product:          "",
      reference:        b.provider ? `Fournisseur: ${b.provider}` : "",
      refrigerationType: "", // user must select
      refrigerant:      b.refrigerant_type ?? "",
      qtyInEquipment:   String(b.charge_kg ?? ""),
      leakObserved:     "",
    }));
}
