import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Grid,
  GridItem,
  Text,
  Button,
  Icon,
  Input,
  Select,
  Spinner,
  Badge,
  Flex,
  IconButton,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { AddIcon, DeleteIcon, CopyIcon, ChevronDownIcon, ChevronUpIcon, RepeatIcon } from "@chakra-ui/icons";
import { Lock, Calendar, Truck, MapPin, Hash } from "lucide-react";
import VehicleSelect from "#components/vehicleselect/VehicleSelect";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
import { supabase } from "../../../lib/supabaseClient";
import { ReferenceSelect } from '../ReferenceSelect';

/** =======================
 * Poste 2 · Source 2A3
 * SAME DESIGN (cards + header bar + pill inputs + results cards)
 * ======================= */

export type A3Row = {
  vehicle: string;
  type: string; // lookup key
  date: string;
  cost: string; // "Nom du site"
  avgPrice: string; // "Commentaires"
  estimateQty: string; // distance
  reference: string;
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface Source2A3FormProps {
  a3Rows: A3Row[];
  setA3Rows: React.Dispatch<React.SetStateAction<A3Row[]>>;
  addA3Row: () => void;
  removeA3Row: (idx: number) => void;
  updateA3Row: (idx: number, key: keyof A3Row, value: string) => void;
  posteSourceId: string;
  userId: string;
  bilanId?: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
  highlight?: string; // kept for compatibility (not used)
  tableBg?: string; // kept for compatibility (not used)
}

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

type MobileEF = {
  co2_g_unite: number;
  ch4_g_unite: number;
  n2o_g_unite: number;
  co2eq_g_unite: number;
  conversion_kwh_unite: number; // energy factor
  carburant: string;
  unite: string;
  type_vehicule: string;
};

type Refs = {
  byTypeVehicule: Record<string, MobileEF>;
  byCarburant: Record<string, MobileEF>;
  prpCO2: number;
  prpCH4: number;
  prpN2O: number;
};

type FleetVehicle = {
  details?: string;
  type_carburant?: string;
};

/* ---------------- animations + figma tokens ---------------- */

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

export function Source2A3Form({
  a3Rows = [],
  setA3Rows,
  addA3Row,
  removeA3Row,
  updateA3Row,
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: Source2A3FormProps) {
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Refs | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(true);

  const loadFleet = async () => {
    try {
      setLoadingFleet(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", uid)
        .single();
      if (!profile?.company_id) return;
      const { data: company } = await supabase
        .from("companies")
        .select("vehicle_fleet")
        .eq("id", profile.company_id)
        .single();
      const raw = (company as any)?.vehicle_fleet;
      setFleet(
        Array.isArray(raw)
          ? raw.map((v: any) => ({
              details: v.details ?? v.nom ?? "",
              type_carburant: v.type_carburant ?? v.type ?? "",
            }))
          : []
      );
    } catch (err) {
      console.error("2A3 fleet load error:", err);
      setFleet([]);
    } finally {
      setLoadingFleet(false);
    }
  };

  const onSelectRowVehicle = (idx: number, detailsValue: string) => {
    const v = fleet.find((fv) => (fv.details ?? "") === detailsValue);
    updateA3Row(idx, "vehicle", detailsValue);
    if (v?.type_carburant) updateA3Row(idx, "type", v.type_carburant);
  };

  useEffect(() => { loadFleet(); }, []);

  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, "2A3", { rows: [] });

  // Load refs (PRP + equipements_mobiles)
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

        setRefs({ byTypeVehicule, byCarburant, prpCO2, prpCH4, prpN2O });
      } catch (e) {
        console.error("2A3 refs load error:", e);
        setRefs({
          byTypeVehicule: {},
          byCarburant: {},
          prpCO2: 1,
          prpCH4: 0,
          prpN2O: 0,
        });
      }
    })();
  }, []);

  // Load site + reference options from company profile
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", userId)
          .single();
        if (!profile?.company_id) return;

        const { data: company } = await supabase
          .from("companies")
          .select("production_sites, company_references")
          .eq("id", profile.company_id)
          .single();

        const uniq = (arr: string[]) => Array.from(new Set(arr));
        const sites = Array.isArray(company?.production_sites)
          ? (company.production_sites as any[]).map((s) => String(s?.nom ?? "")).filter(Boolean)
          : [];
        const refs = Array.isArray(company?.company_references)
          ? (company.company_references as any[]).map((r) => String(r)).filter(Boolean)
          : [];

        setSiteOptions(uniq(sites));
        setReferenceOptions(uniq(refs));
      } catch {}
    })();
  }, [userId]);

  // Prefill hydrate
  useEffect(() => {
    if (Array.isArray((prefillData as any)?.rows) && (prefillData as any).rows.length) {
      setA3Rows((prefillData as any).rows as A3Row[]);
    }
    if (prefillResults) {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults]);

  const validateData = (rows: A3Row[]) =>
    rows.length > 0 && rows.every((row) => row.vehicle && row.type && row.date && row.estimateQty);

  // Excel replica calc
  const computeResults = (rows: A3Row[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    return (rows || []).map((row) => {
      const keyRaw = String(row.type ?? "").trim();
      const qty = toNum(row.estimateQty, 0);
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

      if (!keyRaw || qty === 0 || !ef) {
        if (keyRaw && qty !== 0 && !ef) console.warn("2A3: lookup failed for type =", keyRaw);
        return {
          total_co2_gco2e: 0,
          total_ges_ch4_gco2e: 0,
          total_ges_n2o_gco2e: 0,
          total_ges_gco2e: 0,
          total_ges_tco2e: 0,
          total_energie_kwh: 0,
        };
      }

      const hasGas =
        (ef.co2_g_unite ?? 0) !== 0 ||
        (ef.ch4_g_unite ?? 0) !== 0 ||
        (ef.n2o_g_unite ?? 0) !== 0;

      const co2 = hasGas ? ef.co2_g_unite * qty * toNum(rf.prpCO2, 1) : 0;
      const ch4 = hasGas ? ef.ch4_g_unite * qty * toNum(rf.prpCH4, 0) : 0;
      const n2o = hasGas ? ef.n2o_g_unite * qty * toNum(rf.prpN2O, 0) : 0;

      const total_g = hasGas ? co2 + ch4 + n2o : ef.co2eq_g_unite * qty;
      const total_t = total_g / 1e6;

      const energy_kwh = ef.conversion_kwh_unite * qty;

      return {
        total_co2_gco2e: hasGas ? co2 : total_g,
        total_ges_ch4_gco2e: hasGas ? ch4 : 0,
        total_ges_n2o_gco2e: hasGas ? n2o : 0,
        total_ges_gco2e: total_g,
        total_ges_tco2e: total_t,
        total_energie_kwh: energy_kwh,
      };
    });
  };

  // Live recompute
  useEffect(() => {
    const res = computeResults(a3Rows, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a3Rows, refs]);

  // Submit (compute + save)
  const handle2A3Submit = async () => {
    if (!posteSourceId || !userId) {
      alert("Missing required fields (posteSourceId or userId)");
      return;
    }
    if (!validateData(a3Rows)) {
      alert("Veuillez remplir tous les champs requis.");
      return;
    }
    if (!refs) {
      alert("Références non chargées (equipements_mobiles / PRP). Réessayez.");
      return;
    }

    setLoading(true);

    const sanitizedRows = a3Rows.map((row) => ({
      ...row,
      site: row.cost,
      commentaires: row.avgPrice,
      estimateQty: toNum(row.estimateQty, 0),
    }));

    const results = computeResults(a3Rows, refs);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 2,
      source_code: "2A3",
      submission_id: bilanId ?? null,
      data: { rows: sanitizedRows },
      results,
    };

    try {
      const dbResponse = await fetch("/api/2submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
      } else {
        setGesResults(results);
        alert("Données 2A3 calculées et sauvegardées avec succès!");
      }
    } catch {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }

    setLoading(false);
  };

  const totals = useMemo(() => {
    const sum = (k: keyof GesResult) =>
      (gesResults || []).reduce((acc, r) => acc + toNum((r as any)?.[k], 0), 0);

    return {
      total_co2_gco2e: sum("total_co2_gco2e"),
      total_ges_ch4_gco2e: sum("total_ges_ch4_gco2e"),
      total_ges_n2o_gco2e: sum("total_ges_n2o_gco2e"),
      total_ges_gco2e: sum("total_ges_gco2e"),
      total_ges_tco2e: sum("total_ges_tco2e"),
      total_energie_kwh: sum("total_energie_kwh"),
    };
  }, [gesResults]);

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
                Poste 2 · Source 2A3
              </Badge>
            </HStack>

            <Text fontFamily="Inter" fontWeight={700} fontSize={{ base: "xl", md: "2xl" }} color={FIGMA.text}>
              Déplacements & distance (2A3)
            </Text>

            <HStack spacing={3} flexWrap="wrap">
              <Text fontSize="sm" fontFamily="Montserrat" color={FIGMA.muted}>
                {a3Rows?.length || 0} ligne(s)
              </Text>
              {prefillError && (
                <Text fontSize="sm" color="red.500">
                  Préchargement: {String(prefillError)}
                </Text>
              )}
            </HStack>
          </VStack>

          <HStack spacing={3} align="center">
            {(prefillLoading || loadingFleet) && (
              <HStack spacing={2} color={FIGMA.muted}>
                <Spinner size="sm" />
                <Text fontSize="sm" fontFamily="Montserrat">
                  {loadingFleet ? "Chargement flotte…" : "Chargement…"}
                </Text>
              </HStack>
            )}

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
              variant="ghost"
              color={FIGMA.muted}
              size="sm"
              _hover={{ color: FIGMA.green, bg: FIGMA.greenSoft }}
              onClick={() => setCollapsed((v) => !v)}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Main card */}
      <Box bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow}>
        {collapsed ? (
          <Text color={FIGMA.muted} fontFamily="Montserrat">
            Section réduite.
          </Text>
        ) : (
          <VStack align="stretch" spacing={5}>
            {/* Header bar */}
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
                templateColumns="1.4fr 1.2fr 1.2fr 1.0fr 1.0fr 1.0fr 140px"
                columnGap={6}
                alignItems="center"
              >
                <HStack justify="center" spacing={2}>
                  <Icon as={Truck} boxSize={4} />
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Véhicule
                  </Text>
                </HStack>
                <HStack justify="center" spacing={2}>
                  <Icon as={MapPin} boxSize={4} />
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Nom du site
                  </Text>
                </HStack>
                <HStack justify="center" spacing={2}>
                  <Icon as={Truck} boxSize={4} />
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Type
                  </Text>
                </HStack>
                <HStack justify="center" spacing={2}>
                  <Icon as={Hash} boxSize={4} />
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Distance
                  </Text>
                </HStack>
                <HStack justify="center" spacing={2}>
                  <Icon as={Hash} boxSize={4} />
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Référence
                  </Text>
                </HStack>
                <HStack justify="center" spacing={2}>
                  <Icon as={Calendar} boxSize={4} />
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Date
                  </Text>
                </HStack>
                <Box textAlign="right">
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Actions
                  </Text>
                </Box>
              </Grid>
            </Box>

            {/* Rows */}
            <VStack align="stretch" spacing={4}>
              {(a3Rows || []).map((row, idx) => (
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
                      lg: "1.4fr 1.2fr 1.2fr 1.0fr 1.0fr 1.0fr 140px",
                    }}
                    columnGap={4}
                    rowGap={3}
                    alignItems="center"
                  >
                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                        Véhicule
                      </Text>
                      <FigmaFleetSelect
                        value={row.vehicle}
                        onChange={(v) => onSelectRowVehicle(idx, v)}
                        placeholder={loadingFleet ? "Chargement…" : fleet.length ? "Choisir un véhicule" : "Aucun véhicule"}
                        disabled={loadingFleet || fleet.length === 0}
                        options={fleet.map((v, i) => ({
                          value: v.details ?? "",
                          label: v.details ?? `(Sans nom ${i + 1})`,
                        }))}
                      />
                    </GridItem>

                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                        Nom du site
                      </Text>
                      <FigmaSelect
                        value={row.cost}
                        onChange={(v) => updateA3Row(idx, "cost", v)}
                        placeholder="Sélectionner…"
                        options={siteOptions}
                      />
                    </GridItem>

                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                        Type de véhicule
                      </Text>
                      <FigmaVehicleSelect
                        value={row.type}
                        onChange={(v: string) => updateA3Row(idx, "type", v)}
                      />
                    </GridItem>

                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                        Distance
                      </Text>
                      <FigmaInput
                        type="number"
                        value={row.estimateQty}
                        onChange={(v) => updateA3Row(idx, "estimateQty", v)}
                        placeholder="Distance"
                        center
                      />
                    </GridItem>

                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                        Référence
                      </Text>
                      <ReferenceSelect userId={userId} value={row.reference} onChange={(v) => updateA3Row(idx, "reference", v)} />
                    </GridItem>

                    <GridItem>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                        Date
                      </Text>
                      <FigmaDate
                        value={row.date}
                        onChange={(v) => updateA3Row(idx, "date", v)}
                      />
                    </GridItem>

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
                          onClick={() =>
                            setA3Rows((prev) => {
                              const copy = [...prev];
                              copy.splice(idx + 1, 0, { ...row });
                              return copy;
                            })
                          }
                        />
                        <IconButton
                          aria-label="Supprimer"
                          icon={<DeleteIcon />}
                          variant="ghost"
                          color={FIGMA.muted}
                          size="sm"
                          _hover={{ bg: "red.50", color: "red.500" }}
                          onClick={() => removeA3Row(idx)}
                        />
                      </HStack>
                    </GridItem>
                  </Grid>

                  {/* Commentaires + inline row result */}
                  <HStack spacing={3} mt={3} flexWrap="wrap">
                    <Box flex={1} minW={{ base: "100%", md: "420px" }}>
                      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                        Commentaires <Text as="span" fontWeight={400} color={FIGMA.muted}>(optionnel)</Text>
                      </Text>
                      <FigmaInput
                        value={row.avgPrice}
                        onChange={(v) => updateA3Row(idx, "avgPrice", v)}
                        placeholder="Commentaires (optionnel)"
                      />
                    </Box>

                    <Box
                      ml="auto"
                      px={4}
                      py={2}
                      rounded="full"
                      bg="white"
                      border="1px solid"
                      borderColor={FIGMA.border}
                      boxShadow={FIGMA.inputShadow}
                    >
                      <Text fontFamily="Montserrat" fontSize="sm" color={FIGMA.text}>
                        Total ligne (tCO₂e):{" "}
                        <b>{fmt((gesResults?.[idx] as any)?.total_ges_tco2e ?? 0, 6)}</b>
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              ))}

              {(!a3Rows || a3Rows.length === 0) && (
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
                onClick={addA3Row}
                fontFamily="Inter"
                fontWeight={600}
                _hover={{ bg: FIGMA.greenSoft, borderColor: FIGMA.green }}
              >
                Ajouter une ligne
              </Button>
            </HStack>
          </VStack>
        )}
      </Box>

      {/* Results summary */}
      <Box mt={6} bg="white" rounded="xl" p={6} boxShadow={FIGMA.cardShadow} animation={`${fadeInUp} 0.6s ease-out`}>
        <Text fontFamily="Inter" fontWeight={700} color={FIGMA.text} fontSize="lg" mb={4}>
          Calculs et résultats (récapitulatif)
        </Text>

        {gesResults && gesResults.length > 0 ? (
          <Grid templateColumns={{ base: "1fr", md: "repeat(auto-fit, minmax(220px, 1fr))" }} gap={6}>
            <ResultCard label="CO₂ [gCO₂e]" value={fmt(totals.total_co2_gco2e)} />
            <ResultCard label="CH₄ [gCO₂e]" value={fmt(totals.total_ges_ch4_gco2e)} />
            <ResultCard label="N₂O [gCO₂e]" value={fmt(totals.total_ges_n2o_gco2e)} />
            <ResultCard label="Total [gCO₂e]" value={fmt(totals.total_ges_gco2e)} />
            <ResultCard label="Total [tCO₂e]" value={fmt(totals.total_ges_tco2e, 6)} />
            <ResultCard label="Énergie [kWh]" value={fmt(totals.total_energie_kwh)} />
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

function FigmaFleetSelect({
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
      fontFamily="Montserrat"
      fontSize="14px"
      color={FIGMA.text}
      _focus={{ borderColor: FIGMA.green, boxShadow: `0 0 0 1px ${FIGMA.green}` }}
      transition="all 0.2s"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  );
}

function FigmaSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
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
      {(options.length ? options : value ? [value] : []).map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </Select>
  );
}

function FigmaDate({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <HStack
      h="42px"
      rounded="lg"
      bg="white"
      border="1px solid"
      borderColor={FIGMA.border}
      boxShadow={FIGMA.inputShadow}
      px={3}
      spacing={2}
      justify="space-between"
    >
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        variant="unstyled"
        fontFamily="Montserrat"
        fontSize="14px"
        color={FIGMA.text}
        p={0}
        h="100%"
      />
      <Icon as={Calendar} boxSize={4} color={FIGMA.muted} />
    </HStack>
  );
}

function FigmaVehicleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Box
      h="42px"
      rounded="lg"
      bg="white"
      border="1px solid"
      borderColor={FIGMA.border}
      boxShadow={FIGMA.inputShadow}
      px={2}
      display="flex"
      alignItems="center"
    >
      <Box w="full">
        <VehicleSelect value={value} onChange={onChange} />
      </Box>
    </Box>
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
      <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
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
      <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" mb={2} textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight={700} color={FIGMA.green} fontFamily="Inter">
        {value}
      </Text>
    </Box>
  );
}

