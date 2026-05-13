"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";
import {
  saveAutomationPrefill,
  type AutomationBillRecord,
} from "../../lib/automationPrefill";

import UploadZones, { UploadedFiles } from "../../components/automation/UploadZones";
import PipelineProgress, { CategoryProgress, BillItem } from "../../components/automation/PipelineProgress";
import EmissionsDashboard from "../../components/automation/EmissionsDashboard";

// ── Brand ──────────────────────────────────────────────────────────────────────
const P = {
  dark: "#1B2E25", brand: "#344E41", accent: "#588157",
  light: "#A3B18A", soft: "#DDE5E0", bg: "#F5F6F4", muted: "#6B7A72",
};

// ── Main app Supabase (has poste_sources, postes, user_profiles) ───────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Helpers ────────────────────────────────────────────────────────────────────
function uid() { return (crypto as any)?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`; }

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function toNum(x: any, fallback = 0): number {
  if (x === "" || x == null) return fallback;
  const n = typeof x === "number" ? x : Number(String(x).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

// ── Extract PDF/images from ZIP ────────────────────────────────────────────────
async function extractFromZip(
  zipFile: File
): Promise<{ name: string; buffer: ArrayBuffer; mime: string }[]> {
  const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
  const out: { name: string; buffer: ArrayBuffer; mime: string }[] = [];
  const ALLOWED = [".pdf", ".jpg", ".jpeg", ".png"];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const ext = path.toLowerCase().slice(path.lastIndexOf("."));
    if (!ALLOWED.includes(ext)) continue;
    out.push({
      name: path.split("/").pop() ?? path,
      buffer: await entry.async("arraybuffer"),
      mime: ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg",
    });
  }
  return out;
}

// ── Process one file through the n8n pipeline ─────────────────────────────────
async function processBillApi(
  sessionId: string, name: string, buffer: ArrayBuffer, mime: string,
  billType: string, province: string, fuelType = "diesel", companyName = ""
): Promise<AutomationBillRecord | null> {
  const msg = billType === "refrigerant"
    ? `Voici une photo de plaque signalétique de climatiseur. Extrais le type de frigorigène (ex: R-410A) et la charge en kg, puis calcule immédiatement les émissions GES sans poser de questions.`
    : `Voici une facture à traiter automatiquement. Type: ${billType}, Province: ${province}` +
      (billType === "fuel" ? `, Carburant: ${fuelType}` : "") +
      `. Extrais la consommation et calcule immédiatement les émissions sans poser de questions.`;

  const res = await fetch("/api/automation/process-bill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId, message: msg,
      file_base64: toBase64(buffer), file_mime: mime, file_name: name,
      auto_calculate: true, bill_type: billType, province, fuel_type: fuelType,
      company_name: companyName,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const r = data?.results;
  if (!r) return null;
  return {
    total_ges_tco2e:         r.total_ges_tco2e         ?? null,
    total_co2_gco2e:         r.total_co2_gco2e         ?? null,
    energie_equivalente_kwh: r.energie_equivalente_kwh ?? null,
    consumption_value:       r.consumption_value       ?? null,
    consumption_unit:        r.consumption_unit        ?? null,
    bill_date:               r.bill_date               ?? null,
    provider:                r.provider                ?? null,
    province:                r.province                ?? null,
    bill_type:               r.bill_type               ?? null,
    meter_number:            r.meter_number            ?? null,
    address:                 r.address                 ?? null,
    equipment_name:          r.equipment_name          ?? null,
    site_name:               r.site_name               ?? null,
    fuel_sub_type:           r.fuel_sub_type           ?? null,
    billing_period:          r.billing_period          ?? null,
    refrigerant_type:        r.refrigerant_type        ?? null,
    charge_kg:               r.charge_kg               ?? null,
    gwp:                     r.gwp                     ?? null,
  };
}

// ── Fetch already-saved GHG total from existing form submissions ───────────────
// source_code: "6A1" = electricity, "2A1" = fleet/fuel, "1A1" = fixed combustion/gas
async function fetchSavedSourceTotal(
  sourceCode: string,
  posteNum: number
): Promise<{ tco2e: number; label: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("user_profiles").select("company_id").eq("id", user.id).single();
    if (!profile?.company_id) return null;

    const { data: poste } = await supabase
      .from("postes").select("id")
      .eq("company_id", profile.company_id).eq("num", posteNum).single();
    if (!poste?.id) return null;

    const { data: source } = await supabase
      .from("poste_sources").select("results")
      .eq("poste_id", poste.id).eq("source_code", sourceCode).maybeSingle();
    if (!source?.results) return null;

    // results is an array of per-row GES objects — sum total_ges_tco2e
    const rows = Array.isArray(source.results) ? source.results : [source.results];
    const tco2e = rows.reduce((s: number, r: any) => s + toNum(r?.total_ges_tco2e), 0);
    return { tco2e, label: sourceCode };
  } catch {
    return null;
  }
}

// ── Initial categories (3 required + optional refrigerant + fleet) ────────────
const INIT_CATEGORIES = (hasRefrigerant = false): CategoryProgress[] => [
  { key: "electricity", icon: "⚡", label: "Électricité",  status: "idle", total: 0, processed: 0, ges_total: 0, bills: [] },
  { key: "fuel",        icon: "⛽", label: "Carburant",    status: "idle", total: 0, processed: 0, ges_total: 0, bills: [] },
  { key: "natural_gas", icon: "🔥", label: "Gaz naturel",  status: "idle", total: 0, processed: 0, ges_total: 0, bills: [] },
  ...(hasRefrigerant ? [
    { key: "refrigerant", icon: "❄️", label: "Frigorigènes (climatiseurs)", status: "idle" as const, total: 0, processed: 0, ges_total: 0, bills: [] },
  ] : []),
  // Fleet is read from existing SourceA1Form results — not re-processed
  { key: "fleet",       icon: "🚗", label: "Flotte (données existantes)", status: "idle", total: 0, processed: 0, ges_total: 0, bills: [] },
];

type Stage = "upload" | "processing" | "complete";

// ══════════════════════════════════════════════════════════════════════════════
export default function AutomationPage() {
  const [stage,         setStage]         = useState<Stage>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({
    electricity: null, fuel: null, natural_gas: null, refrigerant: null, province: "Québec", company_name: "",
  });
  const [categories,   setCategories]    = useState<CategoryProgress[]>(INIT_CATEGORIES());
  const [userId,       setUserId]        = useState<string | null>(null);
  const [companyId,    setCompanyId]     = useState<string | null>(null);
  const [companyName,  setCompanyName]   = useState<string | null>(null);

  // Accumulates full bill records per category for localStorage prefill
  const accumulatedBillsRef = useRef<Record<string, AutomationBillRecord[]>>({
    natural_gas: [], electricity: [], refrigerant: [], fuel: [],
  });

  // Fetch current user + company on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("company_id, companies(name)")
          .eq("id", user.id)
          .single();
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          const name = (profile as any).companies?.name ?? null;
          setCompanyName(name);
        }
      } catch {}
    })();
  }, []);

  const grandTotal = categories.reduce((s, c) => s + c.ges_total, 0);
  const allDone    = categories.every(c => c.status === "done" || c.status === "error");

  // ── Category state helpers ─────────────────────────────────────────────────
  const patchCat = (key: string, patch: Partial<CategoryProgress>) =>
    setCategories(prev => prev.map(c => c.key === key ? { ...c, ...patch } : c));

  const patchBill = (catKey: string, name: string, patch: Partial<BillItem>) =>
    setCategories(prev => prev.map(c =>
      c.key === catKey
        ? { ...c, bills: c.bills.map(b => b.name === name ? { ...b, ...patch } : b) }
        : c
    ));

  const incrementGes = (catKey: string, delta: number) =>
    setCategories(prev => prev.map(c =>
      c.key === catKey
        ? { ...c, ges_total: c.ges_total + delta, processed: c.processed + 1 }
        : c
    ));

  // ── Process one ZIP category through n8n ──────────────────────────────────
  async function processZipCategory(
    catKey: "electricity" | "fuel" | "natural_gas" | "refrigerant",
    zipFile: File,
    province: string,
    companyName: string
  ) {
    patchCat(catKey, { status: "extracting" });
    const sessionId = uid();

    try {
      const files = await extractFromZip(zipFile);
      if (files.length === 0) {
        patchCat(catKey, { status: "error", error: "Aucun fichier PDF/image trouvé dans le ZIP" });
        return;
      }

      const bills: BillItem[] = files.map(f => ({ name: f.name, status: "pending" as const }));
      patchCat(catKey, { status: "processing", total: files.length, bills });

      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        if (idx > 0) await new Promise(r => setTimeout(r, 6000)); // rate-limit gap
        patchBill(catKey, file.name, { status: "processing" });

        try {
          const record = await processBillApi(
            sessionId, file.name, file.buffer, file.mime,
            catKey, province, "diesel", companyName
          );
          const value = record?.total_ges_tco2e ?? 0;
          patchBill(catKey, file.name, { status: "done", tco2e: value });
          incrementGes(catKey, value);
          // Accumulate full record for localStorage prefill (skip fleet)
          if (record && ["natural_gas", "electricity", "refrigerant", "fuel"].includes(catKey)) {
            accumulatedBillsRef.current[catKey] = [
              ...(accumulatedBillsRef.current[catKey] ?? []),
              record,
            ];
          }
        } catch {
          patchBill(catKey, file.name, { status: "error", error: "Erreur API" });
          setCategories(prev => prev.map(c =>
            c.key === catKey ? { ...c, processed: c.processed + 1 } : c
          ));
        }
      }
      patchCat(catKey, { status: "done" });

    } catch (err: any) {
      patchCat(catKey, { status: "error", error: err.message });
    }
  }

  // ── Load fleet from existing SourceA1Form submission (no AI, no re-processing)
  async function loadFleetFromExistingData() {
    patchCat("fleet", { status: "extracting" });
    try {
      const saved = await fetchSavedSourceTotal("2A1", 2);
      if (!saved || saved.tco2e === 0) {
        patchCat("fleet", {
          status: "done",
          ges_total: 0,
          bills: [{
            name: "Aucune donnée de flotte enregistrée",
            status: "done",
            tco2e: 0,
          }],
          total: 0, processed: 0,
          error: "Remplissez le formulaire Poste 2 · Source 2A1 pour inclure la flotte.",
        });
        return;
      }

      patchCat("fleet", {
        status: "done",
        ges_total: saved.tco2e,
        total: 1, processed: 1,
        bills: [{
          name: "Résultats existants (Poste 2 · Source 2A1)",
          status: "done",
          tco2e: saved.tco2e,
        }],
      });
    } catch (err: any) {
      patchCat("fleet", { status: "error", error: err.message });
    }
  }

  // ── Launch full pipeline ───────────────────────────────────────────────────
  const handleStart = async () => {
    const { electricity, fuel, natural_gas, refrigerant, province, company_name } = uploadedFiles;
    if (!electricity || !fuel || !natural_gas) return;

    setStage("processing");
    setCategories(INIT_CATEGORIES(!!refrigerant));

    // Fleet: instant read from existing Supabase data (Source 2A1)
    loadFleetFromExistingData();

    // ZIP categories: parallel, each rate-limits internally
    processZipCategory("electricity", electricity, province, company_name);
    processZipCategory("fuel",        fuel,        province, company_name);
    processZipCategory("natural_gas", natural_gas, province, company_name);
    if (refrigerant) processZipCategory("refrigerant", refrigerant, province, company_name);
  };

  // ── Auto-advance to complete when all done ─────────────────────────────────
  useEffect(() => {
    if (stage === "processing" && allDone) {
      const t = setTimeout(() => {
        setStage("complete");
        // Persist full bill records to localStorage so source forms can prefill
        saveAutomationPrefill({
          savedAt:     new Date().toISOString(),
          natural_gas: accumulatedBillsRef.current.natural_gas ?? [],
          electricity: accumulatedBillsRef.current.electricity ?? [],
          refrigerant: accumulatedBillsRef.current.refrigerant ?? [],
          fuel:        accumulatedBillsRef.current.fuel        ?? [],
        });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [stage, allDone]);

  const handleReset = () => {
    setStage("upload");
    setCategories(INIT_CATEGORIES());
    setUploadedFiles({ electricity: null, fuel: null, natural_gas: null, refrigerant: null, province: "Québec", company_name: "" });
    accumulatedBillsRef.current = { natural_gas: [], electricity: [], refrigerant: [], fuel: [] };
  };

  // ── Stage label ────────────────────────────────────────────────────────────
  const stageLabel = {
    upload:     "Téléversez vos 3 archives ZIP pour lancer l'analyse automatique.",
    processing: "Pipeline en cours — vos factures sont analysées en temps réel.",
    complete:   "Bilan complet — vos émissions annuelles ont été calculées.",
  }[stage];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Flex direction="column" minH="calc(100vh - 80px)" bg={P.bg}>

      {/* Header */}
      <Box bg={P.brand} px={8} py={5} flexShrink={0}>
        <Text fontSize="xl" fontWeight="bold" color="white">
          Analyse des émissions GES — Bilan annuel
        </Text>
        <Text fontSize="sm" color={P.light} mt={0.5}>{stageLabel}</Text>
      </Box>

      {/* Step indicator */}
      <Box px={8} py={3} bg="white" borderBottomWidth="1px" borderColor={P.soft} flexShrink={0}>
        <Flex align="center" gap={0}>
          {(["upload", "processing", "complete"] as Stage[]).map((s, i) => {
            const labels = ["1. Téléversement", "2. Analyse", "3. Résultats"];
            const active = stage === s;
            const done   = (["upload", "processing", "complete"] as Stage[]).indexOf(stage) > i;
            return (
              <React.Fragment key={s}>
                <Flex align="center" gap={2}>
                  <Box
                    w={6} h={6} borderRadius="full"
                    bg={done ? P.accent : active ? P.brand : P.soft}
                    display="flex" alignItems="center" justifyContent="center"
                  >
                    <Text fontSize="xs" color={done || active ? "white" : P.muted} fontWeight="bold">
                      {done ? "✓" : i + 1}
                    </Text>
                  </Box>
                  <Text fontSize="sm" color={active ? P.brand : done ? P.accent : P.muted}
                    fontWeight={active ? "bold" : "normal"}>
                    {labels[i]}
                  </Text>
                </Flex>
                {i < 2 && <Box flex={1} h="1px" bg={done ? P.accent : P.soft} mx={3} minW={8} />}
              </React.Fragment>
            );
          })}
        </Flex>
      </Box>

      {/* Main content */}
      <Box flex={1} px={{ base: 4, md: 8 }} py={8} overflowY="auto">
        {stage === "upload" && (
          <Flex direction="column" align="center" gap={6}>
            <Flex direction="column" align="center" gap={1}>
              <Text fontSize="2xl" fontWeight="bold" color={P.dark}>
                Prêt à calculer votre bilan GES ?
              </Text>
              <Text fontSize="sm" color={P.muted} maxW="560px" textAlign="center">
                Téléversez vos 3 archives ZIP de factures. La flotte de véhicules est lue
                automatiquement depuis vos données existantes (Poste 2 · Source 2A1).
              </Text>
            </Flex>
            <UploadZones
              files={uploadedFiles}
              onChange={patch => setUploadedFiles(prev => ({ ...prev, ...patch }))}
              onStart={handleStart}
            />
          </Flex>
        )}

        {stage === "processing" && (
          <PipelineProgress categories={categories} grandTotal={grandTotal} />
        )}

        {stage === "complete" && (
          <EmissionsDashboard categories={categories} onReset={handleReset} />
        )}
      </Box>
    </Flex>
  );
}
