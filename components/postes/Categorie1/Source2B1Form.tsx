import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  GridItem,
  Input,
  Button,
  Select,
  HStack,
  IconButton,
  Spinner,
  Text,
  useToast,
  VStack,
  Badge,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { RepeatIcon, AddIcon, DeleteIcon, CopyIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { Lock, Calendar, Truck, MapPin, Hash } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";

/** =======================
 * Poste 2 · Source 2B1
 * SAME DESIGN (cards + header bar + pill inputs + results cards)
 * ======================= */

type B1Row = {
  vehicle: string;
  year: string;
  make: string;
  model: string;
  trans: string;
  distance: string; // km
  type: string; // lookup key (fuel/vehicle type)
  cons: string; // L/100km (or blank for EV)
  estimate: string; // either Estimation [L] OR kWh for EV
  reference: string;
  ac: string;
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

type SourceB1FormProps = {
  b1Rows?: B1Row[];
  setB1Rows: (rows: B1Row[]) => void;
  addB1Row: () => void;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults?: (results: GesResult[]) => void;
};

type FleetVehicle = {
  details?: string;
  annee?: string;
  marque?: string;
  modele?: string;
  transmission?: string;
  distance_km?: string;
  type_carburant?: string;
  conso_l_100km?: string;
  clim?: string;
};

/* ---------------- helpers ---------------- */

const toNum = (x: any, fallback = 0) => {
  if (x === "" || x == null) return fallback;
  const n =
    typeof x === "number"
      ? x
      : Number(String(x).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const looksElectric = (typeStr: string) => {
  const t = norm(typeStr);
  return t.includes("electrique") || t.includes("[kwh]") || t.includes("kwh") || t.includes("ev");
};

type MobileEF = {
  type_vehicule: string;
  carburant: string;
  unite: string;
  co2_g_unite: number;
  ch4_g_unite: number;
  n2o_g_unite: number;
  co2eq_g_unite: number;
  conversion_kwh_unite: number;
};

type ElecEF = {
  gco2_per_unit: number;
  gch4_per_unit: number;
  gn2o_per_unit: number;
  energy_kwh_per_unit: number;
};

type Refs = {
  byTypeVehicule: Record<string, MobileEF>;
  byCarburant: Record<string, MobileEF>;
  prpCO2: number;
  prpCH4: number;
  prpN2O: number;
  elec: ElecEF | null;
};

/* ---------------- design tokens ---------------- */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

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

const fmt = (n: any, max = 3) =>
  Number(toNum(n, 0)).toLocaleString("fr-CA", { maximumFractionDigits: max });

export function SourceB1Form({
  b1Rows = [],
  setB1Rows,
  addB1Row,
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: SourceB1FormProps) {
  const toast = useToast();

  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refs, setRefs] = useState<Refs | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Prefill
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, "2B1", { rows: [] });

  useEffect(() => {
    if (Array.isArray((prefillData as any)?.rows) && (prefillData as any).rows.length) {
      setB1Rows((prefillData as any).rows as B1Row[]);
    }
    if (prefillResults && typeof setGesResults === "function") {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults]);

  // Load refs
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

        const { data: mobRows, error: mobErr } = await supabase
          .from("equipements_mobiles")
          .select(
            "type_vehicule,carburant,unite,conversion_kwh_unite,co2_g_unite,ch4_g_unite,n2o_g_unite,co2eq_g_unite"
          );
        if (mobErr) throw mobErr;

        const byTypeVehicule: Record<string, MobileEF> = {};
        const byCarburant: Record<string, MobileEF> = {};

        (mobRows ?? []).forEach((r: any) => {
          const tv = String(r?.type_vehicule ?? "").trim();
          const carb = String(r?.carburant ?? "").trim();
          const unit = String(r?.unite ?? "").trim();
          if (!tv && !carb) return;

          const ef: MobileEF = {
            type_vehicule: tv,
            carburant: carb,
            unite: unit,
            conversion_kwh_unite: toNum(r?.conversion_kwh_unite, 0),
            co2_g_unite: toNum(r?.co2_g_unite, 0),
            ch4_g_unite: toNum(r?.ch4_g_unite, 0),
            n2o_g_unite: toNum(r?.n2o_g_unite, 0),
            co2eq_g_unite: toNum(r?.co2eq_g_unite, 0),
          };

          if (tv) byTypeVehicule[norm(tv)] = ef;
          if (carb) {
            byCarburant[norm(carb)] = ef;
            if (unit) byCarburant[norm(`${carb} [${unit}]`)] = ef;
          }
        });

        const { data: efRows, error: efErr } = await supabase
          .from("emission_factors")
          .select("label,unit,gco2_per_unit,gch4_per_unit,gn2o_per_unit,energy_kwh_per_unit")
          .ilike("label", "%élect%")
          .limit(50);
        if (efErr) throw efErr;

        const pick = (efRows ?? []).find((r: any) => norm(r?.unit) === "kwh") || null;
        const elec: ElecEF | null = pick
          ? {
              gco2_per_unit: toNum(pick.gco2_per_unit, 0),
              gch4_per_unit: toNum(pick.gch4_per_unit, 0),
              gn2o_per_unit: toNum(pick.gn2o_per_unit, 0),
              energy_kwh_per_unit: toNum(pick.energy_kwh_per_unit, 1),
            }
          : null;

        setRefs({ byTypeVehicule, byCarburant, prpCO2, prpCH4, prpN2O, elec });
      } catch (e) {
        console.error("2B1 refs load error:", e);
        setRefs({
          byTypeVehicule: {},
          byCarburant: {},
          prpCO2: 1,
          prpCH4: 0,
          prpN2O: 0,
          elec: null,
        });
      }
    })();
  }, []);

  // Fleet load
  const normalizeFleet = (arr: any[]): FleetVehicle[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((v: any) => ({
      details: v.details ?? v.nom ?? "",
      annee: v.annee ?? "",
      marque: v.marque ?? "",
      modele: v.modele ?? "",
      transmission: v.transmission ?? "",
      distance_km: v.distance_km ?? "",
      type_carburant: v.type_carburant ?? v.type ?? "",
      conso_l_100km: v.conso_l_100km ?? "",
      clim: v.clim ?? "",
    }));
  };

  const loadFleet = async () => {
    try {
      setLoadingFleet(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const uid = userRes?.user?.id;
      if (!uid) {
        toast({ status: "warning", title: "Utilisateur non connecté." });
        return;
      }

      const { data: profile, error: profErr } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", uid)
        .single();
      if (profErr) throw profErr;

      const companyId = profile?.company_id;
      if (!companyId) {
        toast({ status: "error", title: "Impossible de trouver la compagnie de l'utilisateur." });
        return;
      }

      const { data: company, error: compErr } = await supabase
        .from("companies")
        .select("vehicle_fleet")
        .eq("id", companyId)
        .single();
      if (compErr) throw compErr;

      setFleet(normalizeFleet((company as any)?.vehicle_fleet ?? []));
    } catch (err: any) {
      console.error(err);
      toast({
        status: "error",
        title: "Erreur de chargement des véhicules",
        description: err.message ?? String(err),
      });
      setFleet([]);
    } finally {
      setLoadingFleet(false);
    }
  };

  useEffect(() => {
    loadFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Row ops
  const updateRow = (idx: number, patch: Partial<B1Row>) => {
    setB1Rows(b1Rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const duplicateRow = (idx: number) => {
    const row = b1Rows[idx];
    if (!row) return;
    const next = [...b1Rows];
    next.splice(idx + 1, 0, { ...row });
    setB1Rows(next);
  };

  const removeRow = (idx: number) => setB1Rows(b1Rows.filter((_, i) => i !== idx));

  const onSelectVehicle = (rowIdx: number, detailsValue: string) => {
    const v = fleet.find((fv) => (fv.details ?? "") === detailsValue);
    const current = b1Rows[rowIdx] || ({} as B1Row);

    updateRow(rowIdx, {
      vehicle: detailsValue,
      year: v?.annee ?? current.year ?? "",
      make: v?.marque ?? current.make ?? "",
      model: v?.modele ?? current.model ?? "",
      trans: v?.transmission ?? current.trans ?? "",
      type: v?.type_carburant ?? current.type ?? "",
      cons: v?.conso_l_100km ?? current.cons ?? "",
      distance: current.distance ?? "",
      estimate: current.estimate ?? "",
      reference: current.reference ?? "",
      ac: (v?.clim as string) ?? current.ac ?? "",
    });
  };

  // Compute
  const computeResults = (rows: B1Row[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    return (rows || []).map((r) => {
      const keyRaw = String(r.type ?? "").trim();
      const isEV = looksElectric(keyRaw);

      const est = toNum(r.estimate, 0);
      const dist = toNum(r.distance, 0);
      const cons = toNum(r.cons, 0);

      const W_fuel = isEV ? 0 : est > 0 ? est : dist > 0 && cons > 0 ? (dist * cons) / 100 : 0;
      const AA_kwh = isEV ? (est > 0 ? est : 0) : 0;

      const k = norm(keyRaw);
      const ef =
        rf.byTypeVehicule[k] ||
        rf.byCarburant[k] ||
        (() => {
          const tvKey = Object.keys(rf.byTypeVehicule).find(
            (kk) => kk === k || kk.includes(k) || k.includes(kk)
          );
          if (tvKey) return rf.byTypeVehicule[tvKey];
          const cKey = Object.keys(rf.byCarburant).find(
            (kk) => kk === k || kk.includes(k) || k.includes(kk)
          );
          return cKey ? rf.byCarburant[cKey] : undefined;
        })();

      let co2_fuel = 0,
        ch4_fuel = 0,
        n2o_fuel = 0,
        energy_fuel_kwh = 0;

      if (ef && W_fuel > 0) {
        const hasGas =
          (ef.co2_g_unite ?? 0) !== 0 ||
          (ef.ch4_g_unite ?? 0) !== 0 ||
          (ef.n2o_g_unite ?? 0) !== 0;

        if (hasGas) {
          co2_fuel = ef.co2_g_unite * W_fuel * rf.prpCO2;
          ch4_fuel = ef.ch4_g_unite * W_fuel * rf.prpCH4;
          n2o_fuel = ef.n2o_g_unite * W_fuel * rf.prpN2O;
        } else {
          co2_fuel = ef.co2eq_g_unite * W_fuel;
        }
        energy_fuel_kwh = ef.conversion_kwh_unite * W_fuel;
      }

      let co2_elec = 0,
        ch4_elec = 0,
        n2o_elec = 0;
      if (AA_kwh > 0 && rf.elec) {
        co2_elec = rf.elec.gco2_per_unit * AA_kwh * rf.prpCO2;
        ch4_elec = rf.elec.gch4_per_unit * AA_kwh * rf.prpCH4;
        n2o_elec = rf.elec.gn2o_per_unit * AA_kwh * rf.prpN2O;
      }

      const co2 = co2_fuel + co2_elec;
      const ch4 = ch4_fuel + ch4_elec;
      const n2o = n2o_fuel + n2o_elec;

      const total_g = co2 + ch4 + n2o;
      const total_t = total_g / 1e6;

      return {
        total_co2_gco2e: co2,
        total_ges_ch4_gco2e: ch4,
        total_ges_n2o_gco2e: n2o,
        total_ges_gco2e: total_g,
        total_ges_tco2e: total_t,
        total_energie_kwh: energy_fuel_kwh + AA_kwh,
      };
    });
  };

  const computed = useMemo(() => computeResults(b1Rows, refs), [b1Rows, refs]);

  useEffect(() => {
    setGesResults?.(computed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed]);

  const validateRows = (rows: B1Row[]) => {
    if (!rows.length) return false;
    return rows.every((r) => {
      const hasEstimate = String(r.estimate ?? "").trim() !== "";
      const hasDistCons =
        String(r.distance ?? "").trim() !== "" && String(r.cons ?? "").trim() !== "";
      return hasEstimate || hasDistCons;
    });
  };

  const handle2B1Submit = async () => {
    if (!posteSourceId || !userId) {
      toast({
        status: "error",
        title: "Champs requis manquants",
        description: "posteSourceId ou userId",
      });
      return;
    }
    if (!validateRows(b1Rows)) {
      toast({
        status: "warning",
        title: "Validation",
        description: "Chaque ligne doit avoir une estimation OU (distance et conso).",
      });
      return;
    }
    if (!refs) {
      toast({
        status: "error",
        title: "Références non chargées",
        description: "equipements_mobiles / PRP",
      });
      return;
    }

    setSubmitting(true);

    const dbPayload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 2,
      source_code: "2B1",
      data: { rows: b1Rows },
      results: computed,
    };

    try {
      const dbResponse = await fetch("/api/2submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        toast({
          status: "error",
          title: "Erreur base de données",
          description: dbResult.error || "Sauvegarde échouée.",
        });
      } else {
        setGesResults?.(computed);
        toast({ status: "success", title: "2B1 calculé et sauvegardé" });
      }
    } catch {
      toast({
        status: "error",
        title: "Erreur inattendue",
        description: "Échec lors de la sauvegarde.",
      });
    }

    setSubmitting(false);
  };

  // Totals recap
  const totals = useMemo(() => {
    const sum = (k: keyof GesResult) =>
      (computed || []).reduce((acc, r) => acc + toNum((r as any)?.[k], 0), 0);

    return {
      total_co2_gco2e: sum("total_co2_gco2e"),
      total_ges_ch4_gco2e: sum("total_ges_ch4_gco2e"),
      total_ges_n2o_gco2e: sum("total_ges_n2o_gco2e"),
      total_ges_gco2e: sum("total_ges_gco2e"),
      total_ges_tco2e: sum("total_ges_tco2e"),
      total_energie_kwh: sum("total_energie_kwh"),
    };
  }, [computed]);

  return (
    <Box bg={FIGMA.bg} p={{ base: 4, md: 6 }} rounded="2xl" animation={`${fadeInUp} 0.6s ease-out`}>
      {/* Header card */}
      <Box bg="white" p={6} rounded="xl" mb={6} boxShadow={FIGMA.cardShadow}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <VStack align="flex-start" spacing={2}>
            <HStack spacing={2}>
              <Box w="4px" h="24px" bg={FIGMA.green} borderRadius="full" />
              <Badge
                bg={FIGMA.greenSoft}
                color={FIGMA.green}
                fontSize="xs"
                px={3}
                py={1}
                rounded="full"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Poste 2 · Source 2B1
              </Badge>
            </HStack>

            <Text fontWeight={700} fontSize={{ base: "xl", md: "2xl" }} color={FIGMA.text}>
              Véhicules – Estimation carburant / kWh (2B1)
            </Text>

            <HStack spacing={3} flexWrap="wrap">
              <Text fontSize="sm" color={FIGMA.muted}>
                {b1Rows?.length || 0} ligne(s)
              </Text>

              {(prefillLoading || loadingFleet) && (
                <HStack spacing={2} color={FIGMA.muted}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">
                    {prefillLoading ? "Chargement…" : "Chargement flotte…"}
                  </Text>
                </HStack>
              )}

              {prefillError && (
                <Text fontSize="sm" color="red.500">
                  Préchargement: {String(prefillError)}
                </Text>
              )}
            </HStack>
          </VStack>

          <HStack spacing={2}>
            <IconButton
              aria-label="Rafraîchir la flotte"
              icon={<RepeatIcon />}
              size="sm"
              variant="ghost"
              color={FIGMA.muted}
              _hover={{ color: FIGMA.green, bg: FIGMA.greenSoft }}
              onClick={loadFleet}
            />
            <IconButton
              aria-label={collapsed ? "Développer" : "Réduire"}
              icon={collapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
              size="sm"
              variant="ghost"
              color={FIGMA.muted}
              _hover={{ color: FIGMA.green, bg: FIGMA.greenSoft }}
              onClick={() => setCollapsed((v) => !v)}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Main card */}
      <Box bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow}>
        {collapsed ? (
          <Text color={FIGMA.muted}>Section réduite.</Text>
        ) : (
          <VStack align="stretch" spacing={5}>
            {/* Header bar (desktop) */}
            <Box
              bg={`linear-gradient(135deg, ${FIGMA.green} 0%, ${FIGMA.greenLight} 100%)`}
              color="white"
              h="50px"
              rounded="xl"
              px={6}
              display={{ base: "none", xl: "flex" }}
              alignItems="center"
              boxShadow="0 2px 8px rgba(52, 78, 65, 0.2)"
            >
              <Grid
                w="full"
                templateColumns="1.8fr 1fr 1.2fr 1fr .9fr 140px"
                columnGap={5}
                alignItems="center"
              >
                <HStack justify="center" spacing={2}><Icon as={Truck} boxSize={4} /><Text fontWeight={600} fontSize="14px">Véhicule</Text></HStack>
                <Text textAlign="center" fontWeight={600} fontSize="14px">Distance</Text>
                <Text textAlign="center" fontWeight={600} fontSize="14px">Estimation</Text>
                <Text textAlign="center" fontWeight={600} fontSize="14px">Référence</Text>
                <Text textAlign="center" fontWeight={600} fontSize="14px">Clim</Text>
                <Text textAlign="right" fontWeight={600} fontSize="14px">Actions</Text>
              </Grid>
            </Box>

            {/* Rows */}
            <VStack align="stretch" spacing={4}>
              {(b1Rows || []).map((row, idx) => (
                <Box
                  key={idx}
                  bg={FIGMA.bg}
                  rounded="xl"
                  p={4}
                  border="2px solid"
                  borderColor={FIGMA.border}
                  transition="all 0.3s"
                  _hover={{ borderColor: FIGMA.green }}
                >
                  <Grid
                    templateColumns={{
                      base: "1fr",
                      xl: "1.8fr 1fr 1.2fr 1fr .9fr 140px",
                    }}
                    columnGap={4}
                    rowGap={3}
                    alignItems="center"
                  >
                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                        Véhicule
                      </Text>
                      <FigmaSelect
                        value={row.vehicle || ""}
                        placeholder={loadingFleet ? "Chargement…" : fleet.length ? "Choisir un véhicule" : "Aucun véhicule"}
                        disabled={loadingFleet || fleet.length === 0}
                        onChange={(v) => onSelectVehicle(idx, v)}
                        options={fleet.map((v, i) => ({
                          value: v.details ?? "",
                          label: v.details ?? `(Sans nom ${i + 1})`,
                        }))}
                      />
                    </GridItem>

                    <GridItem><Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">Distance (km)</Text><FigmaInput value={row.distance} onChange={(v) => updateRow(idx, { distance: v })} placeholder="km" type="number" center /></GridItem>

                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
                        Estimation
                      </Text>
                      <FigmaInput
                        value={row.estimate}
                        onChange={(v) => updateRow(idx, { estimate: v })}
                        placeholder="L (ou kWh EV)"
                        type="number"
                        center
                      />
                    </GridItem>

                    <GridItem><Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">Reference</Text><FigmaInput value={row.reference} onChange={(v) => updateRow(idx, { reference: v })} placeholder="RÃ©fÃ©rence" /></GridItem>
                    <GridItem><Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">Climatisation</Text><FigmaInput value={row.ac} onChange={(v) => updateRow(idx, { ac: v })} placeholder="Oui/Non" center /></GridItem>

                    <GridItem>
                      <HStack justify="flex-end" spacing={1}>
                        <IconButton
                          aria-label="Verrouiller"
                          icon={<Icon as={Lock} boxSize={4} />}
                          variant="ghost"
                          color={FIGMA.muted}
                          size="sm"
                          _hover={{ bg: FIGMA.greenSoft, color: FIGMA.green }}
                        />
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

                  {/* Inline row recap */}
                  <HStack mt={3} justify="flex-end" spacing={3} flexWrap="wrap">
                    <Box
                      px={4}
                      py={2}
                      rounded="full"
                      bg="white"
                      border="1px solid"
                      borderColor={FIGMA.border}
                      boxShadow={FIGMA.inputShadow}
                    >
                      <Text fontSize="sm" color={FIGMA.text}>
                        Total ligne (tCO₂e): <b>{fmt((computed[idx] as any)?.total_ges_tco2e ?? 0, 6)}</b>
                      </Text>
                    </Box>
                    <Box
                      px={4}
                      py={2}
                      rounded="full"
                      bg="white"
                      border="1px solid"
                      borderColor={FIGMA.border}
                      boxShadow={FIGMA.inputShadow}
                    >
                      <Text fontSize="sm" color={FIGMA.text}>
                        Énergie (kWh): <b>{fmt((computed[idx] as any)?.total_energie_kwh ?? 0, 3)}</b>
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              ))}

              {(!b1Rows || b1Rows.length === 0) && (
                <Box p={4} textAlign="center" color={FIGMA.muted}>
                  Aucune ligne. Cliquez sur “Ajouter une ligne” pour commencer.
                </Box>
              )}
            </VStack>

            {/* Footer actions */}
            <HStack pt={2} spacing={4} flexWrap="wrap">
              <Button
                leftIcon={<AddIcon />}
                variant="outline"
                borderColor={FIGMA.green}
                color={FIGMA.green}
                rounded="full"
                h="44px"
                px={6}
                onClick={addB1Row}
                fontWeight={600}
                _hover={{ bg: FIGMA.greenSoft, borderColor: FIGMA.green }}
              >
                Ajouter une ligne
              </Button>

              <Button
                bg={FIGMA.green}
                color="white"
                rounded="full"
                h="44px"
                px={8}
                boxShadow={FIGMA.buttonShadow}
                _hover={{
                  bg: FIGMA.greenLight,
                  transform: "translateY(-2px)",
                  boxShadow: FIGMA.hoverShadow,
                }}
                _active={{ transform: "translateY(0)" }}
                onClick={handle2B1Submit}
                isLoading={submitting}
                loadingText="Sauvegarde…"
                fontWeight={600}
              >
                Calculer et soumettre
              </Button>
            </HStack>
          </VStack>
        )}
      </Box>

      {/* Results recap */}
      <Box mt={6} bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow} animation={`${fadeInUp} 0.6s ease-out`}>
        <Text fontWeight={700} color={FIGMA.text} fontSize="lg" mb={4}>
          Calculs et résultats (récapitulatif)
        </Text>

        {computed && computed.length > 0 ? (
          <Grid templateColumns={{ base: "1fr", md: "repeat(auto-fit, minmax(220px, 1fr))" }} gap={6}>
            <ResultCard label="CO₂ [gCO₂e]" value={fmt(totals.total_co2_gco2e)} />
            <ResultCard label="CH₄ [gCO₂e]" value={fmt(totals.total_ges_ch4_gco2e)} />
            <ResultCard label="N₂O [gCO₂e]" value={fmt(totals.total_ges_n2o_gco2e)} />
            <ResultCard label="Total [gCO₂e]" value={fmt(totals.total_ges_gco2e)} />
            <ResultCard label="Total [tCO₂e]" value={fmt(totals.total_ges_tco2e, 6)} />
            <ResultCard label="Énergie [kWh]" value={fmt(totals.total_energie_kwh)} />
          </Grid>
        ) : (
          <Text color={FIGMA.muted}>Aucun résultat à afficher.</Text>
        )}
      </Box>
    </Box>
  );
}

/* ================= UI helpers ================= */

function FigmaInput({
  value,
  onChange,
  placeholder,
  type = "text",
  center,
}: {
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
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      isDisabled={disabled}
      h="42px"
      rounded="lg"
      bg="white"
      borderColor={FIGMA.border}
      boxShadow={FIGMA.inputShadow}
      fontSize="14px"
      color={FIGMA.text}
      _placeholder={{ color: FIGMA.muted }}
      _focus={{
        borderColor: FIGMA.green,
        boxShadow: `0 0 0 1px ${FIGMA.green}`,
      }}
      transition="all 0.2s"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: any;
}) {
  return (
    <Box>
      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500">
        {label}
      </Text>
      {children}
    </Box>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
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
      <Text fontSize="xs" color={FIGMA.muted} mb={2} textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight={700} color={FIGMA.green}>
        {value}
      </Text>
    </Box>
  );
}

export default SourceB1Form;

// import { useEffect, useState } from 'react';
// import {
//   Box,
//   Heading,
//   Grid,
//   GridItem,
//   Input,
//   Button,
//   Select,
//   HStack,
//   IconButton,
//   Spinner,
//   Text,
//   useToast,
//   VStack,
//   useColorModeValue,
//   Icon,
// } from '@chakra-ui/react';
// import { RepeatIcon } from '@chakra-ui/icons';
// import { Copy, Trash2, Lock } from 'lucide-react';
// import { supabase } from '../../../lib/supabaseClient';
// import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

// type B1Row = {
//   vehicle: string;
//   year: string;
//   make: string;
//   model: string;
//   trans: string;
//   distance: string;
//   type: string;
//   cons: string;
//   estimate: string;
//   reference: string;
//   ac: string;
// };

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// type SourceB1FormProps = {
//   b1Rows?: B1Row[];
//   setB1Rows: (rows: B1Row[]) => void;
//   addB1Row: () => void;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults?: (results: GesResult[]) => void;
//   highlight?: string;
//   tableBg?: string;
// };

// type FleetVehicle = {
//   details?: string;
//   annee?: string;
//   marque?: string;
//   modele?: string;
//   transmission?: string;
//   distance_km?: string;
//   type_carburant?: string;
//   conso_l_100km?: string;
//   nom?: string;
//   type?: string;
//   clim?: string;
// };

// export function SourceB1Form({
//   b1Rows = [],
//   setB1Rows,
//   addB1Row,
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
// }: SourceB1FormProps) {
//   const toast = useToast();
//   const [companyId, setCompanyId] = useState<string | null>(null);
//   const [fleet, setFleet] = useState<FleetVehicle[]>([]);
//   const [loadingFleet, setLoadingFleet] = useState<boolean>(true);
//   const [submitting, setSubmitting] = useState<boolean>(false);

//   const inputBorder = useColorModeValue('#E8ECE7', '#2f3a36');
//   const faintLine = useColorModeValue('rgba(0,0,0,0.12)', 'rgba(255,255,255,0.12)');
//   const headerFg = 'white';

//   // ===== Prefill from /api/get-source (poste 2, source 2B1) =====
//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource(userId, 2, '2B1', { rows: [] });

//   useEffect(() => {
//     if (Array.isArray(prefillData?.rows) && prefillData.rows.length) {
//       setB1Rows(prefillData.rows as B1Row[]);
//     }
//     if (prefillResults && typeof setGesResults === 'function') {
//       const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults]);

//   // ===== Fleet loading =====
//   const normalizeFleet = (arr: any[]): FleetVehicle[] => {
//     if (!Array.isArray(arr)) return [];
//     return arr.map((v: any) => ({
//       details: v.details ?? v.nom ?? '',
//       annee: v.annee ?? '',
//       marque: v.marque ?? '',
//       modele: v.modele ?? '',
//       transmission: v.transmission ?? '',
//       distance_km: v.distance_km ?? '',
//       type_carburant: v.type_carburant ?? v.type ?? '',
//       conso_l_100km: v.conso_l_100km ?? '',
//       clim: v.clim ?? '',
//     }));
//   };

//   const loadFleet = async () => {
//     try {
//       setLoadingFleet(true);
//       const { data: userRes, error: userErr } = await supabase.auth.getUser();
//       if (userErr) throw userErr;
//       const user = userRes?.user;
//       if (!user?.id) {
//         toast({ status: 'warning', title: 'Utilisateur non connecté.' });
//         return;
//       }

//       const { data: profile, error: profErr } = await supabase
//         .from('user_profiles')
//         .select('company_id')
//         .eq('id', user.id)
//         .single();
//       if (profErr) throw profErr;
//       if (!profile?.company_id) {
//         toast({ status: 'error', title: "Impossible de trouver la compagnie de l'utilisateur." });
//         return;
//       }
//       setCompanyId(profile.company_id);

//       const { data: company, error: compErr } = await supabase
//         .from('companies')
//         .select('vehicle_fleet')
//         .eq('id', profile.company_id)
//         .single();
//       if (compErr) throw compErr;

//       setFleet(normalizeFleet(company?.vehicle_fleet ?? []));
//     } catch (err: any) {
//       console.error(err);
//       toast({
//         status: 'error',
//         title: 'Erreur de chargement des véhicules',
//         description: err.message ?? String(err),
//       });
//       setFleet([]);
//     } finally {
//       setLoadingFleet(false);
//     }
//   };

//   useEffect(() => {
//     loadFleet();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ===== Row helpers =====
//   const updateRow = (idx: number, patch: Partial<B1Row>) => {
//     setB1Rows(
//       b1Rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
//     );
//   };

// const duplicateRow = (idx: number) => {
//   const row = b1Rows[idx];
//   if (!row) return;

//   const next = [...b1Rows];
//   next.splice(idx + 1, 0, { ...row });
//   setB1Rows(next);
// };

// const removeRow = (idx: number) => {
//   const next = b1Rows.filter((_, i) => i !== idx);
//   setB1Rows(next);
// };


//   // When a vehicle is selected from dropdown, fill other fields
//   const onSelectVehicle = (rowIdx: number, detailsValue: string) => {
//     const v = fleet.find((fv) => (fv.details ?? '') === detailsValue);
//     const current = b1Rows[rowIdx] || ({} as B1Row);
//     updateRow(rowIdx, {
//       vehicle: detailsValue,
//       year: v?.annee ?? current.year ?? '',
//       make: v?.marque ?? current.make ?? '',
//       model: v?.modele ?? current.model ?? '',
//       trans: v?.transmission ?? current.trans ?? '',
//       type: v?.type_carburant ?? current.type ?? '',
//       cons: v?.conso_l_100km ?? current.cons ?? '',
//       distance: current.distance ?? '',
//       estimate: current.estimate ?? '',
//       reference: current.reference ?? '',
//       ac: (v?.clim as string) ?? current.ac ?? '',
//     });
//   };

//   // Validation
//   const validateRows = (rows: B1Row[]) => {
//     if (!rows.length) return false;
//     return rows.every(r => {
//       const hasEstimate = String(r.estimate ?? '').trim() !== '';
//       const hasDistCons =
//         String(r.distance ?? '').trim() !== '' && String(r.cons ?? '').trim() !== '';
//       return hasEstimate || hasDistCons;
//     });
//   };

//   // Submit
//   const handle2B1Submit = async () => {
//     if (!posteSourceId || !userId) {
//       toast({
//         status: 'error',
//         title: 'Champs requis manquants',
//         description: 'posteSourceId ou userId',
//       });
//       return;
//     }
//     if (!validateRows(b1Rows)) {
//       toast({
//         status: 'warning',
//         title: 'Validation',
//         description: 'Chaque ligne doit avoir une estimation OU (distance et conso).',
//       });
//       return;
//     }

//     setSubmitting(true);
//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       poste_num: 2,
//       source_code: '2B1',
//       data: { rows: b1Rows },
//     };

//     let results: GesResult[] = [];
//     let webhookOk = false;

//     try {
//       const r = await fetch(
//         'https://allposteswebhook-129138384907.us-central1.run.app/submit/2B1',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(payload),
//         },
//       );
//       const j = await r.json();
//       if (!r.ok || !j.ok) {
//         toast({
//           status: 'error',
//           title: 'Erreur Cloud Run',
//           description: j.error || 'Calcul GES échoué.',
//         });
//       } else {
//         results = Array.isArray(j.results) ? j.results : [];
//         webhookOk = true;
//       }
//     } catch {
//       toast({
//         status: 'error',
//         title: 'Erreur réseau',
//         description: 'Impossible de joindre le service Cloud Run.',
//       });
//     }

//     try {
//       const dbPayload = { ...payload, results };
//       const dbResponse = await fetch('/api/2submit', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(dbPayload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         toast({
//           status: 'error',
//           title: 'Erreur base de données',
//           description: dbResult.error || 'Sauvegarde échouée.',
//         });
//       } else {
//         setGesResults?.(results);
//         toast({
//           status: 'success',
//           title: webhookOk
//             ? '2B1 calculé et sauvegardé'
//             : '2B1 sauvegardé (sans calcul Cloud Run)',
//         });
//       }
//     } catch {
//       toast({
//         status: 'error',
//         title: 'Erreur inattendue',
//         description: 'Échec lors de la sauvegarde.',
//       });
//     }

//     setSubmitting(false);
//   };

//   return (
//     <VStack align="stretch" spacing={4}>
//       {/* Title + status bar */}
//       <HStack justify="space-between" align="flex-start">
//         <Heading
//           as="h3"
//           size="md"
//           color={highlight}
//           pb={2}
//           borderBottom="1px solid"
//           borderColor={`${highlight}30`}
//         >
//           Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
//         </Heading>

//         <HStack spacing={3} align="center">
//           {(prefillLoading || loadingFleet) && (
//             <HStack spacing={2} color="gray.500">
//               <Spinner size="sm" />
//               <Text fontSize="sm">
//                 {prefillLoading
//                   ? 'Chargement des données enregistrées…'
//                   : 'Chargement des véhicules…'}
//               </Text>
//             </HStack>
//           )}
//           {prefillError && (
//             <Text fontSize="sm" color="red.500">
//               Erreur de préchargement : {prefillError}
//             </Text>
//           )}
//           <IconButton
//             aria-label="Rafraîchir la flotte"
//             icon={<RepeatIcon />}
//             size="sm"
//             variant="ghost"
//             onClick={loadFleet}
//           />
//         </HStack>
//       </HStack>

//       {/* Header row (same style as 2A3) */}
//       <Grid
//         templateColumns="2fr 0.8fr 1.1fr 1.1fr 1.1fr 1.1fr 1.2fr 1.1fr 1.1fr 1.2fr 0.9fr 96px"
//         bg={highlight}
//         color={headerFg}
//         fontWeight={600}
//         fontSize="sm"
//         alignItems="center"
//         px={4}
//         py={3}
//         rounded="lg"
//       >
//         <GridItem>Véhicule (flotte)</GridItem>
//         <GridItem>Année</GridItem>
//         <GridItem>Marque</GridItem>
//         <GridItem>Modèle</GridItem>
//         <GridItem>Transmission</GridItem>
//         <GridItem>Distance [km]</GridItem>
//         <GridItem>Type carburant</GridItem>
//         <GridItem>Conso [L/100km]</GridItem>
//         <GridItem>Estimation [L]</GridItem>
//         <GridItem>Référence</GridItem>
//         <GridItem>Climatisation</GridItem>
//         <GridItem textAlign="right">Actions</GridItem>
//       </Grid>

//       {/* Rows */}
//       <VStack
//         spacing={0}
//         bg={tableBg}
//         rounded="xl"
//         border="1px solid"
//         borderColor={inputBorder}
//         overflow="hidden"
//       >
//         {(b1Rows || []).map((row, idx) => (
//           <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
//             <Grid
//               templateColumns="2fr 0.8fr 1.1fr 1.1fr 1.1fr 1.1fr 1.2fr 1.1fr 1.1fr 1.2fr 0.9fr 96px"
//               gap={3}
//               alignItems="center"
//               px={1}
//             >
//               {/* Vehicle from fleet */}
//               <GridItem>
//                 <PillSelect
//                   placeholder={
//                     loadingFleet
//                       ? 'Chargement…'
//                       : fleet.length
//                       ? 'Choisir un véhicule'
//                       : 'Aucun véhicule'
//                   }
//                   value={row.vehicle || ''}
//                   onChange={(v: string) => onSelectVehicle(idx, v)}
//                   inputBorder={inputBorder}
//                   disabled={loadingFleet || fleet.length === 0}
//                 >
//                   {fleet.map((v, i) => (
//                     <option key={`${v.details}-${i}`} value={v.details ?? ''}>
//                       {v.details ?? '(Sans nom)'}
//                     </option>
//                   ))}
//                 </PillSelect>
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Année"
//                   value={row.year}
//                   onChange={(v: string) => updateRow(idx, { year: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Marque"
//                   value={row.make}
//                   onChange={(v: string) => updateRow(idx, { make: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Modèle"
//                   value={row.model}
//                   onChange={(v: string) => updateRow(idx, { model: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Transmission"
//                   value={row.trans}
//                   onChange={(v: string) => updateRow(idx, { trans: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Distance [km]"
//                   value={row.distance}
//                   onChange={(v: string) => updateRow(idx, { distance: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Type carburant"
//                   value={row.type}
//                   onChange={(v: string) => updateRow(idx, { type: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Conso [L/100km]"
//                   value={row.cons}
//                   onChange={(v: string) => updateRow(idx, { cons: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Estimation [L]"
//                   value={row.estimate}
//                   onChange={(v: string) => updateRow(idx, { estimate: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Référence"
//                   value={row.reference}
//                   onChange={(v: string) => updateRow(idx, { reference: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               <GridItem>
//                 <PillInput
//                   placeholder="Oui / Non"
//                   value={row.ac}
//                   onChange={(v: string) => updateRow(idx, { ac: v })}
//                   inputBorder={inputBorder}
//                 />
//               </GridItem>

//               {/* Actions */}
//               <GridItem>
//                 <HStack spacing={2} justify="flex-end" pr={1}>
//                   <MiniIconBtn icon={Lock} ariaLabel="Verrouiller" />
//                   <MiniIconBtn
//                     icon={Copy}
//                     ariaLabel="Dupliquer"
//                     onClick={() => duplicateRow(idx)}
//                   />
//                   <MiniIconBtn
//                     icon={Trash2}
//                     ariaLabel="Supprimer"
//                     onClick={() => removeRow(idx)}
//                   />
//                 </HStack>
//               </GridItem>
//             </Grid>

//             {/* Per-row result line (like 2A3) */}
//             <HStack spacing={3} align="center" px={1} py={3}>
//               <Text ml="auto" fontSize="sm" color="gray.600">
//                 <strong>{formatResult(gesResults[idx])}</strong>
//               </Text>
//             </HStack>

//             <Box h="2px" bg={faintLine} mx={2} rounded="full" />
//           </Box>
//         ))}

//         {/* Placeholder row */}
//         {(!b1Rows || b1Rows.length === 0) && (
//           <Box p={4} textAlign="center" color="gray.500">
//             Aucune ligne. Cliquez sur « Ajouter une ligne » pour commencer.
//           </Box>
//         )}
//       </VStack>

//       {/* Footer buttons */}
//       <HStack pt={3} spacing={3}>
//         <Button
//           onClick={addB1Row}
//           leftIcon={<Icon as={Copy} boxSize={4} />}
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
//           onClick={handle2B1Submit}
//           colorScheme="blue"
//           rounded="full"
//           px={6}
//           h="44px"
//           isLoading={submitting}
//         >
//           Soumettre
//         </Button>
//       </HStack>

//       {/* Recap summary box (same style as 2A3) */}
//       {Array.isArray(gesResults) && gesResults.length > 0 && (
//         <Box mt={4} bg="#e5f2fa" rounded="xl" p={4} boxShadow="sm">
//           <Text fontWeight="bold" color={highlight} mb={2}>
//             Calculs et résultats (récapitulatif)
//           </Text>
//           <Grid templateColumns="repeat(6, 1fr)" gap={3} fontSize="sm">
//             <ResultPill label="CO₂ [gCO₂e]" value={sumField(gesResults, 'total_co2_gco2e')} />
//             <ResultPill label="CH₄ [gCO₂e]" value={sumField(gesResults, 'total_ges_ch4_gco2e')} />
//             <ResultPill label="N₂O [gCO₂e]" value={sumField(gesResults, 'total_ges_n2o_gco2e')} />
//             <ResultPill label="Total GES [gCO₂e]" value={sumField(gesResults, 'total_ges_gco2e')} />
//             <ResultPill label="Total GES [tCO₂e]" value={sumField(gesResults, 'total_ges_tco2e')} />
//             <ResultPill
//               label="Énergie [kWh]"
//               value={sumField(gesResults, 'total_energie_kwh')}
//             />
//           </Grid>
//         </Box>
//       )}
//     </VStack>
//   );
// }

// /* ===== UI helpers (same style as 2A3) ===== */
// function PillInput({
//   value,
//   onChange,
//   placeholder,
//   inputBorder,
//   full,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   inputBorder: string;
//   full?: boolean;
// }) {
//   return (
//     <Input
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
//       flex={full ? 1 : undefined}
//     />
//   );
// }

// function PillSelect({
//   value,
//   onChange,
//   placeholder,
//   inputBorder,
//   disabled,
//   children,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   inputBorder: string;
//   disabled?: boolean;
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
//       isDisabled={disabled}
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
//       _hover={{ bg: '#eef2ee' }}
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

// /* ===== Utils (same as 2A3) ===== */
// function sumField(results: GesResult[], key: keyof GesResult): string {
//   const s = results.reduce((acc, r) => acc + (toNum(r[key]) || 0), 0);
//   return formatNumber(s);
// }
// function toNum(v: unknown): number {
//   const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
//   return isFinite(n) ? n : 0;
// }
// function formatNumber(n: number): string {
//   return Number(n).toLocaleString('fr-CA', { maximumFractionDigits: 3 });
// }
// function formatResult(r?: GesResult): string {
//   if (!r) return '-';
//   const t = r.total_ges_tco2e ?? r.total_ges_gco2e ?? r.total_co2_gco2e ?? '-';
//   if (t === '-') return '-';
//   const n = toNum(t as any);
//   return n > 10_000
//     ? `${formatNumber(n)} gCO₂e`
//     : `${formatNumber(n)} ${String(t).includes('t') ? 'tCO₂e' : 'gCO₂e'}`;
// }
