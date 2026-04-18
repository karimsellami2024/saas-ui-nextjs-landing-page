import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Spinner,
  Button,
  Input,
  Select,
  VStack,
  HStack,
  Grid,
  GridItem,
  Flex,
  Badge,
  Icon,
  IconButton,
  Stack, // ✅ important (you asked: avoid Stack error)
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DeleteIcon,
  AddIcon,
  CopyIcon,
} from "@chakra-ui/icons";
import { FiCalendar, FiFileText, FiMapPin, FiUsers, FiTruck } from "react-icons/fi";
import { supabase } from "../../../lib/supabaseClient";
import { ReferenceSelect } from '../ReferenceSelect';
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";

/** =======================
 * Poste 3.3A1 – Navettage
 * SAME DESIGN as Source4B1 (Figma card / pills / results cards)
 * ======================= */

export type Source33A1Row = {
  methodology: string;
  equipment: string;
  description: string;
  date: string;
  month: string;
  site: string;
  product: string;
  reference: string;

  transportMode: string;
  oneWayDistanceKm: string;
  workDaysPerYear: string;
  employeesSameTrip: string;
};

export type GesResult33A1 = {
  distance_km?: string | number;
  fuel_qty_l?: string | number;

  co2_gco2e?: string | number;
  ch4_gco2e?: string | number;
  n2o_gco2e?: string | number;

  total_gco2e?: string | number;
  total_tco2e?: string | number;

  co2_biogenic_gco2e?: string | number;
  co2_biogenic_tco2e?: string | number;

  energy_kwh?: string | number;
};

export interface Source33A1FormProps {
  rows?: Source33A1Row[];
  setRows?: React.Dispatch<React.SetStateAction<Source33A1Row[]>>;

  posteSourceId: string | null;
  userId?: string | null;
  bilanId?: string;

  gesResults?: GesResult33A1[];
  setGesResults?: (results: GesResult33A1[]) => void;
}

/* ================== constants ================== */

const METHODOLOGY_OPTIONS = ["Données réelles", "Estimation", "Valeur par défaut"];
const TRANSPORT_OPTIONS = ["Voiture", "Autobus", "Marche ou vélo"];

// Defaults to reproduce Excel rows
const DEFAULT_FUEL_L_PER_KM: Record<string, number> = {
  Voiture: 0.097,
  Autobus: 0.0244333333333,
  "Marche ou vélo": 0,
};

// MUST match emission_factors.label in DB
const EF_LABEL_BY_MODE: Record<string, string> = {
  Voiture: "Navettage - Voiture [L]",
  Autobus: "Navettage - Autobus [L]",
  "Marche ou vélo": "",
};

const DEFAULT_ROWS: Source33A1Row[] = [
  {
    methodology: "Données réelles",
    equipment: "",
    description: "",
    date: "",
    month: "",
    site: "",
    product: "",
    reference: "",
    transportMode: "",
    oneWayDistanceKm: "",
    workDaysPerYear: "",
    employeesSameTrip: "",
  },
];

