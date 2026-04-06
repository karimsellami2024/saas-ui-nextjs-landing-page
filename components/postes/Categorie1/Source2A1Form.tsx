import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Spinner,
  Button,
  Input,
  VStack,
  HStack,
  Grid,
  GridItem,
  Flex,
  Badge,
  Icon,
  IconButton,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import {
  AddIcon,
  DeleteIcon,
  CopyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
} from "@chakra-ui/icons";
import { FiCalendar, FiFileText, FiTruck, FiHash, FiDroplet } from "react-icons/fi";

import VehicleSelect from "#components/vehicleselect/VehicleSelect";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
import { supabase } from "../../../lib/supabaseClient";

/** =======================
 * Poste 2A1 – Carburant (groupé par véhicule)
 * SAME FIGMA DESIGN (cards + pill inputs + result cards)
 * ======================= */

export type CarburantRow = {
  details: string;
  date: string;
  invoiceNumber: string;
  qty: string;
};
export type CarburantGroup = {
  vehicle: string;
  fuelType: string; // may be type_vehicule OR carburant depending on VehicleSelect
  rows: CarburantRow[];
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface SourceA1FormProps {
  carburantGroups: CarburantGroup[];
  setCarburantGroups?: React.Dispatch<React.SetStateAction<CarburantGroup[]>>;

  updateGroupField: (gIdx: number, key: keyof CarburantGroup, value: string) => void;
  updateRowField: (gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) => void;

  addVehicleGroup: () => void;
  addRow: (gIdx: number) => void;
  removeRow: (gIdx: number, rIdx: number) => void;
  removeGroup: (gIdx: number) => void;

  flattenCarburantGroups: (groups: CarburantGroup[]) => any[];

  highlight?: string; // kept for compatibility (not used in Figma palette)
  tableBg?: string; // kept for compatibility (not used in Figma palette)

  posteSourceId: string;
  userId: string;

  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

/* ---------------- helpers ---------------- */

const toNum = (x: any, fallback = 0) => {
  if (x === "" || x == null) return fallback;
  const n =
    typeof x === "number" ? x : Number(String(x).replace(",", ".").replace(/\s/g, ""));
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
  conversion_kwh_unite: number;
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

/* ---------------- animations + figma tokens ---------------- */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
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

export function SourceA1Form({
  carburantGroups = [],
  setCarburantGroups,
  updateGroupField,
  updateRowField,
  addVehicleGroup,
  addRow,
  removeRow,
  removeGroup,
  flattenCarburantGroups,
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: SourceA1FormProps) {
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Refs | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const DEFAULT_FORM = { groups: [] as CarburantGroup[] };
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, "2A1", DEFAULT_FORM);

  // ---- Load refs
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
        console.error("2A1 refs load error:", e);
        setRefs({ byTypeVehicule: {}, byCarburant: {}, prpCO2: 1, prpCH4: 0, prpN2O: 0 });
      }
    })();
  }, []);

  // apply prefill
  const applyGroupsToParent = (groups: CarburantGroup[]) => {
    for (let i = carburantGroups.length - 1; i >= 0; i--) removeGroup(i);

    groups.forEach((g, gIdxTarget) => {
      addVehicleGroup();
      const newIdx = gIdxTarget;

      for (let r = 1; r < Math.max(1, g.rows.length); r++) addRow(newIdx);

      updateGroupField(newIdx, "vehicle", g.vehicle || "");
      updateGroupField(newIdx, "fuelType", g.fuelType || "");

      (g.rows || []).forEach((row, rIdx) => {
        updateRowField(newIdx, rIdx, "details", row.details || "");
        updateRowField(newIdx, rIdx, "date", row.date || "");
        updateRowField(newIdx, rIdx, "invoiceNumber", row.invoiceNumber || "");
        updateRowField(newIdx, rIdx, "qty", String(row.qty ?? ""));
      });
    });
  };

  useEffect(() => {
    const groups = Array.isArray((prefillData as any)?.groups) ? (prefillData as any).groups : [];
    if (groups.length) {
      if (typeof setCarburantGroups === "function") setCarburantGroups(groups);
      else applyGroupsToParent(groups);
    }

    if (prefillResults) {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
      setSavingMsg("Enregistré");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults]);

  // compute
  const computeResults = (groups: CarburantGroup[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    const out: GesResult[] = [];

    for (const g of groups || []) {
      const keyRaw = String(g.fuelType ?? "").trim();
      const k = norm(keyRaw);

      const ef =
        rf.byTypeVehicule[k] ||
        rf.byCarburant[k] ||
        (() => {
          const tvKey = Object.keys(rf.byTypeVehicule).find((kk) => kk === k || kk.includes(k) || k.includes(kk));
          if (tvKey) return rf.byTypeVehicule[tvKey];
          const cKey = Object.keys(rf.byCarburant).find((kk) => kk === k || kk.includes(k) || k.includes(kk));
          return cKey ? rf.byCarburant[cKey] : undefined;
        })();

      for (const r of g.rows || []) {
        const qty = toNum(r.qty, 0);

        if (!keyRaw || qty === 0 || !ef) {
          out.push({
            total_co2_gco2e: 0,
            total_ges_ch4_gco2e: 0,
            total_ges_n2o_gco2e: 0,
            total_ges_gco2e: 0,
            total_ges_tco2e: 0,
            total_energie_kwh: 0,
          });
          continue;
        }

        const hasGas =
          (ef.co2_g_unite ?? 0) !== 0 ||
          (ef.ch4_g_unite ?? 0) !== 0 ||
          (ef.n2o_g_unite ?? 0) !== 0;

        const co2 = hasGas ? ef.co2_g_unite * qty * toNum(rf.prpCO2, 1) : 0;
        const ch4 = hasGas ? ef.ch4_g_unite * qty * toNum(rf.prpCH4, 0) : 0;
        const n2o = hasGas ? ef.n2o_g_unite * qty * toNum(rf.prpN2O, 0) : 0;

        const total_g = hasGas ? (co2 + ch4 + n2o) : ef.co2eq_g_unite * qty;
        const total_t = total_g / 1e6;

        const energy_kwh = ef.conversion_kwh_unite * qty;

        out.push({
          total_co2_gco2e: hasGas ? co2 : total_g,
          total_ges_ch4_gco2e: hasGas ? ch4 : 0,
          total_ges_n2o_gco2e: hasGas ? n2o : 0,
          total_ges_gco2e: total_g,
          total_ges_tco2e: total_t,
          total_energie_kwh: energy_kwh,
        });
      }
    }

    return out;
  };

  // live recompute
  useEffect(() => {
    const res = computeResults(carburantGroups, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carburantGroups, refs]);

  const validateData = (groups: CarburantGroup[]) =>
    groups.every(
      (group) =>
        group.vehicle &&
        group.fuelType &&
        group.rows.length > 0 &&
        group.rows.every((row) => row.details && row.date && row.invoiceNumber && row.qty !== "")
    );

  const handleA1Submit = async () => {
    if (!posteSourceId || !userId) {
      alert("Missing required fields (posteSourceId or userId)");
      return;
    }
    if (!validateData(carburantGroups)) {
      alert("Veuillez remplir tous les champs des groupes de carburant, y compris au moins une ligne par groupe.");
      return;
    }
    if (!refs) {
      alert("Références non chargées (equipements_mobiles / PRP). Réessayez.");
      return;
    }

    setLoading(true);
    setSavingMsg("Enregistrement…");
    setJustSaved(false);

    const sanitizedGroups = carburantGroups.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({
        ...row,
        qty: toNum(row.qty, 0),
      })),
    }));

    const results = computeResults(carburantGroups, refs);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: "2A1",
      data: { groups: sanitizedGroups },
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
        setSavingMsg("Erreur d’enregistrement");
        alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
      } else {
        setGesResults(results);
        setSavingMsg("Enregistré");
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
        alert("Données 2A1 calculées et sauvegardées avec succès!");
      }
    } catch {
      setSavingMsg("Erreur réseau");
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }

    setLoading(false);
    setTimeout(() => setSavingMsg(null), 1500);
  };

  // ---- results summary cards (sum all rows)
  const totals = useMemo(() => {
    const sum = (k: keyof GesResult) => (gesResults || []).reduce((acc, r) => acc + toNum((r as any)?.[k], 0), 0);
    return {
      total_co2_gco2e: sum("total_co2_gco2e"),
      total_ges_ch4_gco2e: sum("total_ges_ch4_gco2e"),
      total_ges_n2o_gco2e: sum("total_ges_n2o_gco2e"),
      total_ges_gco2e: sum("total_ges_gco2e"),
      total_ges_tco2e: sum("total_ges_tco2e"),
      total_energie_kwh: sum("total_energie_kwh"),
    };
  }, [gesResults]);

  const fmt = (n: any, max = 3) => Number(toNum(n, 0)).toLocaleString("fr-CA", { maximumFractionDigits: max });

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
                Poste 2 · Source 2A1
              </Badge>
            </HStack>

            <Heading as="h2" fontFamily="Inter" fontWeight={700} fontSize={{ base: "xl", md: "2xl" }} color={FIGMA.text}>
              Saisie carburant · Groupé par véhicule
            </Heading>

            <HStack spacing={3} flexWrap="wrap">
              <Text fontSize="sm" fontFamily="Montserrat" color={FIGMA.muted}>
                {carburantGroups?.length || 0} véhicule(s)
              </Text>
              {prefillError && (
                <Text fontSize="sm" color="red.500">
                  Préchargement: {String(prefillError)}
                </Text>
              )}
            </HStack>
          </VStack>

          <HStack spacing={3} flexWrap="wrap" align="center">
            <Box minW="200px" px={3} py={2} rounded="lg" bg={savingMsg ? "white" : "transparent"} transition="all 0.3s">
              {loading && (
                <HStack color={FIGMA.muted} animation={`${pulse} 1.5s ease-in-out infinite`}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistrement…
                  </Text>
                </HStack>
              )}
              {!loading && justSaved && (
                <HStack color="green.600" animation={`${slideIn} 0.3s ease-out`}>
                  <Icon as={CheckCircleIcon} />
                  <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500}>
                    Enregistré
                  </Text>
                </HStack>
              )}
              {!loading && !justSaved && (
                <Text fontSize="sm" fontFamily="Montserrat" fontWeight={500} color={FIGMA.muted}>
                  {prefillLoading ? "Chargement des données enregistrées…" : savingMsg ?? "Saisie prête"}
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
          <VStack align="stretch" spacing={6}>
            {/* Column header bar (desktop) */}
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
                templateColumns="1.3fr 1.2fr 1.4fr 1.0fr 1.0fr 1.0fr 140px"
                columnGap={6}
                alignItems="center"
              >
                {[
                  { label: "Véhicule", icon: FiTruck },
                  { label: "Carburant", icon: FiDroplet },
                  { label: "Détail", icon: FiFileText },
                  { label: "Date", icon: FiCalendar },
                  { label: "# facture", icon: FiHash },
                  { label: "Quantité (L)", icon: FiDroplet },
                ].map(({ label, icon }) => (
                  <HStack key={label} justify="center" spacing={2}>
                    <Icon as={icon} boxSize={4} />
                    <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                      {label}
                    </Text>
                  </HStack>
                ))}
                <Box textAlign="right">
                  <Text fontFamily="Montserrat" fontWeight={600} fontSize="14px">
                    Actions
                  </Text>
                </Box>
              </Grid>
            </Box>

            {/* Groups */}
            <VStack align="stretch" spacing={5}>
              {(carburantGroups || []).map((group, gIdx) => {
                const groupTotalL = (group.rows || []).reduce((sum, r) => sum + toNum(r.qty, 0), 0);

                return (
                  <Box
                    key={gIdx}
                    bg={FIGMA.bg}
                    rounded="xl"
                    p={4}
                    border="2px solid"
                    borderColor={FIGMA.border}
                    transition="all 0.3s"
                    _hover={{ borderColor: FIGMA.green }}
                    animation={`${fadeInUp} 0.35s ease-out ${gIdx * 0.06}s both`}
                  >
                    {/* Group header */}
                    <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={3}>
                      <HStack spacing={2}>
                        <Badge bg={FIGMA.greenSoft} color={FIGMA.green} rounded="full" px={3} py={1} fontSize="xs">
                          Véhicule #{gIdx + 1}
                        </Badge>
                        <Text fontFamily="Montserrat" fontSize="sm" color={FIGMA.muted}>
                          Total groupe: <b>{fmt(groupTotalL, 2)} L</b>
                        </Text>
                      </HStack>

                      <HStack spacing={2}>
                        <Button
                          leftIcon={<AddIcon />}
                          variant="outline"
                          borderColor={FIGMA.green}
                          color={FIGMA.green}
                          rounded="full"
                          size="sm"
                          onClick={() => addRow(gIdx)}
                          _hover={{ bg: FIGMA.greenSoft }}
                        >
                          Ajouter une ligne
                        </Button>

                        <Button
                          leftIcon={<DeleteIcon />}
                          variant="outline"
                          borderColor="red.300"
                          color="red.600"
                          rounded="full"
                          size="sm"
                          onClick={() => removeGroup(gIdx)}
                          _hover={{ bg: "red.50" }}
                        >
                          Supprimer véhicule
                        </Button>
                      </HStack>
                    </Flex>

                    {/* Group fields */}
                    <Grid
                      templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                      gap={4}
                      mb={4}
                      alignItems="center"
                    >
                      <GridItem>
                        <FigmaInput
                          value={group.vehicle}
                          onChange={(v) => updateGroupField(gIdx, "vehicle", v)}
                          placeholder="Véhicule / Province"
                        />
                      </GridItem>

                      <GridItem>
                        {/* Wrap VehicleSelect in a figma-styled container */}
                        <Box
                          h="42px"
                          rounded="lg"
                          bg="white"
                          border="1px solid"
                          borderColor={FIGMA.border}
                          boxShadow={FIGMA.inputShadow}
                          display="flex"
                          alignItems="center"
                          px={2}
                        >
                          <Box w="full">
                            <VehicleSelect
                              value={group.fuelType}
                              onChange={(val: string) => updateGroupField(gIdx, "fuelType", val)}
                            />
                          </Box>
                        </Box>
                        <Text fontSize="xs" color={FIGMA.muted} mt={1} fontFamily="Montserrat">
                          (Type véhicule ou carburant selon le sélecteur)
                        </Text>
                      </GridItem>
                    </Grid>

                    {/* Rows inside group */}
                    <VStack align="stretch" spacing={3}>
                      {(group.rows || []).map((row, rIdx) => (
                        <Box
                          key={`${gIdx}-${rIdx}`}
                          bg="white"
                          rounded="xl"
                          p={4}
                          border="1px solid"
                          borderColor={FIGMA.border}
                          boxShadow="0 2px 10px rgba(0,0,0,0.04)"
                        >
                          <Grid
                            templateColumns={{
                              base: "1fr",
                              lg: "1.3fr 1.2fr 1.4fr 1.0fr 1.0fr 1.0fr 140px",
                            }}
                            columnGap={4}
                            rowGap={3}
                            alignItems="center"
                          >
                            {/* vehicle + fuelType shown as read-only pills per row (for context) */}
                            <GridItem>
                              <ReadPill label="Véhicule" value={group.vehicle || "—"} />
                            </GridItem>

                            <GridItem>
                              <ReadPill label="Carburant" value={group.fuelType || "—"} />
                            </GridItem>

                            <GridItem>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                                Détail
                              </Text>
                              <FigmaInput
                                value={row.details}
                                onChange={(v) => updateRowField(gIdx, rIdx, "details", v)}
                                placeholder="Détail"
                              />
                            </GridItem>

                            <GridItem>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                                Date
                              </Text>
                              <FigmaInput
                                type="date"
                                value={row.date}
                                onChange={(v) => updateRowField(gIdx, rIdx, "date", v)}
                              />
                            </GridItem>

                            <GridItem>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                                No facture
                              </Text>
                              <FigmaInput
                                value={row.invoiceNumber}
                                onChange={(v) => updateRowField(gIdx, rIdx, "invoiceNumber", v)}
                                placeholder="# facture"
                                center
                              />
                            </GridItem>

                            <GridItem>
                              <Text mb={1} fontSize="12px" color={FIGMA.muted} fontWeight="500" fontFamily="Montserrat">
                                Quantité
                              </Text>
                              <FigmaInput
                                type="number"
                                value={row.qty}
                                onChange={(v) => updateRowField(gIdx, rIdx, "qty", v)}
                                placeholder="0"
                                center
                              />
                            </GridItem>

                            <GridItem>
                              <HStack justify="flex-end" spacing={1}>
                                <IconButton
                                  aria-label="Dupliquer ligne"
                                  icon={<CopyIcon />}
                                  variant="ghost"
                                  color={FIGMA.muted}
                                  size="sm"
                                  _hover={{ bg: FIGMA.greenSoft, color: FIGMA.green }}
                                  onClick={() => {
                                    // duplicate by inserting a copy: easiest via parent ops = addRow then copy values
                                    addRow(gIdx);
                                    const newIdx = group.rows.length; // new row index after add (best-effort)
                                    setTimeout(() => {
                                      updateRowField(gIdx, newIdx, "details", row.details);
                                      updateRowField(gIdx, newIdx, "date", row.date);
                                      updateRowField(gIdx, newIdx, "invoiceNumber", row.invoiceNumber);
                                      updateRowField(gIdx, newIdx, "qty", row.qty);
                                    }, 0);
                                  }}
                                />
                                <IconButton
                                  aria-label="Supprimer ligne"
                                  icon={<DeleteIcon />}
                                  variant="ghost"
                                  color={FIGMA.muted}
                                  size="sm"
                                  _hover={{ bg: "red.50", color: "red.500" }}
                                  onClick={() => removeRow(gIdx, rIdx)}
                                  isDisabled={group.rows.length <= 1}
                                />
                              </HStack>
                            </GridItem>
                          </Grid>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                );
              })}
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
                onClick={addVehicleGroup}
                fontFamily="Inter"
                fontWeight={600}
                _hover={{ bg: FIGMA.greenSoft, borderColor: FIGMA.green }}
              >
                Ajouter un véhicule
              </Button>

              <Button
                bg={FIGMA.green}
                color="white"
                rounded="full"
                h="44px"
                px={8}
                boxShadow={FIGMA.buttonShadow}
                _hover={{ bg: FIGMA.greenLight, transform: "translateY(-2px)", boxShadow: FIGMA.hoverShadow }}
                _active={{ transform: "translateY(0)" }}
                onClick={handleA1Submit}
                isLoading={loading}
                loadingText="Sauvegarde…"
                fontFamily="Inter"
                fontWeight={600}
              >
                Calculer et soumettre
              </Button>
            </HStack>
          </VStack>
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
            <ResultCard label="CO₂ [gCO₂e]" value={fmt(totals.total_co2_gco2e)} />
            <ResultCard label="CH₄ [gCO₂e]" value={fmt(totals.total_ges_ch4_gco2e)} />
            <ResultCard label="N₂O [gCO₂e]" value={fmt(totals.total_ges_n2o_gco2e)} />
            <ResultCard label="Total [gCO₂e]" value={fmt(totals.total_ges_gco2e)} />
            <ResultCard label="Total [tCO₂e]" value={fmt(totals.total_ges_tco2e)} />
            <ResultCard label="Énergie [kWh]" value={fmt(totals.total_energie_kwh)} />
          </Grid>
        ) : (
          <Text color={FIGMA.muted} fontFamily="Montserrat">
            Aucun résultat à afficher.
          </Text>
        )}

        {/* Keep row-level mapping compatibility (optional debug) */}
        <Box mt={3} display="none">
          {(flattenCarburantGroups(carburantGroups) || []).map((_: any, idx: number) => (
            <Box key={idx}>{JSON.stringify(gesResults[idx] || {})}</Box>
          ))}
        </Box>
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

function ReadPill({ label, value }: { label: string; value: string }) {
  return (
    <Box
      h="42px"
      rounded="lg"
      bg={FIGMA.bg}
      border="1px solid"
      borderColor={FIGMA.border}
      px={3}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={3}
    >
      <Text fontSize="xs" color={FIGMA.muted} fontFamily="Montserrat" whiteSpace="nowrap">
        {label}
      </Text>
      <Text fontSize="sm" color={FIGMA.text} fontFamily="Montserrat" fontWeight={600} noOfLines={1}>
        {value}
      </Text>
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

export default SourceA1Form;


// import React, { useEffect, useState } from "react";
// import {
//   Box,
//   Heading,
//   Table,
//   Thead,
//   Tbody,
//   Tr,
//   Th,
//   Td,
//   Input,
//   Button,
//   Stack,
//   Text,
// } from "@chakra-ui/react";
// import VehicleSelect from "#components/vehicleselect/VehicleSelect";
// import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
// import { supabase } from "../../../lib/supabaseClient";

// export type CarburantRow = {
//   details: string;
//   date: string;
//   invoiceNumber: string;
//   qty: string;
// };
// export type CarburantGroup = {
//   vehicle: string;
//   fuelType: string; // may be type_vehicule OR carburant depending on VehicleSelect
//   rows: CarburantRow[];
// };

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// export interface SourceA1FormProps {
//   carburantGroups: CarburantGroup[];
//   setCarburantGroups?: React.Dispatch<React.SetStateAction<CarburantGroup[]>>;
//   updateGroupField: (gIdx: number, key: keyof CarburantGroup, value: string) => void;
//   updateRowField: (gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) => void;
//   addVehicleGroup: () => void;
//   addRow: (gIdx: number) => void;
//   removeRow: (gIdx: number, rIdx: number) => void;
//   removeGroup: (gIdx: number) => void;
//   flattenCarburantGroups: (groups: CarburantGroup[]) => any[];
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// // ---- Helpers ----
// const toNum = (x: any, fallback = 0) => {
//   if (x === "" || x == null) return fallback;
//   const n =
//     typeof x === "number"
//       ? x
//       : Number(String(x).replace(",", ".").replace(/\s/g, ""));
//   return Number.isFinite(n) ? n : fallback;
// };

// const norm = (s: any) =>
//   String(s ?? "")
//     .trim()
//     .toLowerCase()
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .replace(/\s+/g, " ");

// type MobileEF = {
//   co2_g_unite: number;
//   ch4_g_unite: number;
//   n2o_g_unite: number;
//   co2eq_g_unite: number;
//   conversion_kwh_unite: number;
//   carburant: string;
//   unite: string;
//   type_vehicule: string;
// };

// type Refs = {
//   byTypeVehicule: Record<string, MobileEF>;
//   byCarburant: Record<string, MobileEF>; // key = carburant OR carburant + unite
//   prpCO2: number;
//   prpCH4: number;
//   prpN2O: number;
// };

// export function SourceA1Form({
//   carburantGroups = [],
//   setCarburantGroups,
//   updateGroupField,
//   updateRowField,
//   addVehicleGroup,
//   addRow,
//   removeRow,
//   removeGroup,
//   flattenCarburantGroups,
//   highlight = "#245a7c",
//   tableBg = "#f3f6ef",
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
// }: SourceA1FormProps) {
//   const [loading, setLoading] = useState(false);
//   const [refs, setRefs] = useState<Refs | null>(null);

//   const DEFAULT_FORM = { groups: [] as CarburantGroup[] };
//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource(userId, 2, "2A1", DEFAULT_FORM);

//   // ✅ Load refs
//   useEffect(() => {
//     (async () => {
//       try {
//         // PRP
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

//         // Factors from equipements_mobiles (YOUR schema)
//         const { data: mobRows, error: mobErr } = await supabase
//           .from("equipements_mobiles")
//           .select(
//             "type_vehicule,carburant,unite,conversion_kwh_unite,co2_g_unite,ch4_g_unite,n2o_g_unite,co2eq_g_unite"
//           );
//         if (mobErr) throw mobErr;

//         const byTypeVehicule: Record<string, MobileEF> = {};
//         const byCarburant: Record<string, MobileEF> = {};

//         (mobRows ?? []).forEach((r: any) => {
//           const tv = String(r?.type_vehicule ?? "").trim();
//           const carb = String(r?.carburant ?? "").trim();
//           const unit = String(r?.unite ?? "").trim();
//           if (!tv && !carb) return;

//           const ef: MobileEF = {
//             type_vehicule: tv,
//             carburant: carb,
//             unite: unit,
//             conversion_kwh_unite: toNum(r?.conversion_kwh_unite, 0),
//             co2_g_unite: toNum(r?.co2_g_unite, 0),
//             ch4_g_unite: toNum(r?.ch4_g_unite, 0),
//             n2o_g_unite: toNum(r?.n2o_g_unite, 0),
//             co2eq_g_unite: toNum(r?.co2eq_g_unite, 0),
//           };

//           if (tv) byTypeVehicule[norm(tv)] = ef;

//           // carburant map supports keys like:
//           // "Diesel [L]" or "Diesel" or "Essence [L]"
//           if (carb) {
//             byCarburant[norm(carb)] = ef;
//             if (unit) byCarburant[norm(`${carb} [${unit}]`)] = ef;
//           }
//         });

//         setRefs({ byTypeVehicule, byCarburant, prpCO2, prpCH4, prpN2O });
//       } catch (e) {
//         console.error("2A1 refs load error:", e);
//         setRefs({ byTypeVehicule: {}, byCarburant: {}, prpCO2: 1, prpCH4: 0, prpN2O: 0 });
//       }
//     })();
//   }, []);

//   // apply prefill
//   const applyGroupsToParent = (groups: CarburantGroup[]) => {
//     for (let i = carburantGroups.length - 1; i >= 0; i--) removeGroup(i);

//     groups.forEach((g, gIdxTarget) => {
//       addVehicleGroup();
//       const newIdx = gIdxTarget;

//       for (let r = 1; r < Math.max(1, g.rows.length); r++) addRow(newIdx);

//       updateGroupField(newIdx, "vehicle", g.vehicle || "");
//       updateGroupField(newIdx, "fuelType", g.fuelType || "");

//       (g.rows || []).forEach((row, rIdx) => {
//         updateRowField(newIdx, rIdx, "details", row.details || "");
//         updateRowField(newIdx, rIdx, "date", row.date || "");
//         updateRowField(newIdx, rIdx, "invoiceNumber", row.invoiceNumber || "");
//         updateRowField(newIdx, rIdx, "qty", String(row.qty ?? ""));
//       });
//     });
//   };

//   useEffect(() => {
//     const groups = Array.isArray((prefillData as any)?.groups) ? (prefillData as any).groups : [];
//     if (groups.length) {
//       if (typeof setCarburantGroups === "function") setCarburantGroups(groups);
//       else applyGroupsToParent(groups);
//     }

//     if (prefillResults) {
//       const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults]);

//   // ✅ Excel replica compute
//   const computeResults = (groups: CarburantGroup[], rf: Refs | null): GesResult[] => {
//     if (!rf) return [];

//     const out: GesResult[] = [];

//     for (const g of groups || []) {
//       const keyRaw = String(g.fuelType ?? "").trim(); // M39
//       const k = norm(keyRaw);

//       // Try both interpretations:
//       // 1) key is type_vehicule
//       // 2) key is carburant (or carburant [unite])
//       const ef =
//         rf.byTypeVehicule[k] ||
//         rf.byCarburant[k] ||
//         // last fallback: match contained strings (helps if VehicleSelect adds prefixes)
//         (() => {
//           const tvKey = Object.keys(rf.byTypeVehicule).find((kk) => kk === k || kk.includes(k) || k.includes(kk));
//           if (tvKey) return rf.byTypeVehicule[tvKey];
//           const cKey = Object.keys(rf.byCarburant).find((kk) => kk === k || kk.includes(k) || k.includes(kk));
//           return cKey ? rf.byCarburant[cKey] : undefined;
//         })();

//       for (const r of g.rows || []) {
//         const qty = toNum(r.qty, 0); // W39

//         if (!keyRaw || qty === 0 || !ef) {
//           if (keyRaw && qty !== 0 && !ef) {
//             console.warn("2A1: lookup failed for fuelType =", keyRaw);
//           }
//           out.push({
//             total_co2_gco2e: 0,
//             total_ges_ch4_gco2e: 0,
//             total_ges_n2o_gco2e: 0,
//             total_ges_gco2e: 0,
//             total_ges_tco2e: 0,
//             total_energie_kwh: 0,
//           });
//           continue;
//         }

//         // If table provides co2/ch4/n2o (gas grams), do Excel formula with PRP.
//         // Else if only co2eq exists, use it directly.
//         const hasGas =
//           (ef.co2_g_unite ?? 0) !== 0 ||
//           (ef.ch4_g_unite ?? 0) !== 0 ||
//           (ef.n2o_g_unite ?? 0) !== 0;

//         const co2 = hasGas ? ef.co2_g_unite * qty * toNum(rf.prpCO2, 1) : 0;
//         const ch4 = hasGas ? ef.ch4_g_unite * qty * toNum(rf.prpCH4, 0) : 0;
//         const n2o = hasGas ? ef.n2o_g_unite * qty * toNum(rf.prpN2O, 0) : 0;

//         const total_g = hasGas ? (co2 + ch4 + n2o) : (ef.co2eq_g_unite * qty);
//         const total_t = total_g / 1e6;

//         // ENERGY: conversion_kwh_unite * qty   ✅ correct column
//         const energy_kwh = ef.conversion_kwh_unite * qty;

//         out.push({
//           total_co2_gco2e: hasGas ? co2 : total_g, // if only co2eq, show it in CO2 column too
//           total_ges_ch4_gco2e: hasGas ? ch4 : 0,
//           total_ges_n2o_gco2e: hasGas ? n2o : 0,
//           total_ges_gco2e: total_g,
//           total_ges_tco2e: total_t,
//           total_energie_kwh: energy_kwh,
//         });
//       }
//     }

//     return out;
//   };

//   // recompute live
//   useEffect(() => {
//     const res = computeResults(carburantGroups, refs);
//     setGesResults(res);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [carburantGroups, refs]);

//   // validation
//   const validateData = (groups: CarburantGroup[]) =>
//     groups.every(
//       (group) =>
//         group.vehicle &&
//         group.fuelType &&
//         group.rows.length > 0 &&
//         group.rows.every((row) => row.details && row.date && row.invoiceNumber && row.qty !== "")
//     );

//   // submit (compute + save, no Cloud Run)
//   const handleA1Submit = async () => {
//     if (!posteSourceId || !userId) {
//       alert("Missing required fields (posteSourceId or userId)");
//       return;
//     }
//     if (!validateData(carburantGroups)) {
//       alert("Veuillez remplir tous les champs des groupes de carburant, y compris au moins une ligne par groupe.");
//       return;
//     }
//     if (!refs) {
//       alert("Références non chargées (equipements_mobiles / PRP). Réessayez.");
//       return;
//     }

//     setLoading(true);

//     const sanitizedGroups = carburantGroups.map((group) => ({
//       ...group,
//       rows: group.rows.map((row) => ({
//         ...row,
//         qty: toNum(row.qty, 0),
//       })),
//     }));

//     const results = computeResults(carburantGroups, refs);

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: "2A1",
//       data: { groups: sanitizedGroups },
//       results,
//     };

//     try {
//       const dbResponse = await fetch("/api/2submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
//       } else {
//         setGesResults(results);
//         alert("Données 2A1 calculées et sauvegardées avec succès!");
//       }
//     } catch {
//       alert("Erreur inattendue lors de la sauvegarde en base.");
//     }

//     setLoading(false);
//   };

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         Saisie carburant – Groupé par véhicule
//       </Heading>

//       {prefillLoading && (
//         <Text mb={2} fontSize="sm" color="gray.500">
//           Chargement des données enregistrées…
//         </Text>
//       )}
//       {prefillError && (
//         <Text mb={2} fontSize="sm" color="red.500">
//           Erreur de préchargement : {String(prefillError)}
//         </Text>
//       )}

//       <Table size="sm" variant="simple">
//         <Thead>
//           <Tr>
//             <Th>Véhicule / Province</Th>
//             <Th>Type de carburant</Th>
//             <Th>Détail</Th>
//             <Th>Date</Th>
//             <Th># facture</Th>
//             <Th>Quantité</Th>
//             <Th>Unité</Th>
//             <Th>Total carburant</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {(carburantGroups || []).map((group, gIdx) => {
//             const total = (group.rows || []).reduce((sum, r) => sum + toNum(r.qty, 0), 0);
//             return (group.rows || []).map((row, rIdx) => (
//               <Tr key={`${gIdx}-${rIdx}`}>
//                 {rIdx === 0 && (
//                   <>
//                     <Td rowSpan={group.rows.length}>
//                       <Input value={group.vehicle} onChange={(e) => updateGroupField(gIdx, "vehicle", e.target.value)} />
//                     </Td>
//                     <Td rowSpan={group.rows.length}>
//                       <VehicleSelect value={group.fuelType} onChange={(val: string) => updateGroupField(gIdx, "fuelType", val)} />
//                     </Td>
//                   </>
//                 )}

//                 <Td>
//                   <Input value={row.details} onChange={(e) => updateRowField(gIdx, rIdx, "details", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input type="date" value={row.date} onChange={(e) => updateRowField(gIdx, rIdx, "date", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input value={row.invoiceNumber} onChange={(e) => updateRowField(gIdx, rIdx, "invoiceNumber", e.target.value)} />
//                 </Td>
//                 <Td>
//                   <Input type="number" value={row.qty} onChange={(e) => updateRowField(gIdx, rIdx, "qty", e.target.value)} />
//                 </Td>
//                 <Td>L</Td>

//                 {rIdx === 0 && (
//                   <Td rowSpan={group.rows.length} fontWeight="bold">
//                     {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
//                   </Td>
//                 )}

//                 <Td>
//                   <Stack direction="row" spacing={1}>
//                     <Button size="xs" onClick={() => addRow(gIdx)} colorScheme="blue" title="Ajouter une ligne">
//                       +
//                     </Button>
//                     {group.rows.length > 1 && (
//                       <Button size="xs" onClick={() => removeRow(gIdx, rIdx)} colorScheme="red" title="Supprimer la ligne">
//                         -
//                       </Button>
//                     )}
//                     {rIdx === 0 && (
//                       <Button size="xs" onClick={() => removeGroup(gIdx)} colorScheme="red" title="Supprimer tout ce véhicule">
//                         Suppr. véhicule
//                       </Button>
//                     )}
//                   </Stack>
//                 </Td>
//               </Tr>
//             ));
//           })}
//         </Tbody>
//       </Table>

//       <Button mt={3} colorScheme="green" onClick={addVehicleGroup}>
//         Ajouter un véhicule
//       </Button>
//       <Button mt={3} ml={4} colorScheme="blue" onClick={handleA1Submit} isLoading={loading}>
//         Soumettre
//       </Button>

//       <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
//         <Text fontWeight="bold" color={highlight} mb={2}>
//           Calculs et résultats
//         </Text>
//         <Table size="sm" variant="simple">
//           <Thead>
//             <Tr>
//               <Th>CO₂ [gCO2e]</Th>
//               <Th>CH₄ [gCO2e]</Th>
//               <Th>N₂O [gCO2e]</Th>
//               <Th>Total GES [gCO2e]</Th>
//               <Th>Total GES [tCO2e]</Th>
//               <Th>Énergie équivalente [kWh]</Th>
//             </Tr>
//           </Thead>
//           <Tbody>
//             {(flattenCarburantGroups(carburantGroups) || []).map((_: any, idx: number) => {
//               const row = gesResults[idx] || {};
//               return (
//                 <Tr key={idx}>
//                   <Td fontWeight="bold">{row.total_co2_gco2e ?? "-"}</Td>
//                   <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? "-"}</Td>
//                   <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? "-"}</Td>
//                   <Td fontWeight="bold">{row.total_ges_gco2e ?? "-"}</Td>
//                   <Td fontWeight="bold">{row.total_ges_tco2e ?? "-"}</Td>
//                   <Td fontWeight="bold">{row.total_energie_kwh ?? "-"}</Td>
//                 </Tr>
//               );
//             })}
//           </Tbody>
//         </Table>
//       </Box>
//     </Box>
//   );
// }
