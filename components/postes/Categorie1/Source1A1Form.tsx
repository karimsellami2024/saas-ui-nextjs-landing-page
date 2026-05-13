import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Text,
  Spinner,
  Button,
  Input,
  Select,
  HStack,
  Grid,
  Icon,
  Flex,
  useToast,
} from "@chakra-ui/react";
import { Trash2, Copy } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
import { ReferenceSelect } from '../ReferenceSelect';
import { CheckCircleIcon } from "@chakra-ui/icons";

export type Source1AEntry = {
  date: string;
  qty: string;
  unit: string;
  reference: string;
};

export type Source1ARow = {
  equipment: string;
  description: string;
  site: string;
  product: string;
  usageAndFuel: string;
  unit: string;
  entries: Source1AEntry[];
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface Source1AFormProps {
  rows: Source1ARow[];
  setRows: React.Dispatch<React.SetStateAction<Source1ARow[]>>;
  highlight?: string; // unused now (kept for compatibility)
  tableBg?: string; // unused now (kept for compatibility)
  posteSourceId: string | null;
  userId?: string | null;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
  bilanId?: string;
  /** Called once after all loads complete when the form is empty (no saved data) */
  onMountedEmpty?: () => void;
  /** Called once after all loads complete when the form has existing saved data */
  onMountedNotEmpty?: () => void;
}

const FUEL_OPTIONS = [
  "Chauffage - Gaz naturel [m3]",
  "Chauffage - Propane [L]",
  "Chauffage - Mazout [L]",
  "Chauffage - Bois [kg]",
  "Génératrice - Essence [L]",
  "Génératrice - Diesel [L]",
  "Génératrice - Mazout [L]",
  "Soudure - Acétylène [kg]",
  "Soudure - Argoshield [kg]",
  "Autre - Gaz naturel [m3]",
  "Autre - Propane [L]",
  "Autre - Propane [kg]",
  "Autre - Propane [lbs]",
];
const UNIT_OPTIONS = ["L", "kg", "m3", "lbs"];

const emptyEntry = (unit = ""): Source1AEntry => ({ date: "", qty: "", unit, reference: "" });

const DEFAULT_ROWS: Source1ARow[] = [
  {
    equipment: "",
    description: "",
    site: "",
    product: "",
    usageAndFuel: "",
    unit: "",
    entries: [emptyEntry()],
  },
];

const parseUnitFromFuel = (fuelLabel: string) => {
  const m = fuelLabel.match(/\[([^\]]+)\]\s*$/);
  return m?.[1] ?? "";
};