// ---------- helpers ----------
const toNum = (x: any, fallback = 0) => {
  if (x === "" || x == null) return fallback;
  const n =
    typeof x === "number" ? x : Number(String(x).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

type Refs = {
  gco2ByLabel: Record<string, number>;
  gch4ByLabel: Record<string, number>;
  gn2oByLabel: Record<string, number>;
  kwhByLabel: Record<string, number>;
  gco2eBioByLabel: Record<string, number>;
  prpCO2: number;
  prpCH4: number;
  prpN2O: number;
};

function buildEmptyResult(): GesResult33A1 {
  return {
    distance_km: 0,
    fuel_qty_l: 0,
    co2_gco2e: 0,
    ch4_gco2e: 0,
    n2o_gco2e: 0,
    total_gco2e: 0,
    total_tco2e: 0,
    co2_biogenic_gco2e: 0,
    co2_biogenic_tco2e: 0,
    energy_kwh: 0,
  };
}

function computeResults(rws: Source33A1Row[], rf: Refs | null): GesResult33A1[] {
  if (!rf) return [];

  return (rws || []).map((row) => {
    const mode = String(row.transportMode || "").trim();
    const oneWayKm = toNum(row.oneWayDistanceKm, 0);
    const days = toNum(row.workDaysPerYear, 0);
    const employees = Math.max(1, toNum(row.employeesSameTrip, 1));

    if (!mode || oneWayKm === 0 || days === 0) return buildEmptyResult();

    const distanceKm = oneWayKm * days * 2 * employees;

    const lPerKm = DEFAULT_FUEL_L_PER_KM[mode] ?? 0;
    const fuelL = distanceKm * lPerKm;

    const efLabel = EF_LABEL_BY_MODE[mode] ?? "";

    const gco2_per_unit = efLabel ? toNum(rf.gco2ByLabel[efLabel], 0) : 0;
    const gch4_per_unit = efLabel ? toNum(rf.gch4ByLabel[efLabel], 0) : 0;
    const gn2o_per_unit = efLabel ? toNum(rf.gn2oByLabel[efLabel], 0) : 0;
    const kwh_per_unit = efLabel ? toNum(rf.kwhByLabel[efLabel], 0) : 0;
    const gco2e_bio_per_unit = efLabel ? toNum(rf.gco2eBioByLabel[efLabel], 0) : 0;

    const prpCO2 = toNum(rf.prpCO2, 1);
    const prpCH4 = toNum(rf.prpCH4, 0);
    const prpN2O = toNum(rf.prpN2O, 0);

    const co2 = gco2_per_unit * fuelL * prpCO2;
    const ch4 = gch4_per_unit * fuelL * prpCH4;
    const n2o = gn2o_per_unit * fuelL * prpN2O;

    const total = co2 + ch4 + n2o;
    const totalT = total / 1e6;

    const co2Bio = gco2e_bio_per_unit * fuelL;
    const co2BioT = co2Bio / 1e6;

    const energy = kwh_per_unit * fuelL;

    return {
      distance_km: distanceKm,
      fuel_qty_l: mode === "Marche ou vélo" ? 0 : fuelL,
      co2_gco2e: co2,
      ch4_gco2e: ch4,
      n2o_gco2e: n2o,
      total_gco2e: total,
      total_tco2e: totalT,
      co2_biogenic_gco2e: co2Bio,
      co2_biogenic_tco2e: co2BioT,
      energy_kwh: energy,
    };
  });
}

/* ================== animations (same style) ================== */

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

/* ================== component ================== */

export function Source33A1Form({
  rows: propRows,
  setRows: propSetRows,
  posteSourceId,
  userId: propUserId,
  bilanId,
  gesResults: propGesResults,
  setGesResults: propSetGesResults,
}: Source33A1FormProps) {
  // ✅ same safety as you asked previously
  const [localRows, setLocalRows] = useState<Source33A1Row[]>(DEFAULT_ROWS);
  const rows = propRows ?? localRows;
  const setRows = propSetRows ?? setLocalRows;

  const [localGes, setLocalGes] = useState<GesResult33A1[]>([]);
  const gesResults = propGesResults ?? localGes;
  const setGesResults = propSetGesResults ?? setLocalGes;

  // FIGMA tokens (same palette as your “Figma design” component)
  const FIGMA = {
    bg: "#F5F6F5",
    green: "#344E41",
    greenLight: "#588157",
    greenSoft: "#DDE5E0",
    border: "#E4E4E4",
    text: "#404040",
    muted: "#8F8F8F",
    inputShadow: "0px 1px 6px 2px rgba(0,0,0,0.05)",
    buttonShadow: "0px 1px 6px 2px rgba(0,0,0,0.25)",
    cardShadow: "0 4px 16px rgba(0,0,0,0.08)",
    hoverShadow: "0 8px 24px rgba(0,0,0,0.12)",
  };

  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [refs, setRefs] = useState<Refs | null>(null);

  // company dropdowns
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

  // Prefill
  const { loading: prefillLoading, error: prefillError, data: prefillData, results: prefillResults } =
    usePrefillPosteSource((userId ?? "") as string, 3, "3.3A1", { rows: DEFAULT_ROWS });

  const isPristine = useMemo(() => {
    if (!rows || rows.length === 0) return true;
    if (rows.length !== 1) return false;
    const r = rows[0];
    return (
      (r.methodology === "Données réelles" || !r.methodology) &&
      !r.equipment &&
      !r.description &&
      !r.date &&
      !r.month &&
      !r.site &&
      !r.product &&
      !r.reference &&
      !r.transportMode &&
      !r.oneWayDistanceKm &&
      !r.workDaysPerYear &&
      !r.employeesSameTrip
    );
  }, [rows]);

  /* ===== load refs ===== */
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
            .map((r: any) => [String(r.formule_chimique).trim().toUpperCase(), Number(r.prp_100ans)])
        );

        const prpCO2 = Number.isFinite(prpMap["CO2"]) ? prpMap["CO2"] : 1;
        const prpCH4 = Number.isFinite(prpMap["CH4"]) ? prpMap["CH4"] : 0;
        const prpN2O = Number.isFinite(prpMap["N2O"]) ? prpMap["N2O"] : 0;

        const { data: efRows, error: efErr } = await supabase
          .from("emission_factors")
          .select("label, energy_kwh_per_unit, gco2_per_unit, gch4_per_unit, gn2o_per_unit, gco2e_biogenic_per_unit");
        if (efErr) throw efErr;

        const gco2ByLabel: Record<string, number> = {};
        const gch4ByLabel: Record<string, number> = {};
        const gn2oByLabel: Record<string, number> = {};
        const kwhByLabel: Record<string, number> = {};
        const gco2eBioByLabel: Record<string, number> = {};

        (efRows ?? []).forEach((r: any) => {
          const key = String(r?.label ?? "").trim();
          if (!key) return;
          if (r?.gco2_per_unit != null) gco2ByLabel[key] = Number(r.gco2_per_unit);
          if (r?.gch4_per_unit != null) gch4ByLabel[key] = Number(r.gch4_per_unit);
          if (r?.gn2o_per_unit != null) gn2oByLabel[key] = Number(r.gn2o_per_unit);
          if (r?.energy_kwh_per_unit != null) kwhByLabel[key] = Number(r.energy_kwh_per_unit);
          if (r?.gco2e_biogenic_per_unit != null) gco2eBioByLabel[key] = Number(r.gco2e_biogenic_per_unit);
        });

        setRefs({ gco2ByLabel, gch4ByLabel, gn2oByLabel, kwhByLabel, gco2eBioByLabel, prpCO2, prpCH4, prpN2O });
      } catch (e) {
        console.error("3.3A1 refs load error:", e);
        setRefs({
          gco2ByLabel: {},
          gch4ByLabel: {},
          gn2oByLabel: {},
          kwhByLabel: {},
          gco2eBioByLabel: {},
          prpCO2: 1,
          prpCH4: 0,
          prpN2O: 0,
        });
      }
    })();
  }, []);

  /* ===== load latest saved poste ===== */
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
          : (data as any).postes.find((p: any) => p.poste_num === 3);

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
              parsed.rows.map((r: any) => ({
                methodology: r.methodology ?? "Données réelles",
                equipment: r.equipment ?? "",
                description: r.description ?? "",
                date: r.date ?? "",
                month: r.month ?? "",
                site: r.site ?? "",
                product: r.product ?? "",
                reference: r.reference ?? "",
                transportMode: r.transportMode ?? "",
                oneWayDistanceKm: String(r.oneWayDistanceKm ?? ""),
                workDaysPerYear: String(r.workDaysPerYear ?? ""),
                employeesSameTrip: String(r.employeesSameTrip ?? ""),
              }))
            );
          } else if (!rows?.length) {
            setRows(DEFAULT_ROWS);
          }

          if (Array.isArray(poste.results)) {
            setGesResults(poste.results as GesResult33A1[]);
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

  /* ===== hydrate from prefill (only if pristine) ===== */
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (!isPristine) return;

    if ((prefillData as any)?.rows) {
      const dataRows = Array.isArray((prefillData as any).rows) ? (prefillData as any).rows : DEFAULT_ROWS;
      setRows(dataRows.length ? dataRows : DEFAULT_ROWS);
    } else if (!rows?.length) {
      setRows(DEFAULT_ROWS);
    }

    if (prefillResults) {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult33A1[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults, prefillLoading, loading, isPristine]);

  /* ===== company dropdowns ===== */
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
          ? (company.production_sites as any[]).map((s) => String(s?.nom ?? "")).filter(Boolean)
          : [];
        const prods = Array.isArray(company?.products)
          ? (company.products as any[]).map((p) => String(p?.nom ?? "")).filter(Boolean)
          : [];
        const refsArr = Array.isArray(company?.company_references)
          ? (company.company_references as any[]).map((r) => String(r)).filter(Boolean)
          : [];

        const uniq = (arr: string[]) => Array.from(new Set(arr));
        setSiteOptions(uniq(sites));
        setProductOptions(uniq(prods));
        setReferenceOptions(uniq(refsArr));
      } catch {
        // ignore
      }
    })();
  }, [userId]);

  /* ===== validation ===== */
  const validateData = (rws: Source33A1Row[]) =>
    rws.length > 0 &&
    rws.every((row) => row.methodology && row.site && row.transportMode && row.oneWayDistanceKm !== "" && row.workDaysPerYear !== "");

  /* ===== live compute ===== */
  useEffect(() => {
    const res = computeResults(rows, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, refs]);

  /* ===== autosave ===== */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSONRef = useRef<string>("");

  const makeSanitizedRows = (rws: Source33A1Row[]) =>
    rws.map((row) => ({
      methodology: row.methodology,
      equipment: row.equipment,
      description: row.description,
      date: row.date,
      month: row.month,
      site: row.site,
      product: row.product,
      reference: row.reference,
      transportMode: row.transportMode,
      oneWayDistanceKm: toNum(row.oneWayDistanceKm, 0),
      workDaysPerYear: toNum(row.workDaysPerYear, 0),
      employeesSameTrip: Math.max(1, toNum(row.employeesSameTrip, 1)),
    }));

  const saveDraft = async () => {
    if (!userId || !posteSourceId) return;

    const jsonNow = JSON.stringify(rows);
    if (jsonNow === lastSavedJSONRef.current) return;

    setSaving(true);
    setSaveMsg("Enregistrement…");
    setJustSaved(false);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 3,
      source_code: "3.3A1",
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
        setSaveMsg("Erreur d’enregistrement");
        console.error("Autosave DB error:", dbResult?.error || dbResult);
      } else {
        lastSavedJSONRef.current = jsonNow;
        setSaveMsg("Enregistré");
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    } catch (e) {
      console.error("Autosave network error:", e);
      setSaveMsg("Erreur réseau");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 1500);
    }
  };

  useEffect(() => {
    if (!userId || !posteSourceId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(saveDraft, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, userId, posteSourceId]);

  /* ===== submit ===== */
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!posteSourceId || !userId) {
      alert("Champs obligatoires manquants (posteSourceId ou userId)");
      return;
    }
    if (!validateData(rows)) {
      alert("Veuillez remplir tous les champs requis.");
      return;
    }
    if (!refs) {
      alert("Références (emission_factors / PRP) non chargées. Réessayez.");
      return;
    }

    setSubmitting(true);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 3,
      source_code: "3.3A1",
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
        alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
      } else {
        setGesResults(payload.results);
        lastSavedJSONRef.current = JSON.stringify(rows);
        alert("Données 3.3A1 calculées et sauvegardées avec succès!");
      }
    } catch {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }

    setSubmitting(false);
  };

  /* ===== row helpers ===== */
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        methodology: "Données réelles",
        equipment: "",
        description: "",
        date: "",
        month: "",
        site: "",
        product: "",
        reference: "",
        transportMode: "",
        oneWayDistanceKm: "",
        workDaysPerYear: "",
        employeesSameTrip: "",
      },
    ]);

  const duplicateRow = (idx: number) =>
    setRows((prev) => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, { ...prev[idx] });
      return copy;
    });

  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRowField = (idx: number, key: keyof Source33A1Row, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  /* ===== results display ===== */
  const totals = useMemo(() => {
    const sum = (k: keyof GesResult33A1) => (gesResults || []).reduce((acc, r) => acc + toNum((r as any)?.[k], 0), 0);
    return {
      distance_km: sum("distance_km"),
      fuel_qty_l: sum("fuel_qty_l"),
      co2_gco2e: sum("co2_gco2e"),
      ch4_gco2e: sum("ch4_gco2e"),
      n2o_gco2e: sum("n2o_gco2e"),
      total_gco2e: sum("total_gco2e"),
      total_tco2e: sum("total_tco2e"),
      co2_biogenic_tco2e: sum("co2_biogenic_tco2e"),
      energy_kwh: sum("energy_kwh"),
    };
  }, [gesResults]);

  const fmt = (n: any, max = 3) => Number(toNum(n, 0)).toLocaleString("fr-CA", { maximumFractionDigits: max });

  if (loading || prefillLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
        <Spinner color={FIGMA.green} size="xl" />
      </Box>
    );
  }

  return (
    <Box bg={FIGMA.bg} p={{ base: 4, md: 6 }} rounded="2xl" animation={`${fadeInUp} 0.6s ease-out`}>
      {/* Header card */}
      <Box bg="white" p={6} rounded="xl" mb={6} boxShadow={FIGMA.cardShadow} position="relative" overflow="hidden">
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
                Poste 3 · Source 3.3A1
              </Badge>
            </HStack>

            <Heading as="h2" fontFamily="Inter" fontWeight={700} fontSize={{ base: "xl", md: "2xl" }} color={FIGMA.text}>
              Navettage des employés
            </Heading>

            <HStack spacing={3} flexWrap="wrap">
              <Text fontSize="sm" fontFamily="Montserrat" color={FIGMA.muted}>
                {rows?.length || 0} ligne(s)
              </Text>

              {prefillError && (
                <Text fontSize="sm" color="red.500">
                  Préchargement: {String(prefillError)}
                </Text>
              )}
            </HStack>
          </VStack>

          <HStack spacing={3} flexWrap="wrap" align="center">
            <Box minW="180px" bg={saving || justSaved ? "white" : "transparent"} px={3} py={2} rounded="lg" transition="all 0.3s">
              {saving && (
                <HStack color={FIGMA.muted} animation={`${pulse} 1.5s ease-in-out infinite`}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistrement…
                  </Text>
                </HStack>
              )}
              {!saving && justSaved && (
                <HStack color="green.600" animation={`${slideIn} 0.3s ease-out`}>
                  <Icon as={CheckCircleIcon} />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistré
                  </Text>
                </HStack>
              )}
              {!saving && !justSaved && (
                <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500} color={FIGMA.muted}>
                  {saveMsg ?? "Saisie automatique activée"}
                </Text>
              )}
            </Box>

            <IconButton
              aria-label={collapsed ? "Développer" : "Réduire"}
              icon={collapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
              variant="ghost"
              color={FIGMA.muted}
              size="sm"
              _hover={{ color: FIGMA.green, bg: FIGMA.greenSoft }}
              onClick={() => setCollapsed((v) => !v)}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Main */}
      <Box bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow}>
        {collapsed ? (
          <Text color={FIGMA.muted} fontFamily="Montserrat">
            Section réduite.
          </Text>
        ) : (
          <Stack spacing={6}>
            {/* Desktop header bar */}
            <Box
              bg={`linear-gradient(135deg, ${FIGMA.green} 0%, ${FIGMA.greenLight} 100%)`}
              color="white"
              h="50px"
              rounded="xl"
              px={6}
              display={{ base: "none", lg: "flex" }}
              alignItems="center"
              boxShadow="0 2px 8px rgba(52, 78, 65, 0.2)"
            >
              <Grid
                w="full"
                templateColumns="1.1fr 1.1fr 1.3fr 1.0fr 0.8fr 1.1fr 1.1fr 1.1fr 1.2fr 1.2fr 1.0fr 1.0fr 44px"
                columnGap={6}
                alignItems="center"
              >
                {[
                  { label: "Méthode", icon: FiFileText },
                  { label: "Équipements", icon: FiFileText },
                  { label: "Description", icon: FiFileText },
                  { label: "Date", icon: FiCalendar },
                  { label: "Mois", icon: FiCalendar },
                  { label: "Site", icon: FiMapPin },
                  { label: "Produit", icon: FiFileText },
                  { label: "Réf.", icon: FiFileText },
                  { label: "Transport", icon: FiTruck },
                  { label: "Distance (km)", icon: FiTruck },
                  { label: "Jours/an", icon: FiCalendar },
                  { label: "Employés", icon: FiUsers },
                ].map(({ label, icon }) => (
                  <HStack key={label} justify="center" spacing={2}>
                    <Icon as={icon} boxSize={4} />
                    <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                      {label}
                    </Text>
                  </HStack>
                ))}
                <Box />
              </Grid>
            </Box>

            {/* Rows */}
            <Stack spacing={4}>
              {(rows || []).map((row, idx) => (
                <Box
                  key={idx}
                  bg={FIGMA.bg}
                  rounded="xl"
                  p={4}
                  border="2px solid"
                  borderColor={FIGMA.border}
                  transition="all 0.3s"
                  _hover={{ borderColor: FIGMA.green }}
                  animation={`${fadeInUp} 0.35s ease-out ${idx * 0.05}s both`}
                >
                  <Grid
                    templateColumns={{
                      base: "1fr",
                      lg: "1.1fr 1.1fr 1.3fr 1.0fr 0.8fr 1.1fr 1.1fr 1.1fr 1.2fr 1.2fr 1.0fr 1.0fr 44px",
                    }}
                    columnGap={4}
                    rowGap={3}
                    alignItems="center"
                  >
                    <GridItem>
                      <FigmaSelect
                        FIGMA={FIGMA}
                        value={row.methodology}
                        onChange={(v) => updateRowField(idx, "methodology", v)}
                        placeholder="(Sélectionner)"
                        options={METHODOLOGY_OPTIONS}
                      />
                    </GridItem>

                    <GridItem>
                      <FigmaInput FIGMA={FIGMA} value={row.equipment} onChange={(v) => updateRowField(idx, "equipment", v)} placeholder="(Facultatif)" />
                    </GridItem>

                    <GridItem>
                      <FigmaInput FIGMA={FIGMA} value={row.description} onChange={(v) => updateRowField(idx, "description", v)} placeholder="(Facultatif)" />
                    </GridItem>

                    <GridItem>
                      <FigmaInput FIGMA={FIGMA} type="date" value={row.date} onChange={(v) => updateRowField(idx, "date", v)} />
                    </GridItem>

                    <GridItem>
                      <FigmaInput FIGMA={FIGMA} value={row.month} onChange={(v) => updateRowField(idx, "month", v)} placeholder="01..12" center />
                    </GridItem>

                    <GridItem>
                      <FigmaSelect
                        FIGMA={FIGMA}
                        value={row.site}
                        onChange={(v) => updateRowField(idx, "site", v)}
                        placeholder={siteOptions.length ? "Sélectionner" : "Site"}
                        options={siteOptions.length ? siteOptions : []}
                      />
                    </GridItem>

                    <GridItem>
                      <FigmaSelect
                        FIGMA={FIGMA}
                        value={row.product}
                        onChange={(v) => updateRowField(idx, "product", v)}
                        placeholder={productOptions.length ? "Sélectionner" : "Produit"}
                        options={productOptions.length ? productOptions : []}
                      />
                    </GridItem>

                    <GridItem>
                      <ReferenceSelect userId={userId ?? ""} value={row.reference} onChange={(v) => updateRowField(idx, "reference", v)} />
                    </GridItem>

                    <GridItem>
                      <FigmaSelect
                        FIGMA={FIGMA}
                        value={row.transportMode}
                        onChange={(v) => updateRowField(idx, "transportMode", v)}
                        placeholder="(Sélectionner)"
                        options={TRANSPORT_OPTIONS}
                      />
                    </GridItem>

                    <GridItem>
                      <FigmaInput FIGMA={FIGMA} type="number" value={row.oneWayDistanceKm} onChange={(v) => updateRowField(idx, "oneWayDistanceKm", v)} placeholder="0" center />
                    </GridItem>

                    <GridItem>
                      <FigmaInput FIGMA={FIGMA} type="number" value={row.workDaysPerYear} onChange={(v) => updateRowField(idx, "workDaysPerYear", v)} placeholder="0" center />
                    </GridItem>

                    <GridItem>
                      <FigmaInput FIGMA={FIGMA} type="number" value={row.employeesSameTrip} onChange={(v) => updateRowField(idx, "employeesSameTrip", v)} placeholder="(fac.) 1" center />
                    </GridItem>

                    <GridItem>
                      <HStack justify="flex-end" spacing={1}>
                        <IconButton
                          aria-label="Dupliquer"
                          icon={<CopyIcon />}
                          variant="ghost"
                          color={FIGMA.muted}
                          size="sm"
                          _hover={{ bg: FIGMA.greenSoft, color: FIGMA.green }}
                          onClick={() => duplicateRow(idx)}
                        />
                        <IconButton
                          aria-label="Supprimer"
                          icon={<DeleteIcon />}
                          variant="ghost"
                          color={FIGMA.muted}
                          size="sm"
                          _hover={{ bg: "red.50", color: "red.500" }}
                          onClick={() => removeRow(idx)}
                        />
                      </HStack>
                    </GridItem>
                  </Grid>
                </Box>
              ))}
            </Stack>

            {/* Actions */}
            <HStack pt={2} spacing={4} flexWrap="wrap">
              <Button
                leftIcon={<AddIcon />}
                variant="outline"
                borderColor={FIGMA.green}
                color={FIGMA.green}
                rounded="full"
                h="44px"
                px={6}
                onClick={addRow}
                fontFamily="Inter"
                fontWeight={600}
                _hover={{ bg: FIGMA.greenSoft, borderColor: FIGMA.green }}
              >
                Ajouter une ligne
              </Button>
            </HStack>
          </Stack>
        )}
      </Box>

      {/* Results */}
      <Box mt={6} bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow} animation={`${fadeInUp} 0.6s ease-out`}>
        <HStack mb={4} spacing={2}>
          <Icon as={FiFileText} color={FIGMA.green} boxSize={5} />
          <Text fontFamily="Inter" fontWeight={700} color={FIGMA.text} fontSize="lg">
            Calculs et résultats
          </Text>
        </HStack>

        {gesResults && gesResults.length > 0 ? (
          <Grid templateColumns={{ base: "1fr", md: "repeat(auto-fit, minmax(220px, 1fr))" }} gap={6}>
            <ResultCard FIGMA={FIGMA} label="Distance [km]" value={fmt(totals.distance_km)} />
            <ResultCard FIGMA={FIGMA} label="Carburant [L]" value={fmt(totals.fuel_qty_l)} />
            <ResultCard FIGMA={FIGMA} label="CO₂ [gCO₂e]" value={fmt(totals.co2_gco2e)} />
            <ResultCard FIGMA={FIGMA} label="CH₄ [gCO₂e]" value={fmt(totals.ch4_gco2e)} />
            <ResultCard FIGMA={FIGMA} label="N₂O [gCO₂e]" value={fmt(totals.n2o_gco2e)} />
            <ResultCard FIGMA={FIGMA} label="Total [gCO₂e]" value={fmt(totals.total_gco2e)} />
            <ResultCard FIGMA={FIGMA} label="Total [tCO₂e]" value={fmt(totals.total_tco2e)} />
            <ResultCard FIGMA={FIGMA} label="CO₂ bio [tCO₂e]" value={fmt(totals.co2_biogenic_tco2e)} />
            <ResultCard FIGMA={FIGMA} label="Énergie [kWh]" value={fmt(totals.energy_kwh)} />
          </Grid>
        ) : (
          <Text color={FIGMA.muted} fontFamily="Montserrat">
            Aucun résultat à afficher.
          </Text>
        )}
      </Box>

      {prefillError && (
        <Box mt={4}>
          <Text fontSize="sm" color="red.500">
            Erreur de préchargement : {String(prefillError)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/* ================== UI helpers (same style) ================== */

function FigmaInput({
  FIGMA,
  value,
  onChange,
  placeholder,
  type = "text",
  center,
}: {
  FIGMA: any;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  center?: boolean;
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
      textAlign={center ? "center" : "left"}
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
  FIGMA,
  value,
  onChange,
  placeholder,
  options,
}: {
  FIGMA: any;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: string[];
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
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </Select>
  );
}

function ResultCard({ FIGMA, label, value }: { FIGMA: any; label: string; value: string }) {
  return (
    <Box
      bg={FIGMA.bg}
      p={4}
      rounded="lg"
      border="2px solid"
      borderColor={FIGMA.border}
      transition="all 0.3s"
      _hover={{ borderColor: FIGMA.green, transform: "translateY(-2px)" }}
    >
      <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" mb={2} textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight={700} color={FIGMA.green} fontFamily="Inter">
        {value}
      </Text>
    </Box>
  );
}

// ✅ default export so your import works: `import Source33A1Form from "..."`
export default Source33A1Form;