export default Source2A3Form;


// import React, { useEffect, useState } from 'react';
// import {
//   Box, HStack, VStack, Grid, GridItem,
//   Text, Button, Icon, Input, useColorModeValue, Spinner
// } from '@chakra-ui/react';
// import { Plus, Trash2, Copy, Lock, Calendar } from 'lucide-react';
// import VehicleSelect from "#components/vehicleselect/VehicleSelect";
// import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

// export type A3Row = {
//   vehicle: string;
//   type: string;
//   date: string;
//   cost: string;        // reused as "Nom du site"
//   avgPrice: string;    // reused as "Commentaires"
//   estimateQty: string; // reused as "Distance"
//   reference: string;
// };

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// export interface Source2A3FormProps {
//   a3Rows: A3Row[];
//   setA3Rows: React.Dispatch<React.SetStateAction<A3Row[]>>;
//   addA3Row: () => void;
//   removeA3Row: (idx: number) => void;
//   updateA3Row: (idx: number, key: keyof A3Row, value: string) => void;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
//   highlight?: string;
//   tableBg?: string;
// }

// export function Source2A3Form({
//   a3Rows = [],
//   setA3Rows,
//   addA3Row,
//   removeA3Row,
//   updateA3Row,
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
// }: Source2A3FormProps) {
//   const [loading, setLoading] = useState(false);