// --- Helpers (robust numbers like 4B2) ---
const toNum = (x: any, fallback = 0) => {
  if (x === "" || x == null) return fallback;
  const n =
    typeof x === "number"
      ? x
      : Number(String(x).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

// --- Refs loaded from your real DB schema ---
type Refs = {
  gco2ByLabel: Record<string, number>;
  gch4ByLabel: Record<string, number>;
  gn2oByLabel: Record<string, number>;
  kwhByLabel: Record<string, number>;
  prpCO2: number;
  prpCH4: number;
  prpN2O: number;
};


export function Source1AForm({
  rows = [],
  setRows,
  posteSourceId,
  userId: propUserId,
  setGesResults,
  bilanId,
  onMountedEmpty,
  onMountedNotEmpty,
}: Source1AFormProps) {
  const toast = useToast();

  // Enhanced design tokens (same palette as 6A1)
  const FIGMA = {
    bg: "#F5F6F5",
    green: "#344E41",
    greenLight: "#588157",
    greenSoft: "#DDE5E0",
    border: "#E4E4E4",
    text: "#404040",
    muted: "#8F8F8F",
    r: "16px",
    inputR: "15px",
    inputShadow: "0px 1px 6px 2px rgba(0,0,0,0.05)",
    buttonShadow: "0px 1px 6px 2px rgba(0,0,0,0.25)",
    cardShadow: "0 4px 16px rgba(0,0,0,0.08)",
    hoverShadow: "0 8px 24px rgba(0,0,0,0.12)",
  };

  const [loading, setLoading] = useState(true);

  // Autosave UI (match 6A1)
  const [autoSaving, setAutoSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [refs, setRefs] = useState<Refs | null>(null);

  // Dropdown options from company
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

  // Prefill (poste 1, source 1A1)
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource((userId ?? "") as string, 1, "1A1", {
    rows: DEFAULT_ROWS,
  });

  const isPristine = useMemo(() => {
    if (!rows || rows.length === 0) return true;
    if (rows.length !== 1) return false;
    const r = rows[0];
    const entriesEmpty = !r.entries || r.entries.length === 0 ||
      r.entries.every(e => !e.date && !e.qty && !e.reference);
    return !r.equipment && !r.description && !r.site && !r.product && !r.usageAndFuel && entriesEmpty;
  }, [rows]);

  // --------------------------
  // Load refs (PRP + emission_factors)
  // --------------------------
  useEffect(() => {
    (async () => {
      try {
        const { data: gesRows, error: gesErr } = await supabase
          .from("gaz_effet_serre")
          .select("formule_chimique, prp_100ans");
        if (gesErr) throw gesErr;

        const prpMap: Record<string, number> = Object.fromEntries(
          (gesRows ?? [])
            .filter((r: any) => r?.formule_chimique && r?.prp_100ans != null)
            .map((r: any) => [
              String(r.formule_chimique).trim().toUpperCase(),
              Number(r.prp_100ans),
            ])
        );

        const prpCO2 = Number.isFinite(prpMap["CO2"]) ? prpMap["CO2"] : 1;
        const prpCH4 = Number.isFinite(prpMap["CH4"]) ? prpMap["CH4"] : 0;
        const prpN2O = Number.isFinite(prpMap["N2O"]) ? prpMap["N2O"] : 0;

        const { data: efRows, error: efErr } = await supabase
          .from("emission_factors")
          .select(
            "label, energy_kwh_per_unit, gco2_per_unit, gch4_per_unit, gn2o_per_unit"
          );
        if (efErr) throw efErr;

        const gco2ByLabel: Record<string, number> = {};
        const gch4ByLabel: Record<string, number> = {};
        const gn2oByLabel: Record<string, number> = {};
        const kwhByLabel: Record<string, number> = {};

        (efRows ?? []).forEach((r: any) => {
          const key = String(r?.label ?? "").trim();
          if (!key) return;
          if (r?.gco2_per_unit != null) gco2ByLabel[key] = Number(r.gco2_per_unit);
          if (r?.gch4_per_unit != null) gch4ByLabel[key] = Number(r.gch4_per_unit);
          if (r?.gn2o_per_unit != null) gn2oByLabel[key] = Number(r.gn2o_per_unit);
          if (r?.energy_kwh_per_unit != null) kwhByLabel[key] = Number(r.energy_kwh_per_unit);
        });

        setRefs({
          gco2ByLabel,
          gch4ByLabel,
          gn2oByLabel,
          kwhByLabel,
          prpCO2,
          prpCH4,
          prpN2O,
        });
      } catch (e) {
        console.error("1A1 refs load error:", e);
        setRefs({
          gco2ByLabel: {},
          gch4ByLabel: {},
          gn2oByLabel: {},
          kwhByLabel: {},
          prpCO2: 1,
          prpCH4: 0,
          prpN2O: 0,
        });
      }
    })();
  }, []);

  // --------------------------
  // Load latest saved poste data
  // --------------------------
  useEffect(() => {
    (async () => {
      setLoading(true);

      let activeUserId = propUserId ?? null;
      if (!activeUserId) {
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user) activeUserId = auth.user.id;
      }
      if (!activeUserId) {
        setLoading(false);
        return;
      }
      setUserId(activeUserId);

      const { data, error } = await supabase
        .from("submissions")
        .select(
          `
          id,
          postes!postes_submission_id_fkey (
            id, poste_num, data, results
          )
        `
        )
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && (data as any)?.postes) {
        const poste = posteSourceId
          ? (data as any).postes.find((p: any) => p.id === posteSourceId)
          : (data as any).postes.find((p: any) => p.poste_num === 1);

        if (poste) {
          let parsed = poste.data;
          if (typeof parsed === "string") {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              parsed = {};
            }
          }
          if (parsed?.rows && Array.isArray(parsed.rows)) {
            setRows(
              parsed.rows.map((r: any) => {
                const unit = r.unit ?? "";
                // New format: has entries array
                if (Array.isArray(r.entries) && r.entries.length > 0) {
                  return {
                    equipment: r.equipment ?? "",
                    description: r.description ?? "",
                    site: r.site ?? "",
                    product: r.product ?? "",
                    usageAndFuel: r.usageAndFuel ?? r.fuel ?? "",
                    unit,
                    entries: r.entries.map((e: any) => ({
                      date: e.date ?? "",
                      qty: String(e.qty ?? ""),
                      unit: e.unit ?? unit,
                      reference: e.reference ?? "",
                    })),
                  };
                }
                // Legacy flat format: migrate date/qty/reference into a single entry
                return {
                  equipment: r.equipment ?? "",
                  description: r.description ?? "",
                  site: r.site ?? "",
                  product: r.product ?? "",
                  usageAndFuel: r.usageAndFuel ?? r.fuel ?? "",
                  unit,
                  entries: [{ date: r.date ?? "", qty: String(r.qty ?? ""), unit, reference: r.reference ?? "" }],
                };
              })
            );
          } else if (!rows?.length) {
            setRows(DEFAULT_ROWS);
          }

          if (Array.isArray(poste.results)) {
            setGesResults(poste.results as GesResult[]);
          }
        } else if (!rows?.length) {
          setRows(DEFAULT_ROWS);
        }
      } else if (!rows?.length) {
        setRows(DEFAULT_ROWS);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posteSourceId, propUserId]);

  // Prefill hydrate (only once on initial load, not on every isPristine change)
  const prefillHydratedRef = useRef(false);
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (prefillHydratedRef.current) return;
    prefillHydratedRef.current = true;

    if (!isPristine) return; // form already has data — do nothing

    if ((prefillData as any)?.rows) {
      const dataRows = Array.isArray((prefillData as any).rows)
        ? (prefillData as any).rows
        : DEFAULT_ROWS;
      setRows(dataRows.length ? dataRows : DEFAULT_ROWS);
    } else if (!rows?.length) {
      setRows(DEFAULT_ROWS);
    }

    if (prefillResults) {
      const normalized = Array.isArray(prefillResults)
        ? prefillResults
        : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults, prefillLoading, loading, isPristine]);

  // Automation prefill callbacks — fires once after all loads complete
  const mountCallbackFiredRef = useRef(false);
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (mountCallbackFiredRef.current) return;
    mountCallbackFiredRef.current = true;
    if (isPristine) {
      onMountedEmpty?.();
    } else {
      onMountedNotEmpty?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, prefillLoading, isPristine]);

  // Company dropdown data
  useEffect(() => {
    (async () => {
      try {
        if (!userId) return;

        const { data: profile, error: profErr } = await supabase
          .from("user_profiles")
          .select("company_id")
          .eq("id", userId)
          .single();
        if (profErr || !profile?.company_id) return;

        const { data: company, error: compErr } = await supabase
          .from("companies")
          .select("production_sites, products, company_references")
          .eq("id", profile.company_id)
          .single();
        if (compErr) return;

        const sites = Array.isArray(company?.production_sites)
          ? (company.production_sites as any[])
              .map((s) => String(s?.nom ?? ""))
              .filter(Boolean)
          : [];
        const prods = Array.isArray(company?.products)
          ? (company.products as any[])
              .map((p) => String(p?.nom ?? ""))
              .filter(Boolean)
          : [];
        const refsArr = Array.isArray(company?.company_references)
          ? (company.company_references as any[])
              .map((r) => String(r))
              .filter(Boolean)
          : [];

        const uniq = (arr: string[]) => Array.from(new Set(arr));
        setSiteOptions(uniq(sites));
        setProductOptions(uniq(prods));
        setReferenceOptions(uniq(refsArr));
      } catch {}
    })();
  }, [userId]);

  // Validation
  const validateData = (rws: Source1ARow[]) =>
    rws.length > 0 &&
    rws.every(
      (row) =>
        row.equipment &&
        row.site &&
        row.product &&
        row.usageAndFuel &&
        row.unit &&
        row.entries?.some(e => e.qty !== "")
    );

  // --------------------------
  // LOCAL CALC
  // --------------------------
  const computeResults = (rws: Source1ARow[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    return (rws || []).map((row) => {
      const label = String(row.usageAndFuel || "").trim();
      const qty = (row.entries || []).reduce((sum, e) => sum + toNum(e.qty, 0), 0);

      if (!label || qty === 0) {
        return {
          total_co2_gco2e: 0,
          total_ges_ch4_gco2e: 0,
          total_ges_n2o_gco2e: 0,
          total_ges_gco2e: 0,
          total_ges_tco2e: 0,
          total_energie_kwh: 0,
        };
      }

      const gco2_per_unit = toNum(rf.gco2ByLabel[label], 0);
      const gch4_per_unit = toNum(rf.gch4ByLabel[label], 0);
      const gn2o_per_unit = toNum(rf.gn2oByLabel[label], 0);
      const kwh_per_unit = toNum(rf.kwhByLabel[label], 0);

      const prpCO2 = toNum(rf.prpCO2, 1);
      const prpCH4 = toNum(rf.prpCH4, 0);
      const prpN2O = toNum(rf.prpN2O, 0);

      const co2_gco2e = gco2_per_unit * qty * prpCO2;
      const ch4_gco2e = gch4_per_unit * qty * prpCH4;
      const n2o_gco2e = gn2o_per_unit * qty * prpN2O;

      const total_gco2e = co2_gco2e + ch4_gco2e + n2o_gco2e;
      const total_tco2e = total_gco2e / 1e6;

      const energie_kwh = kwh_per_unit * qty;

      return {
        total_co2_gco2e: co2_gco2e,
        total_ges_ch4_gco2e: ch4_gco2e,
        total_ges_n2o_gco2e: n2o_gco2e,
        total_ges_gco2e: total_gco2e,
        total_ges_tco2e: total_tco2e,
        total_energie_kwh: energie_kwh,
      };
    });
  };

  // Recompute whenever rows/refs change
  useEffect(() => {
    const res = computeResults(rows, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, refs]);

  // ---------- autosave ----------
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSONRef = useRef<string>("");

  const makeSanitizedRows = (rws: Source1ARow[]) =>
    rws.map((row) => ({
      equipment: row.equipment,
      description: row.description,
      site: row.site,
      product: row.product,
      usageAndFuel: row.usageAndFuel,
      unit: row.unit,
      entries: (row.entries || []).map(e => ({
        date: e.date,
        qty: toNum(e.qty, 0),
        unit: e.unit,
        reference: e.reference,
      })),
    }));

  const saveDraft = async () => {
    if (!userId || !posteSourceId) return;

    const jsonNow = JSON.stringify(rows);
    if (jsonNow === lastSavedJSONRef.current) return;

    setAutoSaving(true);
    setJustSaved(false);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 1,
      source_code: "1A1",
      submission_id: bilanId ?? null,
      data: { rows: makeSanitizedRows(rows) },
      results: computeResults(rows, refs),
    };

    try {
      const dbResponse = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        console.error("Autosave DB error:", dbResult?.error || dbResult);
        toast({
          title: "Erreur d’enregistrement",
          description: String(dbResult?.error || "Impossible de sauvegarder."),
          status: "error",
          duration: 2500,
          isClosable: true,
          position: "top-right",
        });
      } else {
        lastSavedJSONRef.current = jsonNow;
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    } catch (e) {
      console.error("Autosave network error:", e);
      toast({
        title: "Erreur réseau",
        description: "Impossible de joindre le service de sauvegarde.",
        status: "error",
        duration: 2500,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setAutoSaving(false);
    }
  };

  useEffect(() => {
    if (!userId || !posteSourceId || prefillLoading || isPristine) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(saveDraft, 900);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, userId, posteSourceId, prefillLoading, isPristine]);

  // ---------- submit ----------
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!posteSourceId || !userId) {
      toast({
        title: "Erreur",
        description: "Champs obligatoires manquants (posteSourceId ou userId).",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }
    if (!validateData(rows)) {
      toast({
        title: "Validation échouée",
        description: "Veuillez remplir tous les champs requis.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }
    if (!refs) {
      toast({
        title: "Références non chargées",
        description: "emission_factors / PRP non chargés. Réessayez.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      return;
    }

    setSubmitting(true);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 1,
      source_code: "1A1",
      submission_id: bilanId ?? null,
      data: { rows: makeSanitizedRows(rows) },
      results: computeResults(rows, refs),
    };

    try {
      const dbResponse = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        toast({
          title: "Erreur de sauvegarde",
          description: String(dbResult?.error || "Impossible de sauvegarder."),
          status: "error",
          duration: 3500,
          isClosable: true,
          position: "top-right",
        });
      } else {
        setGesResults(payload.results);
        lastSavedJSONRef.current = JSON.stringify(rows);
        toast({
          title: "Succès!",
          description: "Données 1A1 calculées et sauvegardées avec succès.",
          status: "success",
          duration: 3500,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch {
      toast({
        title: "Erreur inattendue",
        description: "Erreur lors de la sauvegarde en base.",
        status: "error",
        duration: 3500,
        isClosable: true,
        position: "top-right",
      });
    }

    setSubmitting(false);
  };

  // --- Row helpers ---
  const addRow = () =>
    setRows((prev) => [...prev, {
      equipment: "", description: "", site: "", product: "",
      usageAndFuel: "", unit: "", entries: [emptyEntry()],
    }]);

  const duplicateRow = (idx: number) =>
    setRows((prev) => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, { ...prev[idx], entries: prev[idx].entries.map(e => ({ ...e })) });
      return copy;
    });

  const updateRowField = (idx: number, key: keyof Omit<Source1ARow, "entries">, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      (copy[idx] as any)[key] = value;
      return copy;
    });
  };

  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const onFuelChange = (idx: number, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], usageAndFuel: value };
      const unit = parseUnitFromFuel(value);
      if (unit) {
        copy[idx].unit = unit;
        copy[idx].entries = copy[idx].entries.map(e => ({ ...e, unit }));
      }
      return copy;
    });
  };

  // --- Entry helpers ---
  const addEntry = (rowIdx: number, afterIdx?: number) =>
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[rowIdx] };
      const newEntry = emptyEntry(row.unit);
      const insertAt = afterIdx != null ? afterIdx + 1 : row.entries.length;
      row.entries = [
        ...row.entries.slice(0, insertAt),
        newEntry,
        ...row.entries.slice(insertAt),
      ];
      copy[rowIdx] = row;
      return copy;
    });

  const updateEntry = (rowIdx: number, entryIdx: number, key: keyof Source1AEntry, value: string) =>
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[rowIdx] };
      row.entries = [...row.entries];
      row.entries[entryIdx] = { ...row.entries[entryIdx], [key]: value };
      copy[rowIdx] = row;
      return copy;
    });

  const removeEntry = (rowIdx: number, entryIdx: number) =>
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[rowIdx] };
      if (row.entries.length <= 1) return prev;
      row.entries = row.entries.filter((_, i) => i !== entryIdx);
      copy[rowIdx] = row;
      return copy;
    });

  /* Layout B design tokens */
  const INK    = '#1F3D2E';
  const INK2   = '#2C4A3A';
  const MUTED  = '#6E7E72';
  const MUTED2 = '#93A096';
  const BORDER = '#E5E7DF';
  const BORD2  = '#D9DCD2';
  const GREEN50 = '#EAF1EC';
  const RED    = '#C73838';
  const LB_SANS  = "'Manrope', system-ui, sans-serif";
  const LB_SERIF = "'Source Serif 4', Georgia, serif";

  if (loading || prefillLoading) {
    return (
      <Flex minH="200px" align="center" justify="center" direction="column" gap={3}>
        <Spinner color={INK} size="xl" thickness="3px" />
        <Text color={MUTED} fontFamily={LB_SANS} fontSize="sm">Chargement…</Text>
      </Flex>
    );
  }

  return (
    <Box>
      {/* Autosave indicator */}
      {(autoSaving || justSaved) && (
        <Flex justify="flex-end" mb={3} gap={2} align="center">
          {autoSaving && (
            <HStack spacing={1}>
              <Spinner size="xs" color={INK} />
              <Text fontFamily={LB_SANS} fontSize="12px" color={MUTED}>Enregistrement…</Text>
            </HStack>
          )}
          {!autoSaving && justSaved && (
            <HStack spacing={1}>
              <Icon as={CheckCircleIcon} color="green.500" boxSize={3} />
              <Text fontFamily={LB_SANS} fontSize="12px" color="green.600">Enregistré</Text>
            </HStack>
          )}
        </Flex>
      )}

      {/* Row blocks */}
      {rows.map((row, idx) => {
        const totalQty = (row.entries || []).reduce((sum, e) => sum + toNum(e.qty, 0), 0);
        return (
          <Box
            key={idx}
            pt={idx > 0 ? '18px' : 0}
            mt={idx > 0 ? '18px' : 0}
            borderTop={idx > 0 ? '1px solid' : 'none'}
            borderColor={BORDER}
          >
            {/* -- Row head: num | name | desc | site | produit | usage -- */}
            <Grid
              templateColumns="56px minmax(0,1.4fr) repeat(4,minmax(0,1fr))"
              gap="14px"
              alignItems="end"
            >
              {/* Number badge */}
              <Flex align="flex-end">
                <Box
                  w="40px" h="40px"
                  border="1px solid" borderColor={BORDER}
                  rounded="lg"
                  display="flex" alignItems="center" justifyContent="center"
                  fontWeight={600} color={INK} fontFamily={LB_SANS} fontSize="14px"
                >
                  {idx + 1}
                </Box>
              </Flex>

              {/* Name field */}
              <Box display="flex" flexDirection="column" minW={0}>
                <Text fontFamily={LB_SERIF} fontStyle="italic" fontWeight={600} color={INK2} fontSize="13px" mb="2px" noOfLines={1}>
                  {row.equipment || 'Nom de l\'équipement'}
                </Text>
                <Text color={MUTED2} fontSize="11px" mb="6px">Remplissez les champs requis</Text>
                <LBInput value={row.equipment} onChange={(v) => updateRowField(idx, 'equipment', v)} placeholder="Chaudière, génératrice…" INK={INK} BORDER={BORDER} MUTED2={MUTED2} LB_SANS={LB_SANS} />
              </Box>

              {/* Description */}
              <LBField label="Description" MUTED={MUTED} LB_SANS={LB_SANS}>
                <LBInput value={row.description} onChange={(v) => updateRowField(idx, 'description', v)} placeholder="" INK={INK} BORDER={BORDER} MUTED2={MUTED2} LB_SANS={LB_SANS} />
              </LBField>

              {/* Site */}
              <LBField label="Site" MUTED={MUTED} LB_SANS={LB_SANS}>
                <LBSelect value={row.site} onChange={(v) => updateRowField(idx, 'site', v)} placeholder="Sélectionner…" INK={INK} BORDER={BORDER} LB_SANS={LB_SANS}>
                  {(siteOptions.length ? siteOptions : [row.site].filter(Boolean)).map((s) => <option key={s} value={s}>{s}</option>)}
                </LBSelect>
              </LBField>

              {/* Produit / Service */}
              <LBField label="Produit / Service" MUTED={MUTED} LB_SANS={LB_SANS}>
                <LBSelect value={row.product} onChange={(v) => updateRowField(idx, 'product', v)} placeholder="Sélectionner…" INK={INK} BORDER={BORDER} LB_SANS={LB_SANS}>
                  {(productOptions.length ? productOptions : [row.product].filter(Boolean)).map((p) => <option key={p} value={p}>{p}</option>)}
                </LBSelect>
              </LBField>

              {/* Usage / Carburant */}
              <LBField label="Usage / Carburant" MUTED={MUTED} LB_SANS={LB_SANS}>
                <LBSelect value={row.usageAndFuel} onChange={(v) => onFuelChange(idx, v)} placeholder="(Sélectionner)" INK={INK} BORDER={BORDER} LB_SANS={LB_SANS}>
                  {FUEL_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </LBSelect>
              </LBField>
            </Grid>

            {/* -- Row head 2: Quantité total | Unité | actions -- */}
            <Grid templateColumns="56px 160px 80px 1fr" gap="14px" alignItems="end" mt="14px">
              <div />

              {/* Quantité total — readonly */}
              <Box display="flex" flexDirection="column" minW={0}>
                <Text fontFamily={LB_SANS} fontSize="11px" color={MUTED} mb="6px" fontWeight={500}>Quantité total</Text>
                <Input
                  value={totalQty > 0 ? totalQty.toLocaleString('fr-CA', { maximumFractionDigits: 2 }) : '—'}
                  isReadOnly
                  tabIndex={-1}
                  bg={GREEN50}
                  border="none"
                  fontWeight={700}
                  color={INK}
                  cursor="not-allowed"
                  h="40px"
                  rounded="md"
                  px={3}
                  fontFamily={LB_SANS}
                  fontSize="14px"
                  _focus={{ boxShadow: 'none' }}
                />
                <HStack spacing="4px" mt="4px">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={MUTED} strokeWidth="1.4">
                    <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
                    <path d="M4 5.5V4a2 2 0 014 0v1.5" />
                  </svg>
                  <Text fontFamily={LB_SANS} fontSize="10px" color={MUTED}>Calcul automatique</Text>
                </HStack>
              </Box>

              {/* Unité — bare select */}
              <Box display="flex" flexDirection="column" minW={0}>
                <Text fontFamily={LB_SANS} fontSize="11px" color={MUTED} mb="6px" fontWeight={500}>Unité</Text>
                <Select
                  value={row.unit}
                  onChange={(e) => updateRowField(idx, 'unit', e.target.value)}
                  border="none"
                  bg="transparent"
                  fontWeight={600}
                  color={INK}
                  fontFamily={LB_SANS}
                  fontSize="14px"
                  h="40px"
                  pl="4px"
                  _focus={{ boxShadow: 'none', borderColor: 'transparent' }}
                >
                  {UNIT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </Select>
              </Box>

              {/* Copy + Delete */}
              <Flex justify="flex-end" align="flex-end" gap={1}>
                <LBIconBtn ariaLabel="Dupliquer" onClick={() => duplicateRow(idx)} RED={RED} MUTED={MUTED}>
                  <Icon as={Copy} boxSize={4} />
                </LBIconBtn>
                <LBIconBtn ariaLabel="Supprimer" onClick={() => removeRow(idx)} RED={RED} MUTED={MUTED} danger>
                  <Icon as={Trash2} boxSize={4} />
                </LBIconBtn>
              </Flex>
            </Grid>

            {/* -- Entry sub-rows (dashed separator) -- */}
            {(row.entries || []).map((entry, eIdx) => (
              <Grid
                key={eIdx}
                templateColumns="56px repeat(3,minmax(0,1fr)) 80px minmax(0,1.2fr) 150px 32px"
                gap="10px"
                alignItems="end"
                mt="16px"
                pt="14px"
                borderTop="1px dashed"
                borderColor={BORDER}
              >
                <div />

                {/* Date */}
                <Box display="flex" flexDirection="column" minW={0}>
                  {eIdx === 0 && <Text fontFamily={LB_SANS} fontSize="11px" color={MUTED} mb="6px" fontWeight={500}>Date</Text>}
                  <LBInput type="date" value={entry.date} onChange={(v) => updateEntry(idx, eIdx, 'date', v)} INK={INK} BORDER={BORDER} MUTED2={MUTED2} LB_SANS={LB_SANS} />
                </Box>

                {/* Quantité */}
                <Box display="flex" flexDirection="column" minW={0}>
                  {eIdx === 0 && <Text fontFamily={LB_SANS} fontSize="11px" color={MUTED} mb="6px" fontWeight={500}>Quantité</Text>}
                  <LBInput type="number" value={entry.qty} onChange={(v) => updateEntry(idx, eIdx, 'qty', v)} placeholder="0" INK={INK} BORDER={BORDER} MUTED2={MUTED2} LB_SANS={LB_SANS} />
                </Box>

                <div />

                {/* Unité — bare select */}
                <Box display="flex" flexDirection="column" minW={0}>
                  {eIdx === 0 && <Text fontFamily={LB_SANS} fontSize="11px" color={MUTED} mb="6px" fontWeight={500}>Unité</Text>}
                  <Select
                    value={entry.unit || row.unit}
                    onChange={(e) => updateEntry(idx, eIdx, 'unit', e.target.value)}
                    border="none"
                    bg="transparent"
                    fontWeight={600}
                    color={INK}
                    fontFamily={LB_SANS}
                    fontSize="14px"
                    h="40px"
                    pl="4px"
                    _focus={{ boxShadow: 'none', borderColor: 'transparent' }}
                  >
                    {UNIT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </Select>
                </Box>

                {/* Référence */}
                <Box display="flex" flexDirection="column" minW={0}>
                  {eIdx === 0 && <Text fontFamily={LB_SANS} fontSize="11px" color={MUTED} mb="6px" fontWeight={500}>Référence</Text>}
                  <ReferenceSelect userId={userId ?? ''} value={entry.reference} onChange={(v) => updateEntry(idx, eIdx, 'reference', v)} />
                </Box>

                {/* Add line button */}
                <Button
                  variant="outline"
                  borderColor={BORD2}
                  color={INK}
                  rounded="full"
                  px={3}
                  fontFamily={LB_SANS}
                  fontWeight={600}
                  fontSize="12px"
                  h="40px"
                  _hover={{ borderColor: INK }}
                  onClick={() => addEntry(idx, eIdx)}
                  leftIcon={<Box as="span" border="1.5px solid" borderColor="currentColor" borderRadius="full" w="14px" h="14px" display="inline-flex" alignItems="center" justifyContent="center" fontSize="13px" lineHeight={1}>+</Box>}
                >
                  Ajouter une ligne
                </Button>

                {/* Delete entry */}
                <LBIconBtn
                  ariaLabel="Supprimer"
                  onClick={() => row.entries.length > 1 ? removeEntry(idx, eIdx) : undefined}
                  RED={RED} MUTED={MUTED} danger
                >
                  <Icon as={Trash2} boxSize={4} />
                </LBIconBtn>
              </Grid>
            ))}
          </Box>
        );
      })}

      {/* Bottom actions */}
      <Flex mt={5} gap={2} align="center">
        <Button
          variant="outline"
          borderColor={BORD2}
          color={INK}
          rounded="full"
          h="44px"
          px={5}
          fontFamily={LB_SANS}
          fontWeight={600}
          fontSize="13px"
          _hover={{ borderColor: INK }}
          onClick={addRow}
          leftIcon={<Box as="span" border="1.5px solid" borderColor="currentColor" borderRadius="full" w="16px" h="16px" display="inline-flex" alignItems="center" justifyContent="center" fontSize="14px" lineHeight={1}>+</Box>}
        >
          Ajouter une ligne
        </Button>
        <Button
          bg={INK}
          color="white"
          rounded="full"
          h="44px"
          px={5}
          fontFamily={LB_SANS}
          fontWeight={600}
          fontSize="13px"
          _hover={{ bg: '#2C5A40' }}
          isLoading={submitting}
          onClick={handleSubmit}
        >
          Soumettre
        </Button>
      </Flex>
    </Box>
  );
}

/* ===== Layout B UI helpers ===== */

function LBInput({ value, onChange, placeholder, type, INK, BORDER, MUTED2, LB_SANS }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  INK: string; BORDER: string; MUTED2: string; LB_SANS: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      h="40px"
      rounded="md"
      bg="white"
      border="1px solid"
      borderColor={BORDER}
      fontFamily={LB_SANS}
      fontSize="14px"
      color={INK}
      _placeholder={{ color: MUTED2 }}
      _focus={{ borderColor: '#2C5A40', boxShadow: '0 0 0 3px rgba(44,90,64,.12)' }}
    />
  );
}

function LBSelect({ value, onChange, placeholder, children, INK, BORDER, LB_SANS }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  children?: React.ReactNode; INK: string; BORDER: string; LB_SANS: string;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      h="40px"
      rounded="md"
      bg="white"
      border="1px solid"
      borderColor={BORDER}
      fontFamily={LB_SANS}
      fontSize="14px"
      color={INK}
      _focus={{ borderColor: '#2C5A40', boxShadow: '0 0 0 3px rgba(44,90,64,.12)' }}
    >
      {children}
    </Select>
  );
}

function LBField({ label, children, MUTED, LB_SANS }: {
  label?: string; children: React.ReactNode; MUTED: string; LB_SANS: string;
}) {
  return (
    <Box display="flex" flexDirection="column" minW={0}>
      {label && <Text fontFamily={LB_SANS} fontSize="11px" color={MUTED} mb="6px" fontWeight={500}>{label}</Text>}
      {children}
    </Box>
  );
}

function LBIconBtn({ ariaLabel, onClick, children, danger, RED, MUTED }: {
  ariaLabel: string; onClick?: () => void; children: React.ReactNode;
  danger?: boolean; RED: string; MUTED: string;
}) {
  return (
    <Box
      as="button"
      aria-label={ariaLabel}
      w="32px" h="32px"
      display="inline-flex" alignItems="center" justifyContent="center"
      border="none" bg="transparent" cursor="pointer"
      rounded="md"
      color={danger ? RED : MUTED}
      _hover={{ bg: danger ? 'rgba(199,56,56,.08)' : 'rgba(110,126,114,.10)' }}
      onClick={onClick}
    >
      {children}
    </Box>
  );
}

