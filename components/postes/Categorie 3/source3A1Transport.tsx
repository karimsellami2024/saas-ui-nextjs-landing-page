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
  useColorModeValue,
} from "@chakra-ui/react";
import { Plus, Trash2, Copy } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";

/** =======================
 * Poste 3.3A1 – Navettage
 * ======================= */

export type Source33A1Row = {
  methodology: string; // # méthode
  equipment: string; // Liste des équipements (facultatif)
  description: string; // (facultatif)
  date: string; // date (facultatif)
  month: string; // mois (facultatif)
  site: string; // site
  product: string; // produit (facultatif)
  reference: string; // références (facultatif)

  transportMode: string; // Mode de transport
  oneWayDistanceKm: string; // Distance domicile-travail (aller) [km]
  workDaysPerYear: string; // Nombre de jours de travail par année [jours/an]
  employeesSameTrip: string; // Nombre d'employés (même trajet) (facultatif)
};

export type GesResult33A1 = {
  distance_km?: string | number; // Distance annuelle (km)
  fuel_qty_l?: string | number; // Qté carburant (L)

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
  // allow parent OR internal ownership (prevents setRows not a function)
  rows?: Source33A1Row[];
  setRows?: React.Dispatch<React.SetStateAction<Source33A1Row[]>>;

  highlight?: string;
  tableBg?: string;
  posteSourceId: string | null;
  userId?: string | null;

  // allow parent OR internal ownership (prevents setGesResults not a function)
  gesResults?: GesResult33A1[];
  setGesResults?: (results: GesResult33A1[]) => void;
}

const METHODOLOGY_OPTIONS = ["Données réelles", "Estimation", "Valeur par défaut"];
const TRANSPORT_OPTIONS = ["Voiture", "Autobus", "Marche ou vélo"];

// Defaults to reproduce your Excel rows
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
    typeof x === "number"
      ? x
      : Number(String(x).replace(",", ".").replace(/\s/g, ""));
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