//   const inputBorder = useColorModeValue('#E8ECE7', '#2f3a36');
//   const faintLine = useColorModeValue('rgba(0,0,0,0.12)', 'rgba(255,255,255,0.12)');
//   const headerFg = 'white';

//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource(userId, 2, '2A3', { rows: [] });

//   useEffect(() => {
//     if (Array.isArray(prefillData?.rows) && prefillData.rows.length) {
//       setA3Rows(prefillData.rows as A3Row[]);
//     }
//     if (prefillResults) {
//       const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults]);

//   const validateData = (rows: A3Row[]) =>
//     rows.length > 0 &&
//     rows.every(row => row.vehicle && row.type && row.date && row.estimateQty);

//   const handle2A3Submit = async () => {
//     if (!posteSourceId || !userId) {
//       alert("Missing required fields (posteSourceId or userId)");
//       return;
//     }
//     if (!validateData(a3Rows)) {
//       alert("Veuillez remplir tous les champs requis.");
//       return;
//     }
//     setLoading(true);

//     const sanitizedRows = a3Rows.map(row => ({
//       ...row,
//       site: row.cost,
//       commentaires: row.avgPrice,
//       cost: parseFloat(row.cost) || 0,
//       avgPrice: parseFloat(row.avgPrice) || 0,
//       estimateQty: parseFloat(row.estimateQty) || 0,
//     }));

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       poste_num: 2,
//       source_code: '2A3',
//       data: { rows: sanitizedRows }
//     };

