import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Spinner,
  Stack,
  Button,
  Input,
  Select,
  VStack,
  HStack,
  Grid,
  GridItem,
  Icon,
  Badge,
  Flex,
  useToast,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { Plus, Trash2, Copy } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
import { CheckCircleIcon } from "@chakra-ui/icons";
import { FiZap, FiFileText } from "react-icons/fi";

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

// Animations (same vibe as your 6A1)
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

export function Source1AForm({
  rows = [],
  setRows,
  posteSourceId,
  userId: propUserId,
  gesResults = [],
  setGesResults,
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

  // Prefill hydrate (only if pristine)
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (!isPristine) return;

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
    if (!userId || !posteSourceId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(saveDraft, 900);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, userId, posteSourceId]);

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

  const resultsSummary = useMemo(() => {
    if (!Array.isArray(gesResults) || gesResults.length === 0) return null;
    const allZero = gesResults.every(r =>
      toNum((r as any)["total_ges_gco2e"]) === 0 &&
      toNum((r as any)["total_energie_kwh"]) === 0
    );
    if (allZero) return null;
    return {
      co2:    sumField(gesResults, "total_co2_gco2e"),
      ch4:    sumField(gesResults, "total_ges_ch4_gco2e"),
      n2o:    sumField(gesResults, "total_ges_n2o_gco2e"),
      totalG: sumField(gesResults, "total_ges_gco2e"),
      totalT: sumField(gesResults, "total_ges_tco2e", true),
      kwh:    sumField(gesResults, "total_energie_kwh"),
    };
  }, [gesResults]);

  if (loading || prefillLoading) {
    return (
      <Flex
        minH="400px"
        align="center"
        justify="center"
        bg={FIGMA.bg}
        rounded="2xl"
        direction="column"
        gap={4}
      >
        <Spinner color={FIGMA.green} size="xl" thickness="4px" speed="0.8s" />
        <Text color={FIGMA.muted} fontFamily="Montserrat" fontSize="sm">
          Chargement des données...
        </Text>
      </Flex>
    );
  }

  return (
    <Box bg={FIGMA.bg} p={{ base: 4, md: 6 }} rounded="2xl" animation={`${fadeInUp} 0.6s ease-out`}>
      {/* Header */}
      <Box
        bg="white"
        p={6}
        rounded="xl"
        mb={6}
        boxShadow={FIGMA.cardShadow}
        position="relative"
        overflow="hidden"
      >
        {/* Decorative gradient blob */}
        <Box
          position="absolute"
          top={-10}
          right={-10}
          w="200px"
          h="200px"
          bg={FIGMA.greenSoft}
          borderRadius="full"
          filter="blur(60px)"
          opacity={0.5}
          pointerEvents="none"
        />

        <Flex justify="space-between" align="center" position="relative" flexWrap="wrap" gap={4}>
          <VStack align="flex-start" spacing={2}>
            <HStack spacing={2}>
              <Box w="4px" h="24px" bg={FIGMA.green} borderRadius="full" />
              <Badge
                colorScheme="green"
                fontSize="xs"
                px={3}
                py={1}
                rounded="full"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Catégorie 1 – Émissions directes
              </Badge>
            </HStack>

            <Heading
              as="h2"
              fontFamily="Inter"
              fontWeight={700}
              fontSize={{ base: "xl", md: "2xl" }}
              color={FIGMA.text}
            >
              Sous-catégorie 1.1 – Combustion fixe
            </Heading>

            <Text fontSize="sm" color={FIGMA.muted} maxW="600px" lineHeight="1.6">
              Cette sous-catégorie comptabilise les émissions provenant de la combustion dans des équipements
              dits « fixes » comme un système de chauffage, une génératrice, une station de soudure, des fours, etc.
            </Text>

            {prefillError && (
              <Text fontSize="sm" color="red.500">
                Erreur de préchargement : {String(prefillError)}
              </Text>
            )}
          </VStack>

          <HStack spacing={3} flexWrap="wrap">
            {/* Autosave status */}
            <Box
              minW="160px"
              bg={autoSaving || justSaved ? "white" : "transparent"}
              px={3}
              py={2}
              rounded="lg"
              transition="all 0.3s"
            >
              {autoSaving && (
                <HStack color={FIGMA.muted} animation={`${pulse} 1.5s ease-in-out infinite`}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistrement…
                  </Text>
                </HStack>
              )}
              {!autoSaving && justSaved && (
                <HStack color="green.600" animation={`${slideIn} 0.3s ease-out`}>
                  <Icon as={CheckCircleIcon} />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistré
                  </Text>
                </HStack>
              )}
              {!autoSaving && !justSaved && (
                <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500} color={FIGMA.muted}>
                  Saisie automatique activée
                </Text>
              )}
            </Box>
          </HStack>
        </Flex>
      </Box>

      {/* Results summary — shown at top for easy access (fix #27) */}
      {!!resultsSummary && (
        <Box
          bg="white"
          rounded="xl"
          px={6}
          py={4}
          boxShadow={FIGMA.cardShadow}
          animation={`${fadeInUp} 0.5s ease-out`}
        >
          <HStack mb={3} spacing={2}>
            <Icon as={FiFileText} color={FIGMA.green} boxSize={4} />
            <Text fontFamily="Inter" fontWeight={700} color={FIGMA.text} fontSize="md">
              Calculs et résultats (récapitulatif)
            </Text>
          </HStack>
          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }} gap={3}>
            <ResultCard FIGMA={FIGMA} label="CO₂" unit="gCO₂e" value={resultsSummary.co2} isGrams />
            <ResultCard FIGMA={FIGMA} label="CH₄" unit="gCO₂e" value={resultsSummary.ch4} isGrams />
            <ResultCard FIGMA={FIGMA} label="N₂O" unit="gCO₂e" value={resultsSummary.n2o} isGrams />
            <ResultCard FIGMA={FIGMA} label="Total GES" unit="gCO₂e" value={resultsSummary.totalG} isGrams />
            <ResultCard FIGMA={FIGMA} label="Total GES" unit="tCO₂e" value={resultsSummary.totalT} isGrams={false} />
            <ResultCard FIGMA={FIGMA} label="Énergie" unit="kWh" value={resultsSummary.kwh} isGrams={false} />
          </Grid>
        </Box>
      )}

      {/* Methodology label bar */}
      <Box display={{ base: "none", lg: "block" }} mb={1}>
        <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" fontWeight={600} px={2}>
          Sous-catégorie 1.1 – Combustion fixe &nbsp;·&nbsp; Méthodologie 1.1A1 – Calcul des émissions de la combustion fixe à partir des quantités de carburant
        </Text>
      </Box>


      {/* Equipment cards */}
      <Stack spacing={4}>
        {rows.map((row, idx) => {
          const totalQty = (row.entries || []).reduce((sum, e) => sum + toNum(e.qty, 0), 0);
          return (
            <Box
              key={idx}
              bg="white"
              rounded="xl"
              border="1.5px solid"
              borderColor={FIGMA.border}
              boxShadow={FIGMA.cardShadow}
              overflow="hidden"
              transition="all 0.3s"
              _hover={{ borderColor: FIGMA.green }}
              animation={`${fadeInUp} 0.4s ease-out ${idx * 0.04}s both`}
            >
              {/* ── Card header ── */}
              <Box bg={FIGMA.bg} px={4} py={3} borderBottom="1px solid" borderColor={FIGMA.border}>
                <Flex align="flex-start" gap={3} flexWrap="wrap">
                  {/* Row number + Equipment name */}
                  <HStack spacing={3} flex="0 0 auto" align="flex-start">
                    <Box
                      w="36px" h="36px" flexShrink={0}
                      rounded="lg" bg="white"
                      boxShadow={FIGMA.inputShadow}
                      display="flex" alignItems="center" justifyContent="center"
                      mt="18px"
                    >
                      <Text fontFamily="Montserrat" fontSize="md" fontWeight={700} color={FIGMA.green}>
                        {idx + 1}
                      </Text>
                    </Box>
                    <Box minW="140px">
                      <Text fontFamily="Montserrat" fontSize="11px" color={FIGMA.green} fontWeight="700" mb={0.5}>
                        {row.equipment || "Équipement"}
                      </Text>
                      <Text fontFamily="Montserrat" fontSize="10px" color={FIGMA.muted}>
                        Remplissez les champs requis
                      </Text>
                      <Box mt={1}>
                        <FigmaInput
                          value={row.equipment}
                          onChange={(v) => updateRowField(idx, "equipment", v)}
                          placeholder="Chaudière, génératrice…"
                          FIGMA={FIGMA}
                        />
                      </Box>
                    </Box>
                  </HStack>

                  {/* Description */}
                  <LabeledField label="Description" muted={FIGMA.muted}>
                    <FigmaInput
                      value={row.description}
                      onChange={(v) => updateRowField(idx, "description", v)}
                      placeholder="Facultatif"
                      FIGMA={FIGMA}
                    />
                  </LabeledField>

                  {/* Site */}
                  <LabeledField label="Site" muted={FIGMA.muted}>
                    <FigmaSelect value={row.site} onChange={(v) => updateRowField(idx, "site", v)} FIGMA={FIGMA} placeholder="Sélectionner…">
                      {(siteOptions.length ? siteOptions : [row.site].filter(Boolean)).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </FigmaSelect>
                  </LabeledField>

                  {/* Produit / Service */}
                  <LabeledField label="Produit / Service" muted={FIGMA.muted}>
                    <FigmaSelect value={row.product} onChange={(v) => updateRowField(idx, "product", v)} FIGMA={FIGMA} placeholder="Sélectionner…">
                      {(productOptions.length ? productOptions : [row.product].filter(Boolean)).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </FigmaSelect>
                  </LabeledField>

                  {/* Usage / Carburant */}
                  <LabeledField label="Usage / Carburant" muted={FIGMA.muted}>
                    <FigmaSelect value={row.usageAndFuel} onChange={(v) => onFuelChange(idx, v)} FIGMA={FIGMA} placeholder="(Sélectionner)">
                      {FUEL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </FigmaSelect>
                  </LabeledField>

                  {/* Quantité totale (computed, readonly) */}
                  <LabeledField label="Quantité total" muted={FIGMA.muted}>
                    <Box
                      h="42px" minW="90px" px={3}
                      rounded="lg" bg="white"
                      border="1.5px solid" borderColor={FIGMA.green}
                      display="flex" alignItems="center" justifyContent="center"
                      boxShadow={FIGMA.inputShadow}
                    >
                      <Text fontFamily="Montserrat" fontSize="14px" fontWeight={700} color={FIGMA.green}>
                        {totalQty > 0
                          ? totalQty.toLocaleString("fr-CA", { maximumFractionDigits: 2 })
                          : "—"}
                      </Text>
                    </Box>
                  </LabeledField>

                  {/* Unité */}
                  <LabeledField label="Unité" muted={FIGMA.muted}>
                    <FigmaSelect value={row.unit} onChange={(v) => updateRowField(idx, "unit", v)} FIGMA={FIGMA} placeholder="Unité">
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </FigmaSelect>
                  </LabeledField>

                  {/* Actions */}
                  <HStack spacing={2} alignSelf="flex-end" pb={1} ml="auto">
                    <MiniIconBtn icon={Copy} ariaLabel="Dupliquer" onClick={() => duplicateRow(idx)} FIGMA={FIGMA} />
                    <MiniIconBtn icon={Trash2} ariaLabel="Supprimer" onClick={() => removeRow(idx)} FIGMA={FIGMA} danger />
                  </HStack>
                </Flex>
              </Box>

              {/* ── Entries sub-table ── */}
              <Box px={4} py={3}>
                {/* Column labels */}
                <Grid templateColumns="1fr 1fr 90px 1fr 160px" columnGap={3} mb={2} px={1}>
                  {["Date", "Quantité", "Unité", "Référence", ""].map((h) => (
                    <Text key={h} fontSize="11px" color={FIGMA.muted} fontWeight="600" fontFamily="Montserrat">{h}</Text>
                  ))}
                </Grid>

                <Stack spacing={2}>
                  {(row.entries || []).map((entry, eIdx) => (
                    <Grid key={eIdx} templateColumns="1fr 1fr 90px 1fr 160px" columnGap={3} alignItems="center">
                      <FigmaInput type="date" value={entry.date} onChange={(v) => updateEntry(idx, eIdx, "date", v)} FIGMA={FIGMA} />
                      <FigmaInput type="number" value={entry.qty} onChange={(v) => updateEntry(idx, eIdx, "qty", v)} placeholder="0" FIGMA={FIGMA} textAlign="center" />
                      <FigmaSelect value={entry.unit || row.unit} onChange={(v) => updateEntry(idx, eIdx, "unit", v)} FIGMA={FIGMA} placeholder="Unité">
                        {UNIT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </FigmaSelect>
                      <FigmaSelect value={entry.reference} onChange={(v) => updateEntry(idx, eIdx, "reference", v)} FIGMA={FIGMA} placeholder={referenceOptions.length ? "Sélectionner…" : "Aucune réf."}>
                        {referenceOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                      </FigmaSelect>
                      <HStack spacing={2}>
                        <Button
                          size="xs"
                          variant="outline"
                          borderColor={FIGMA.green}
                          color={FIGMA.green}
                          rounded="full"
                          px={3}
                          fontFamily="Inter"
                          fontWeight={600}
                          fontSize="11px"
                          _hover={{ bg: FIGMA.greenSoft }}
                          onClick={() => addEntry(idx, eIdx)}
                        >
                          + Ajouter une ligne
                        </Button>
                        {row.entries.length > 1 && (
                          <MiniIconBtn icon={Trash2} ariaLabel="Supprimer cette ligne" onClick={() => removeEntry(idx, eIdx)} FIGMA={FIGMA} danger />
                        )}
                      </HStack>
                    </Grid>
                  ))}
                </Stack>
              </Box>
            </Box>
          );
        })}
      </Stack>

      {/* Bottom actions */}
      <HStack mt={6} spacing={4} flexWrap="wrap">
        <Button
          leftIcon={<Icon as={Plus} boxSize={4} />}
          variant="outline"
          borderColor={FIGMA.green}
          color={FIGMA.green}
          rounded="full"
          h="44px"
          px={6}
          onClick={addRow}
          fontFamily="Inter"
          fontWeight={600}
          _hover={{
            bg: FIGMA.greenSoft,
            borderColor: FIGMA.green,
          }}
          transition="all 0.2s"
        >
          Ajouter une ligne
        </Button>

        <Button
          bg={FIGMA.green}
          color="white"
          rounded="full"
          h="44px"
          px={8}
          _hover={{
            bg: FIGMA.greenLight,
            transform: "translateY(-2px)",
            boxShadow: FIGMA.hoverShadow,
          }}
          _active={{ transform: "translateY(0)" }}
          boxShadow={FIGMA.buttonShadow}
          onClick={handleSubmit}
          fontFamily="Inter"
          fontWeight={600}
          isLoading={submitting}
          loadingText="Sauvegarde…"
          transition="all 0.2s"
        >
          Soumettre
        </Button>
      </HStack>

    </Box>
  );
}

/* ===== UI helpers (styled like 6A1) ===== */

function FigmaInput({
  value,
  onChange,
  placeholder,
  FIGMA,
  type,
  textAlign,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  FIGMA: any;
  type?: string;
  textAlign?: "left" | "center" | "right";
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      h="42px"
      rounded="lg"
      bg="white"
      borderColor={FIGMA.border}
      boxShadow={FIGMA.inputShadow}
      fontFamily="Montserrat"
      fontSize="14px"
      color={FIGMA.text}
      textAlign={textAlign}
      _placeholder={{ color: FIGMA.muted }}
      _focus={{
        borderColor: FIGMA.green,
        boxShadow: `0 0 0 1px ${FIGMA.green}`,
      }}
      transition="all 0.2s"
    />
  );
}

function FigmaSelect({
  value,
  onChange,
  placeholder,
  FIGMA,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  FIGMA: any;
  children?: React.ReactNode;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      h="42px"
      rounded="lg"
      bg="white"
      borderColor={FIGMA.border}
      boxShadow={FIGMA.inputShadow}
      fontFamily="Montserrat"
      fontSize="14px"
      color={FIGMA.text}
      _focus={{
        borderColor: FIGMA.green,
        boxShadow: `0 0 0 1px ${FIGMA.green}`,
      }}
      transition="all 0.2s"
    >
      {children}
    </Select>
  );
}

function LabeledField({
  label,
  children,
  muted,
}: {
  label: string;
  children: any;
  muted: string;
}) {
  return (
    <Box>
      <Text mb={1} fontSize="12px" color={muted} fontWeight="500" fontFamily="Montserrat">
        {label}
      </Text>
      {children}
    </Box>
  );
}

function MiniIconBtn({
  icon,
  ariaLabel,
  onClick,
  FIGMA,
  danger,
}: {
  icon: any;
  ariaLabel: string;
  onClick?: () => void;
  FIGMA: any;
  danger?: boolean;
}) {
  return (
    <Box
      as="button"
      aria-label={ariaLabel}
      p="8px"
      rounded="md"
      color={danger ? "red.500" : FIGMA.muted}
      _hover={{ bg: danger ? "red.50" : FIGMA.greenSoft, color: danger ? "red.500" : FIGMA.green }}
      border="1px solid"
      borderColor="transparent"
      onClick={onClick}
    >
      <Icon as={icon} boxSize={4} />
    </Box>
  );
}

function ResultCard({
  FIGMA,
  label,
  unit,
  value,
  isGrams,
}: {
  FIGMA: any;
  label: string;
  unit: string;
  value: string;
  isGrams: boolean;
}) {
  return (
    <Box
      bg={FIGMA.bg}
      p={3}
      rounded="lg"
      border="2px solid"
      borderColor={FIGMA.border}
      transition="all 0.3s"
      _hover={{ borderColor: FIGMA.green, transform: "translateY(-2px)" }}
    >
      <Text fontSize="10px" color={FIGMA.muted} fontFamily="Montserrat" mb={1} textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight={700} color={FIGMA.green} fontFamily="Inter" lineHeight="1.2">
        {value}{" "}
        <Text as="span" fontSize="11px" fontWeight={500} color={FIGMA.muted}>
          {unit}
        </Text>
      </Text>
    </Box>
  );
}

// Fix #28-31: proper decimal rules per unit type
function sumField(results: GesResult[], key: keyof GesResult, isTonnes = false): string {
  const s = results.reduce((acc, r) => acc + (toNum((r as any)[key]) || 0), 0);
  if (isTonnes) {
    // tCO₂e — always 2 decimal places
    return Number(s).toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // gCO₂e — no decimals unless very small (< 1), then 2 significant figures
  if (s === 0) return "0";
  if (Math.abs(s) < 1) {
    return Number(s).toLocaleString("fr-CA", { maximumSignificantDigits: 2 });
  }
  return Number(s).toLocaleString("fr-CA", { maximumFractionDigits: 0 });
}


// import React, { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Box,
//   Heading,
//   Text,
//   Spinner,
//   Stack,
//   Button,
//   Input,
//   Select,
//   VStack,
//   HStack,
//   Grid,
//   GridItem,
//   Icon,
//   useColorModeValue,
// } from "@chakra-ui/react";
// import { Plus, Trash2, Copy } from "lucide-react";
// import { supabase } from "../../../lib/supabaseClient";
// import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";

// export type Source1ARow = {
//   equipment: string;
//   description: string;
//   date: string;
//   site: string;
//   product: string;
//   reference: string;
//   usageAndFuel: string; // J11
//   qty: string;          // K11
//   unit: string;
// };

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// export interface Source1AFormProps {
//   rows: Source1ARow[];
//   setRows: React.Dispatch<React.SetStateAction<Source1ARow[]>>;
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string | null;
//   userId?: string | null;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// const FUEL_OPTIONS = [
//   "Génératrice - Mazout [L]",
//   "Chauffage - Bois [kg]",
//   "Chauffage - Propane [L]",
// ];
// const UNIT_OPTIONS = ["L", "kg"];

// const DEFAULT_ROWS: Source1ARow[] = [
//   {
//     equipment: "",
//     description: "",
//     date: "",
//     site: "",
//     product: "",
//     reference: "",
//     usageAndFuel: "",
//     qty: "",
//     unit: "",
//   },
// ];

// const parseUnitFromFuel = (fuelLabel: string) => {
//   const m = fuelLabel.match(/\[([^\]]+)\]\s*$/);
//   return m?.[1] ?? "";
// };

// // --- Helpers (robust numbers like 4B2) ---
// const toNum = (x: any, fallback = 0) => {
//   if (x === "" || x == null) return fallback;
//   const n =
//     typeof x === "number"
//       ? x
//       : Number(String(x).replace(",", ".").replace(/\s/g, ""));
//   return Number.isFinite(n) ? n : fallback;
// };

// // --- Refs loaded from your real DB schema ---
// type Refs = {
//   // keyed by emission_factors.label (matches usageAndFuel)
//   gco2ByLabel: Record<string, number>;
//   gch4ByLabel: Record<string, number>;
//   gn2oByLabel: Record<string, number>;
//   kwhByLabel: Record<string, number>;

//   prpCO2: number; // gaz_effet_serre CO2
//   prpCH4: number; // gaz_effet_serre CH4
//   prpN2O: number; // gaz_effet_serre N2O
// };

// export function Source1AForm({
//   rows = [],
//   setRows,
//   highlight = "#245a7c",
//   tableBg = "#f3f6ef",
//   posteSourceId,
//   userId: propUserId,
//   gesResults = [],
//   setGesResults,
// }: Source1AFormProps) {
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [saveMsg, setSaveMsg] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string | null>(propUserId ?? null);

//   const [refs, setRefs] = useState<Refs | null>(null);

//   const inputBorder = useColorModeValue("#E8ECE7", "#2f3a36");
//   const faintLine = useColorModeValue(
//     "rgba(0,0,0,0.12)",
//     "rgba(255,255,255,0.12)"
//   );
//   const headerFg = "white";

//   // === Prefill (poste 1, source 1A1) ===
//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource((userId ?? "") as string, 1, "1A1", {
//     rows: DEFAULT_ROWS,
//   });

//   const isPristine = useMemo(() => {
//     if (!rows || rows.length === 0) return true;
//     if (rows.length !== 1) return false;
//     const r = rows[0];
//     return (
//       !r.equipment &&
//       !r.description &&
//       !r.date &&
//       !r.site &&
//       !r.product &&
//       !r.reference &&
//       !r.usageAndFuel &&
//       !r.qty &&
//       !r.unit
//     );
//   }, [rows]);

//   // Dropdown options from company
//   const [siteOptions, setSiteOptions] = useState<string[]>([]);
//   const [productOptions, setProductOptions] = useState<string[]>([]);
//   const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

//   // --------------------------
//   // ✅ Load refs from DB schema you showed
//   // --------------------------
//   useEffect(() => {
//     (async () => {
//       try {
//         // 1) PRP (CO2/CH4/N2O) from gaz_effet_serre
//         const { data: gesRows, error: gesErr } = await supabase
//           .from("gaz_effet_serre")
//           .select("formule_chimique, prp_100ans");
//         if (gesErr) throw gesErr;

//         const prpMap: Record<string, number> = Object.fromEntries(
//           (gesRows ?? [])
//             .filter((r: any) => r?.formule_chimique && r?.prp_100ans != null)
//             .map((r: any) => [
//               String(r.formule_chimique).trim().toUpperCase(),
//               Number(r.prp_100ans),
//             ])
//         );

//         const prpCO2 = Number.isFinite(prpMap["CO2"]) ? prpMap["CO2"] : 1;
//         const prpCH4 = Number.isFinite(prpMap["CH4"]) ? prpMap["CH4"] : 0;
//         const prpN2O = Number.isFinite(prpMap["N2O"]) ? prpMap["N2O"] : 0;

//         // 2) Emission factors + energy factors from emission_factors
//         // Using columns from your screenshot:
//         // label, energy_kwh_per_unit, gco2_per_unit, gch4_per_unit, gn2o_per_unit
//         const { data: efRows, error: efErr } = await supabase
//           .from("emission_factors")
//           .select("label, energy_kwh_per_unit, gco2_per_unit, gch4_per_unit, gn2o_per_unit");
//         if (efErr) throw efErr;

//         const gco2ByLabel: Record<string, number> = {};
//         const gch4ByLabel: Record<string, number> = {};
//         const gn2oByLabel: Record<string, number> = {};
//         const kwhByLabel: Record<string, number> = {};

//         (efRows ?? []).forEach((r: any) => {
//           const key = String(r?.label ?? "").trim();
//           if (!key) return;
//           if (r?.gco2_per_unit != null) gco2ByLabel[key] = Number(r.gco2_per_unit);
//           if (r?.gch4_per_unit != null) gch4ByLabel[key] = Number(r.gch4_per_unit);
//           if (r?.gn2o_per_unit != null) gn2oByLabel[key] = Number(r.gn2o_per_unit);
//           if (r?.energy_kwh_per_unit != null) kwhByLabel[key] = Number(r.energy_kwh_per_unit);
//         });

//         setRefs({
//           gco2ByLabel,
//           gch4ByLabel,
//           gn2oByLabel,
//           kwhByLabel,
//           prpCO2,
//           prpCH4,
//           prpN2O,
//         });
//       } catch (e) {
//         console.error("1A1 refs load error:", e);
//         setRefs({
//           gco2ByLabel: {},
//           gch4ByLabel: {},
//           gn2oByLabel: {},
//           kwhByLabel: {},
//           prpCO2: 1,
//           prpCH4: 0,
//           prpN2O: 0,
//         });
//       }
//     })();
//   }, []);

//   // --------------------------
//   // Load latest saved poste data
//   // --------------------------
//   useEffect(() => {
//     (async () => {
//       setLoading(true);

//       let activeUserId = propUserId ?? null;
//       if (!activeUserId) {
//         const { data: auth } = await supabase.auth.getUser();
//         if (auth?.user) activeUserId = auth.user.id;
//       }
//       if (!activeUserId) {
//         setLoading(false);
//         return;
//       }
//       setUserId(activeUserId);

//       const { data, error } = await supabase
//         .from("submissions")
//         .select(
//           `
//           id,
//           postes!postes_submission_id_fkey (
//             id, poste_num, data, results
//           )
//         `
//         )
//         .eq("user_id", activeUserId)
//         .order("created_at", { ascending: false })
//         .limit(1)
//         .single();

//       if (!error && (data as any)?.postes) {
//         const poste = posteSourceId
//           ? (data as any).postes.find((p: any) => p.id === posteSourceId)
//           : (data as any).postes.find((p: any) => p.poste_num === 1);

//         if (poste) {
//           let parsed = poste.data;
//           if (typeof parsed === "string") {
//             try {
//               parsed = JSON.parse(parsed);
//             } catch {
//               parsed = {};
//             }
//           }
//           if (parsed?.rows && Array.isArray(parsed.rows)) {
//             setRows(
//               parsed.rows.map((r: any) => ({
//                 equipment: r.equipment ?? "",
//                 description: r.description ?? "",
//                 date: r.date ?? "",
//                 site: r.site ?? "",
//                 product: r.product ?? "",
//                 reference: r.reference ?? "",
//                 usageAndFuel: r.usageAndFuel ?? r.fuel ?? "",
//                 qty: String(r.qty ?? ""),
//                 unit: r.unit ?? "",
//               }))
//             );
//           } else if (!rows?.length) {
//             setRows(DEFAULT_ROWS);
//           }

//           if (Array.isArray(poste.results)) {
//             setGesResults(poste.results as GesResult[]);
//           }
//         } else if (!rows?.length) {
//           setRows(DEFAULT_ROWS);
//         }
//       } else if (!rows?.length) {
//         setRows(DEFAULT_ROWS);
//       }

//       setLoading(false);
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [posteSourceId, propUserId]);

//   // Prefill hydrate (only if pristine)
//   useEffect(() => {
//     if (loading || prefillLoading) return;
//     if (!isPristine) return;

//     if ((prefillData as any)?.rows) {
//       const dataRows = Array.isArray((prefillData as any).rows)
//         ? (prefillData as any).rows
//         : DEFAULT_ROWS;
//       setRows(dataRows.length ? dataRows : DEFAULT_ROWS);
//     } else if (!rows?.length) {
//       setRows(DEFAULT_ROWS);
//     }

//     if (prefillResults) {
//       const normalized = Array.isArray(prefillResults)
//         ? prefillResults
//         : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults, prefillLoading, loading, isPristine]);

//   // Company dropdown data
//   useEffect(() => {
//     (async () => {
//       try {
//         if (!userId) return;

//         const { data: profile, error: profErr } = await supabase
//           .from("user_profiles")
//           .select("company_id")
//           .eq("id", userId)
//           .single();
//         if (profErr || !profile?.company_id) return;

//         const { data: company, error: compErr } = await supabase
//           .from("companies")
//           .select("production_sites, products, company_references")
//           .eq("id", profile.company_id)
//           .single();
//         if (compErr) return;

//         const sites = Array.isArray(company?.production_sites)
//           ? (company.production_sites as any[])
//               .map((s) => String(s?.nom ?? ""))
//               .filter(Boolean)
//           : [];
//         const prods = Array.isArray(company?.products)
//           ? (company.products as any[])
//               .map((p) => String(p?.nom ?? ""))
//               .filter(Boolean)
//           : [];
//         const refsArr = Array.isArray(company?.company_references)
//           ? (company.company_references as any[])
//               .map((r) => String(r))
//               .filter(Boolean)
//           : [];

//         const uniq = (arr: string[]) => Array.from(new Set(arr));
//         setSiteOptions(uniq(sites));
//         setProductOptions(uniq(prods));
//         setReferenceOptions(uniq(refsArr));
//       } catch {}
//     })();
//   }, [userId]);

//   // Validation
//   const validateData = (rws: Source1ARow[]) =>
//     rws.length > 0 &&
//     rws.every(
//       (row) =>
//         row.equipment &&
//         row.site &&
//         row.product &&
//         row.usageAndFuel &&
//         row.qty !== "" &&
//         row.unit
//     );

//   // --------------------------
//   // ✅ LOCAL CALC (Excel replica)
//   // --------------------------
//   const computeResults = (rws: Source1ARow[], rf: Refs | null): GesResult[] => {
//     if (!rf) return [];

//     return (rws || []).map((row) => {
//       const label = String(row.usageAndFuel || "").trim(); // J11
//       const qty = toNum(row.qty, 0);                       // K11

//       // SI($J11=0; ; ...)
//       if (!label || qty === 0) {
//         return {
//           total_co2_gco2e: 0,
//           total_ges_ch4_gco2e: 0,
//           total_ges_n2o_gco2e: 0,
//           total_ges_gco2e: 0,
//           total_ges_tco2e: 0,
//           total_energie_kwh: 0,
//         };
//       }

//       // RECHERCHEV(J11;FÉ;8/9/10/7)
//       const gco2_per_unit = toNum(rf.gco2ByLabel[label], 0);
//       const gch4_per_unit = toNum(rf.gch4ByLabel[label], 0);
//       const gn2o_per_unit = toNum(rf.gn2oByLabel[label], 0);
//       const kwh_per_unit = toNum(rf.kwhByLabel[label], 0);

//       // PRP!J8/J9/J10
//       const prpCO2 = toNum(rf.prpCO2, 1);
//       const prpCH4 = toNum(rf.prpCH4, 0);
//       const prpN2O = toNum(rf.prpN2O, 0);

//       // BF11 = gCO2/unit * qty * PRP(CO2)
//       const co2_gco2e = gco2_per_unit * qty * prpCO2;

//       // BG11 = gCH4/unit * qty * PRP(CH4)
//       const ch4_gco2e = gch4_per_unit * qty * prpCH4;

//       // BH11 = gN2O/unit * qty * PRP(N2O)
//       const n2o_gco2e = gn2o_per_unit * qty * prpN2O;

//       // BI11 = SOMME(BF11:BH11)
//       const total_gco2e = co2_gco2e + ch4_gco2e + n2o_gco2e;

//       // BJ11 = BI11 / 10^6
//       const total_tco2e = total_gco2e / 1e6;

//       // Energy = RECHERCHEV(J11;FÉ;7) * qty
//       const energie_kwh = kwh_per_unit * qty;

//       return {
//         total_co2_gco2e: co2_gco2e,
//         total_ges_ch4_gco2e: ch4_gco2e,
//         total_ges_n2o_gco2e: n2o_gco2e,
//         total_ges_gco2e: total_gco2e,
//         total_ges_tco2e: total_tco2e,
//         total_energie_kwh: energie_kwh,
//       };
//     });
//   };

//   // Recompute whenever rows/refs change (like 4B2)
//   useEffect(() => {
//     const res = computeResults(rows, refs);
//     setGesResults(res);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [rows, refs]);

//   // ---------- autosave ----------
//   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const lastSavedJSONRef = useRef<string>("");

//   const makeSanitizedRows = (rws: Source1ARow[]) =>
//     rws.map((row) => ({
//       equipment: row.equipment,
//       description: row.description,
//       date: row.date,
//       site: row.site,
//       product: row.product,
//       reference: row.reference,
//       usageAndFuel: row.usageAndFuel,
//       qty: toNum(row.qty, 0),
//       unit: row.unit,
//     }));

//   const saveDraft = async () => {
//     if (!userId || !posteSourceId) return;

//     const jsonNow = JSON.stringify(rows);
//     if (jsonNow === lastSavedJSONRef.current) return;

//     setSaving(true);
//     setSaveMsg("Enregistrement…");

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       poste_num: 1,
//       source_code: "1A1",
//       data: { rows: makeSanitizedRows(rows) },
//       results: computeResults(rows, refs),
//     };

//     try {
//       const dbResponse = await fetch("/api/4submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         setSaveMsg("Erreur d’enregistrement");
//         console.error("Autosave DB error:", dbResult?.error || dbResult);
//       } else {
//         lastSavedJSONRef.current = jsonNow;
//         setSaveMsg("Enregistré");
//       }
//     } catch (e) {
//       console.error("Autosave network error:", e);
//       setSaveMsg("Erreur réseau");
//     } finally {
//       setSaving(false);
//       setTimeout(() => setSaveMsg(null), 1500);
//     }
//   };

//   useEffect(() => {
//     if (!userId || !posteSourceId) return;
//     if (debounceRef.current) clearTimeout(debounceRef.current);
//     debounceRef.current = setTimeout(saveDraft, 1000);
//     return () => {
//       if (debounceRef.current) clearTimeout(debounceRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [rows, userId, posteSourceId]);

//   // ---------- submit ----------
//   const [submitting, setSubmitting] = useState(false);

//   const handleSubmit = async () => {
//     if (!posteSourceId || !userId) {
//       alert("Champs obligatoires manquants (posteSourceId ou userId)");
//       return;
//     }
//     if (!validateData(rows)) {
//       alert("Veuillez remplir tous les champs requis.");
//       return;
//     }
//     if (!refs) {
//       alert("Références (emission_factors / PRP) non chargées. Réessayez.");
//       return;
//     }

//     setSubmitting(true);

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       poste_num: 1,
//       source_code: "1A1",
//       data: { rows: makeSanitizedRows(rows) },
//       results: computeResults(rows, refs),
//     };

//     try {
//       const dbResponse = await fetch("/api/4submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
//       } else {
//         setGesResults(payload.results);
//         lastSavedJSONRef.current = JSON.stringify(rows);
//         alert("Données 1A1 calculées et sauvegardées avec succès!");
//       }
//     } catch {
//       alert("Erreur inattendue lors de la sauvegarde en base.");
//     }

//     setSubmitting(false);
//   };

//   // row helpers
//   const addRow = () =>
//     setRows((prev) => [
//       ...prev,
//       {
//         equipment: "",
//         description: "",
//         date: "",
//         site: "",
//         product: "",
//         reference: "",
//         usageAndFuel: "",
//         qty: "",
//         unit: "",
//       },
//     ]);

//   const duplicateRow = (idx: number) =>
//     setRows((prev) => {
//       const copy = [...prev];
//       copy.splice(idx + 1, 0, { ...prev[idx] });
//       return copy;
//     });

//   const updateRowField = (idx: number, key: keyof Source1ARow, value: string) => {
//     setRows((prev) => {
//       const copy = [...prev];
//       copy[idx][key] = value;
//       return copy;
//     });
//   };

//   const removeRow = (idx: number) => {
//     setRows((prev) => prev.filter((_, i) => i !== idx));
//   };

//   const onFuelChange = (idx: number, value: string) => {
//     setRows((prev) => {
//       const copy = [...prev];
//       copy[idx].usageAndFuel = value;
//       const unit = parseUnitFromFuel(value);
//       if (unit && !copy[idx].unit) copy[idx].unit = unit;
//       return copy;
//     });
//   };

//   if (loading || prefillLoading) {
//     return (
//       <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
//         <Spinner color={highlight} size="xl" />
//       </Box>
//     );
//   }

//   return (
//     <VStack align="stretch" spacing={4} mb={4}>
//       <HStack justify="space-between" align="center">
//         <Heading
//           as="h3"
//           size="md"
//           color={highlight}
//           pb={2}
//           borderBottom="1px solid"
//           borderColor={`${highlight}30`}
//         >
//           Chauffage des bâtiments et équipements fixes – Source 1A1
//         </Heading>
//         <Stack direction="row" align="center" spacing={3}>
//           {saving && <Spinner size="sm" color={highlight} />}
//           <Text fontSize="sm" color="gray.600">
//             {saveMsg ?? "Saisie automatique activée"}
//           </Text>
//           {prefillError && (
//             <Text fontSize="sm" color="red.500">
//               Erreur de préchargement : {String(prefillError)}
//             </Text>
//           )}
//         </Stack>
//       </HStack>

//       <Grid
//         templateColumns="1.4fr 1.4fr 1fr 1.2fr 1.2fr 1.2fr 1.6fr 0.9fr 0.8fr 96px"
//         bg={highlight}
//         color={headerFg}
//         fontWeight={600}
//         fontSize="sm"
//         alignItems="center"
//         px={4}
//         py={3}
//         rounded="lg"
//       >
//         <GridItem>Source de combustion</GridItem>
//         <GridItem>Description</GridItem>
//         <GridItem>Date</GridItem>
//         <GridItem>Site</GridItem>
//         <GridItem>Produit</GridItem>
//         <GridItem>Références</GridItem>
//         <GridItem>Utilisation et combustible</GridItem>
//         <GridItem>Quantité</GridItem>
//         <GridItem>Unité</GridItem>
//         <GridItem textAlign="right">Actions</GridItem>
//       </Grid>

//       <VStack
//         spacing={0}
//         bg={tableBg}
//         rounded="xl"
//         border="1px solid"
//         borderColor={inputBorder}
//         overflow="hidden"
//       >
//         {rows.map((row, idx) => (
//           <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
//             <Grid
//               templateColumns="1.4fr 1.4fr 1fr 1.2fr 1.2fr 1.2fr 1.6fr 0.9fr 0.8fr 96px"
//               gap={3}
//               alignItems="center"
//               px={1}
//             >
//               <GridItem>
//                 <PillInput
//                   value={row.equipment}
//                   onChange={(v) => updateRowField(idx, "equipment", v)}
//                   placeholder="Chaudière, génératrice…"
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   value={row.description}
//                   onChange={(v) => updateRowField(idx, "description", v)}
//                   placeholder="Facultatif"
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   type="date"
//                   value={row.date}
//                   onChange={(v) => updateRowField(idx, "date", v)}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   value={row.site}
//                   onChange={(v) => updateRowField(idx, "site", v)}
//                   placeholder="Site"
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   value={row.product}
//                   onChange={(v) => updateRowField(idx, "product", v)}
//                   placeholder="Produit"
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillSelect
//                   value={row.reference}
//                   onChange={(v) => updateRowField(idx, "reference", v)}
//                   inputBorder={inputBorder}
//                   placeholder={referenceOptions.length ? "Sélectionner une référence" : "Aucune référence"}
//                 >
//                   {referenceOptions.map((r) => (
//                     <option key={r} value={r}>
//                       {r}
//                     </option>
//                   ))}
//                 </PillSelect>
//               </GridItem>

//               <GridItem>
//                 <PillSelect
//                   value={row.usageAndFuel}
//                   onChange={(v) => onFuelChange(idx, v)}
//                   inputBorder={inputBorder}
//                   placeholder="(Sélectionner)"
//                 >
//                   {FUEL_OPTIONS.map((opt) => (
//                     <option key={opt} value={opt}>
//                       {opt}
//                     </option>
//                   ))}
//                 </PillSelect>
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   type="number"
//                   value={row.qty}
//                   onChange={(v) => updateRowField(idx, "qty", v)}
//                   placeholder="0.00"
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillSelect
//                   value={row.unit}
//                   onChange={(v) => updateRowField(idx, "unit", v)}
//                   inputBorder={inputBorder}
//                   placeholder="Unité"
//                 >
//                   {UNIT_OPTIONS.map((opt) => (
//                     <option key={opt} value={opt}>
//                       {opt}
//                     </option>
//                   ))}
//                 </PillSelect>
//               </GridItem>

//               <GridItem>
//                 <HStack spacing={2} justify="flex-end" pr={1}>
//                   <MiniIconBtn icon={Copy} ariaLabel="Dupliquer la ligne" onClick={() => duplicateRow(idx)} />
//                   <MiniIconBtn icon={Trash2} ariaLabel="Supprimer la ligne" onClick={() => removeRow(idx)} />
//                 </HStack>
//               </GridItem>
//             </Grid>

//             <Box h="2px" bg={faintLine} mx={2} mt={3} rounded="full" />
//           </Box>
//         ))}
//       </VStack>

//       <HStack pt={3} spacing={3}>
//         <Button
//           onClick={addRow}
//           leftIcon={<Icon as={Plus} boxSize={4} />}
//           bg={highlight}
//           color="white"
//           rounded="full"
//           px={6}
//           h="44px"
//           _hover={{ opacity: 0.95 }}
//         >
//           Ajouter une ligne
//         </Button>
//         <Button
//           onClick={handleSubmit}
//           colorScheme="blue"
//           rounded="full"
//           px={6}
//           h="44px"
//           isLoading={submitting}
//         >
//           Soumettre
//         </Button>
//       </HStack>

//       {Array.isArray(gesResults) && gesResults.length > 0 && (
//         <Box mt={4} bg="#e5f2fa" rounded="xl" p={4} boxShadow="sm">
//           <Text fontWeight="bold" color={highlight} mb={2}>
//             Calculs et résultats (récapitulatif)
//           </Text>
//           <Grid templateColumns="repeat(6, 1fr)" gap={3} fontSize="sm">
//             <ResultPill label="CO₂ [gCO₂e]" value={sumField(gesResults, "total_co2_gco2e")} />
//             <ResultPill label="CH₄ [gCO₂e]" value={sumField(gesResults, "total_ges_ch4_gco2e")} />
//             <ResultPill label="N₂O [gCO₂e]" value={sumField(gesResults, "total_ges_n2o_gco2e")} />
//             <ResultPill label="Total GES [gCO₂e]" value={sumField(gesResults, "total_ges_gco2e")} />
//             <ResultPill label="Total GES [tCO₂e]" value={sumField(gesResults, "total_ges_tco2e")} />
//             <ResultPill label="Énergie [kWh]" value={sumField(gesResults, "total_energie_kwh")} />
//           </Grid>
//         </Box>
//       )}
//     </VStack>
//   );
// }

// /* ===== UI helpers ===== */

// function PillInput({
//   value,
//   onChange,
//   placeholder,
//   inputBorder,
//   type,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   inputBorder: string;
//   type?: string;
// }) {
//   return (
//     <Input
//       type={type}
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       bg="white"
//       border="1px solid"
//       borderColor={inputBorder}
//       rounded="xl"
//       h="36px"
//       boxShadow="0 2px 4px rgba(0,0,0,0.06)"
//       fontSize="sm"
//     />
//   );
// }

// function PillSelect({
//   value,
//   onChange,
//   placeholder,
//   inputBorder,
//   children,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   inputBorder: string;
//   children?: React.ReactNode;
// }) {
//   return (
//     <Select
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       bg="white"
//       border="1px solid"
//       borderColor={inputBorder}
//       rounded="xl"
//       h="36px"
//       boxShadow="0 2px 4px rgba(0,0,0,0.06)"
//       fontSize="sm"
//     >
//       {children}
//     </Select>
//   );
// }

// function MiniIconBtn({
//   icon,
//   ariaLabel,
//   onClick,
// }: {
//   icon: any;
//   ariaLabel: string;
//   onClick?: () => void;
// }) {
//   return (
//     <Box
//       as="button"
//       aria-label={ariaLabel}
//       p="6px"
//       rounded="md"
//       color="gray.600"
//       _hover={{ bg: "#eef2ee" }}
//       border="1px solid"
//       borderColor="transparent"
//       onClick={onClick}
//     >
//       <Icon as={icon} boxSize={4} />
//     </Box>
//   );
// }

// function ResultPill({ label, value }: { label: string; value: string }) {
//   return (
//     <VStack
//       bg="white"
//       border="1px solid"
//       borderColor="#E8ECE7"
//       rounded="xl"
//       p={3}
//       spacing={1}
//       align="stretch"
//     >
//       <Text fontSize="xs" color="gray.600">
//         {label}
//       </Text>
//       <Text fontWeight="bold">{value}</Text>
//     </VStack>
//   );
// }

// function sumField(results: GesResult[], key: keyof GesResult): string {
//   const s = results.reduce((acc, r) => acc + (toNum((r as any)[key]) || 0), 0);
//   return Number(s).toLocaleString("fr-CA", { maximumFractionDigits: 3 });
// }