export function Source33A1Form({
  rows: propRows,
  setRows: propSetRows,
  highlight = "#245a7c",
  tableBg = "#f3f6ef",
  posteSourceId,
  userId: propUserId,
  gesResults: propGesResults,
  setGesResults: propSetGesResults,
}: Source33A1FormProps) {
  // ✅ local fallback rows state (prevents "setRows is not a function")
  const [localRows, setLocalRows] = useState<Source33A1Row[]>(DEFAULT_ROWS);
  const rows = propRows ?? localRows;
  const setRows = propSetRows ?? setLocalRows;

  // ✅ local fallback results state (prevents "setGesResults is not a function")
  const [localGesResults, setLocalGesResults] = useState<GesResult33A1[]>([]);
  const gesResults = propGesResults ?? localGesResults;
  const setGesResults = propSetGesResults ?? setLocalGesResults;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);

  const [refs, setRefs] = useState<Refs | null>(null);

  const inputBorder = useColorModeValue("#E8ECE7", "#2f3a36");
  const faintLine = useColorModeValue(
    "rgba(0,0,0,0.12)",
    "rgba(255,255,255,0.12)"
  );
  const headerFg = "white";

  // === Prefill (poste 3, source 3.3A1) ===
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource((userId ?? "") as string, 3, "3.3A1", {
    rows: DEFAULT_ROWS,
  });

  // ✅ pristine should also consider methodology (otherwise it may refuse prefill)
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

  // Dropdown options from company
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

  // --------------------------
  // ✅ Load refs (gaz_effet_serre + emission_factors)
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
            "label, energy_kwh_per_unit, gco2_per_unit, gch4_per_unit, gn2o_per_unit, gco2e_biogenic_per_unit"
          );
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

        setRefs({
          gco2ByLabel,
          gch4ByLabel,
          gn2oByLabel,
          kwhByLabel,
          gco2eBioByLabel,
          prpCO2,
          prpCH4,
          prpN2O,
        });
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
      setGesResults(normalized as GesResult33A1[]);
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

  // Validation
  const validateData = (rws: Source33A1Row[]) =>
    rws.length > 0 &&
    rws.every(
      (row) =>
        row.methodology &&
        row.site &&
        row.transportMode &&
        row.oneWayDistanceKm !== "" &&
        row.workDaysPerYear !== ""
    );

  // ✅ recompute results whenever rows/refs change
  useEffect(() => {
    const res = computeResults(rows, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, refs]);

  // ---------- autosave ----------
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

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 3,
      source_code: "3.3A1",
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

  // ---------- submit ----------
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

  // ---------- row helpers ----------
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

  const updateRowField = (idx: number, key: keyof Source33A1Row, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  if (loading || prefillLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
        <Spinner color={highlight} size="xl" />
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={4} mb={4}>
      <HStack justify="space-between" align="center">
        <Heading
          as="h3"
          size="md"
          color={highlight}
          pb={2}
          borderBottom="1px solid"
          borderColor={`${highlight}30`}
        >
          3.3A1 – Navettage des employés
        </Heading>
        <Stack direction="row" align="center" spacing={3}>
          {saving && <Spinner size="sm" color={highlight} />}
          <Text fontSize="sm" color="gray.600">
            {saveMsg ?? "Saisie automatique activée"}
          </Text>
          {prefillError && (
            <Text fontSize="sm" color="red.500">
              Erreur de préchargement : {String(prefillError)}
            </Text>
          )}
        </Stack>
      </HStack>

      {/* Header */}
      <Grid
        templateColumns="1.1fr 1.2fr 1.2fr 1fr 0.8fr 1.1fr 1.1fr 1.1fr 1.2fr 1.2fr 1.1fr 1.1fr 96px"
        bg={highlight}
        color={headerFg}
        fontWeight={600}
        fontSize="sm"
        alignItems="center"
        px={4}
        py={3}
        rounded="lg"
      >
        <GridItem># méthode</GridItem>
        <GridItem>Équipements</GridItem>
        <GridItem>Description</GridItem>
        <GridItem>Date</GridItem>
        <GridItem>Mois</GridItem>
        <GridItem>Site</GridItem>
        <GridItem>Produit</GridItem>
        <GridItem>Références</GridItem>
        <GridItem>Mode transport</GridItem>
        <GridItem>Distance aller (km)</GridItem>
        <GridItem>Jours/an</GridItem>
        <GridItem>Nb employés</GridItem>
        <GridItem textAlign="right">Actions</GridItem>
      </Grid>

      {/* Rows */}
      <VStack
        spacing={0}
        bg={tableBg}
        rounded="xl"
        border="1px solid"
        borderColor={inputBorder}
        overflow="hidden"
      >
        {rows.map((row, idx) => (
          <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
            <Grid
              templateColumns="1.1fr 1.2fr 1.2fr 1fr 0.8fr 1.1fr 1.1fr 1.1fr 1.2fr 1.2fr 1.1fr 1.1fr 96px"
              gap={3}
              alignItems="center"
              px={1}
            >
              <GridItem>
                <PillSelect
                  value={row.methodology}
                  onChange={(v) => updateRowField(idx, "methodology", v)}
                  inputBorder={inputBorder}
                  placeholder="(Sélectionner)"
                >
                  {METHODOLOGY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </PillSelect>
              </GridItem>

              <GridItem>
                <PillInput
                  value={row.equipment}
                  onChange={(v) => updateRowField(idx, "equipment", v)}
                  placeholder="(Facultatif)"
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  value={row.description}
                  onChange={(v) => updateRowField(idx, "description", v)}
                  placeholder="(Facultatif)"
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  type="date"
                  value={row.date}
                  onChange={(v) => updateRowField(idx, "date", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  value={row.month}
                  onChange={(v) => updateRowField(idx, "month", v)}
                  placeholder="01..12"
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillSelect
                  value={row.site}
                  onChange={(v) => updateRowField(idx, "site", v)}
                  inputBorder={inputBorder}
                  placeholder={siteOptions.length ? "Sélectionner" : "Site"}
                >
                  {siteOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </PillSelect>
              </GridItem>

              <GridItem>
                <PillSelect
                  value={row.product}
                  onChange={(v) => updateRowField(idx, "product", v)}
                  inputBorder={inputBorder}
                  placeholder={productOptions.length ? "Sélectionner" : "Produit"}
                >
                  {productOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </PillSelect>
              </GridItem>

              <GridItem>
                <PillSelect
                  value={row.reference}
                  onChange={(v) => updateRowField(idx, "reference", v)}
                  inputBorder={inputBorder}
                  placeholder={referenceOptions.length ? "Sélectionner" : "Aucune"}
                >
                  {referenceOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </PillSelect>
              </GridItem>

              <GridItem>
                <PillSelect
                  value={row.transportMode}
                  onChange={(v) => updateRowField(idx, "transportMode", v)}
                  inputBorder={inputBorder}
                  placeholder="(Sélectionner)"
                >
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </PillSelect>
              </GridItem>

              <GridItem>
                <PillInput
                  type="number"
                  value={row.oneWayDistanceKm}
                  onChange={(v) => updateRowField(idx, "oneWayDistanceKm", v)}
                  placeholder="0"
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  type="number"
                  value={row.workDaysPerYear}
                  onChange={(v) => updateRowField(idx, "workDaysPerYear", v)}
                  placeholder="0"
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  type="number"
                  value={row.employeesSameTrip}
                  onChange={(v) => updateRowField(idx, "employeesSameTrip", v)}
                  placeholder="(Facultatif) 1"
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <HStack spacing={2} justify="flex-end" pr={1}>
                  <MiniIconBtn icon={Copy} ariaLabel="Dupliquer" onClick={() => duplicateRow(idx)} />
                  <MiniIconBtn icon={Trash2} ariaLabel="Supprimer" onClick={() => removeRow(idx)} />
                </HStack>
              </GridItem>
            </Grid>

            <Box h="2px" bg={faintLine} mx={2} mt={3} rounded="full" />
          </Box>
        ))}
      </VStack>

      <HStack pt={3} spacing={3}>
        <Button
          onClick={addRow}
          leftIcon={<Icon as={Plus} boxSize={4} />}
          bg={highlight}
          color="white"
          rounded="full"
          px={6}
          h="44px"
          _hover={{ opacity: 0.95 }}
        >
          Ajouter une ligne
        </Button>
        <Button
          onClick={handleSubmit}
          colorScheme="blue"
          rounded="full"
          px={6}
          h="44px"
          isLoading={submitting}
        >
          Soumettre
        </Button>
      </HStack>

      {Array.isArray(gesResults) && gesResults.length > 0 && (
        <Box mt={4} bg="#e5f2fa" rounded="xl" p={4} boxShadow="sm">
          <Text fontWeight="bold" color={highlight} mb={2}>
            Calculs et résultats (récapitulatif)
          </Text>

          <Grid templateColumns="repeat(9, 1fr)" gap={3} fontSize="sm">
            <ResultPill label="Distance [km]" value={sumField(gesResults, "distance_km")} />
            <ResultPill label="Carburant [L]" value={sumField(gesResults, "fuel_qty_l")} />
            <ResultPill label="CO₂ [gCO₂e]" value={sumField(gesResults, "co2_gco2e")} />
            <ResultPill label="CH₄ [gCO₂e]" value={sumField(gesResults, "ch4_gco2e")} />
            <ResultPill label="N₂O [gCO₂e]" value={sumField(gesResults, "n2o_gco2e")} />
            <ResultPill label="Total [gCO₂e]" value={sumField(gesResults, "total_gco2e")} />
            <ResultPill label="Total [tCO₂e]" value={sumField(gesResults, "total_tco2e")} />
            <ResultPill label="CO₂ bio [tCO₂e]" value={sumField(gesResults, "co2_biogenic_tco2e")} />
            <ResultPill label="Énergie [kWh]" value={sumField(gesResults, "energy_kwh")} />
          </Grid>
        </Box>
      )}
    </VStack>
  );
}

/* ===== UI helpers ===== */

function PillInput({
  value,
  onChange,
  placeholder,
  inputBorder,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputBorder: string;
  type?: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
    />
  );
}

function PillSelect({
  value,
  onChange,
  placeholder,
  inputBorder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputBorder: string;
  children?: React.ReactNode;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
    >
      {children}
    </Select>
  );
}

function MiniIconBtn({
  icon,
  ariaLabel,
  onClick,
}: {
  icon: any;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <Box
      as="button"
      aria-label={ariaLabel}
      p="6px"
      rounded="md"
      color="gray.600"
      _hover={{ bg: "#eef2ee" }}
      border="1px solid"
      borderColor="transparent"
      onClick={onClick}
    >
      <Icon as={icon} boxSize={4} />
    </Box>
  );
}

function ResultPill({ label, value }: { label: string; value: string }) {
  return (
    <VStack
      bg="white"
      border="1px solid"
      borderColor="#E8ECE7"
      rounded="xl"
      p={3}
      spacing={1}
      align="stretch"
    >
      <Text fontSize="xs" color="gray.600">
        {label}
      </Text>
      <Text fontWeight="bold">{value}</Text>
    </VStack>
  );
}

function sumField(results: any[], key: string): string {
  const s = results.reduce((acc, r) => acc + (toNum(r?.[key]) || 0), 0);
  return Number(s).toLocaleString("fr-CA", { maximumFractionDigits: 3 });
}

// ✅ default export (so `import Source33A1Form from ...` works)
export default Source33A1Form;