//     let results: any[] = [];
//     let webhookOk = false;

//     try {
//       const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/2A3', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       const result = await response.json();
//       if (!response.ok) {
//         alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
//       } else {
//         results = Array.isArray(result.results) ? result.results : result.results || [];
//         webhookOk = true;
//       }
//     } catch {
//       alert('Erreur réseau lors du calcul Cloud Run.');
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
//         alert('Erreur lors de la sauvegarde en base : ' + (dbResult.error || ''));
//       } else {
//         setGesResults(results as GesResult[]);
//         alert(
//           webhookOk
//             ? 'Données 2A3 calculées et sauvegardées avec succès!'
//             : 'Données 2A3 sauvegardées sans résultat de calcul GES.'
//         );
//       }
//     } catch {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }

//     setLoading(false);
//   };

//   return (
//     <VStack align="stretch" spacing={3}>
//       {/* Prefill status */}
//       <HStack justify="flex-end" spacing={3}>
//         {prefillLoading && (
//           <HStack spacing={2} color="gray.500">
//             <Spinner size="sm" /> <Text fontSize="sm">Chargement…</Text>
//           </HStack>
//         )}
//         {prefillError && (
//           <Text fontSize="sm" color="red.500">Préchargement: {prefillError}</Text>
//         )}
//       </HStack>

//       {/* Header row */}
//       <Grid
//         templateColumns="2fr 1.6fr 1.6fr 1.2fr 1.2fr 1.2fr 96px"
//         bg={highlight}
//         color={headerFg}
//         fontWeight={600}
//         fontSize="sm"
//         alignItems="center"
//         px={4}
//         py={3}
//         rounded="lg"
//       >
//         <GridItem>Véhicule</GridItem>
//         <GridItem>Nom du site</GridItem>
//         <GridItem>Type de véhicule</GridItem>
//         <GridItem>Distance</GridItem>
//         <GridItem>Référence</GridItem>
//         <GridItem>Date</GridItem>
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
//         {(a3Rows || []).map((row, idx) => (
//           <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
//             <Grid
//               templateColumns="2fr 1.6fr 1.6fr 1.2fr 1.2fr 1.2fr 96px"
//               gap={3}
//               alignItems="center"
//               px={1}
//             >
//               <GridItem><PillInput placeholder="Véhicule" value={row.vehicle} onChange={(v) => updateA3Row(idx, 'vehicle', v)} inputBorder={inputBorder} /></GridItem>
//               <GridItem><PillInput placeholder="Nom du site" value={row.cost} onChange={(v) => updateA3Row(idx, 'cost', v)} inputBorder={inputBorder} /></GridItem>
//               <GridItem><PillVehicleSelect value={row.type} onChange={(v) => updateA3Row(idx, 'type', v)} inputBorder={inputBorder} /></GridItem>
//               <GridItem><PillInput placeholder="Distance (km)" value={row.estimateQty} onChange={(v) => updateA3Row(idx, 'estimateQty', v)} inputBorder={inputBorder} /></GridItem>
//               <GridItem><PillInput placeholder="Référence" value={row.reference} onChange={(v) => updateA3Row(idx, 'reference', v)} inputBorder={inputBorder} /></GridItem>
//               <GridItem><PillDate value={row.date} onChange={(v) => updateA3Row(idx, 'date', v)} inputBorder={inputBorder} /></GridItem>
//               <GridItem>
//                 <HStack spacing={2} justify="flex-end" pr={1}>
//                   <MiniIconBtn icon={Lock} ariaLabel="Verrouiller" />
//                   <MiniIconBtn icon={Copy} ariaLabel="Dupliquer" onClick={() => setA3Rows(prev => { const copy = [...prev]; copy.splice(idx + 1, 0, { ...row }); return copy; })} />
//                   <MiniIconBtn icon={Trash2} ariaLabel="Supprimer" onClick={() => removeA3Row(idx)} />
//                 </HStack>
//               </GridItem>
//             </Grid>

//             {/* Comment + result line */}
//             <HStack spacing={3} align="center" px={1} py={3}>
//               <PillInput placeholder="Commentaires" value={row.avgPrice} onChange={(v) => updateA3Row(idx, 'avgPrice', v)} inputBorder={inputBorder} full />
//               <Text ml="auto" fontSize="sm" color="gray.600">
//                 <strong>{formatResult(gesResults[idx])}</strong>
//               </Text>
//             </HStack>
//             <Box h="2px" bg={faintLine} mx={2} rounded="full" />
//           </Box>
//         ))}

//         {/* Placeholder row */}
//         {(!a3Rows || a3Rows.length === 0) && (
//           <Box p={4} textAlign="center" color="gray.500">
//             Aucune ligne. Cliquez sur “Ajouter une ligne” pour commencer.
//           </Box>
//         )}
//       </VStack>

//       {/* Footer buttons */}
//       <HStack pt={3} spacing={3}>
//         <Button
//           leftIcon={<Icon as={Plus} boxSize={4} />}
//           bg={highlight}
//           color="white"
//           rounded="full"
//           px={6}
//           h="44px"
//           _hover={{ opacity: 0.95 }}
//           onClick={addA3Row}
//         >
//           Ajouter une ligne
//         </Button>
//         <Button
//           colorScheme="blue"
//           rounded="full"
//           px={6}
//           h="44px"
//           onClick={handle2A3Submit}
//           isLoading={loading}
//         >
//           Soumettre
//         </Button>
//       </HStack>

//       {/* ✅ Recap summary box kept here */}
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
//             <ResultPill label="Énergie [kWh]" value={sumField(gesResults, 'total_energie_kwh')} />
//           </Grid>
//         </Box>
//       )}
//     </VStack>
//   );
// }

// /* ===== UI helpers ===== */
// function PillInput({ value, onChange, placeholder, inputBorder, full }: any) {
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

// function PillDate({ value, onChange, inputBorder }: any) {
//   return (
//     <HStack
//       bg="white"
//       border="1px solid"
//       borderColor={inputBorder}
//       rounded="xl"
//       px={3}
//       h="36px"
//       boxShadow="0 2px 4px rgba(0,0,0,0.06)"
//       justify="space-between"
//     >
//       <Input
//         type="date"
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         variant="unstyled"
//         fontSize="sm"
//         h="100%"
//         p={0}
//       />
//       <Icon as={Calendar} boxSize={4} color="gray.500" />
//     </HStack>
//   );
// }

// function PillVehicleSelect({ value, onChange, inputBorder }: any) {
//   return (
//     <Box
//       bg="white"
//       border="1px solid"
//       borderColor={inputBorder}
//       rounded="xl"
//       px={2}
//       h="36px"
//       boxShadow="0 2px 4px rgba(0,0,0,0.06)"
//       display="flex"
//       alignItems="center"
//     >
//       <VehicleSelect value={value} onChange={onChange} />
//     </Box>
//   );
// }

// function MiniIconBtn({ icon, ariaLabel, onClick }: any) {
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
//       <Text fontSize="xs" color="gray.600">{label}</Text>
//       <Text fontWeight="bold">{value}</Text>
//     </VStack>
//   );
// }

// /* ===== Utils ===== */
// function sumField(results: GesResult[], key: keyof GesResult): string {
//   const s = results.reduce((acc, r) => acc + (toNum(r[key]) || 0), 0);
//   return formatNumber(s);
// }
// function toNum(v: unknown): number {
//   const n = typeof v === 'string' ? Number(v) : (typeof v === 'number' ? v : NaN);
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
