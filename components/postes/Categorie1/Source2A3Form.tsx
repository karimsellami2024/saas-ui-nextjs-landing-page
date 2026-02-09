import React, { useEffect, useState } from "react";
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
  useColorModeValue,
  Spinner,
} from "@chakra-ui/react";
import { Plus, Trash2, Copy, Lock, Calendar } from "lucide-react";
import VehicleSelect from "#components/vehicleselect/VehicleSelect";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
import { supabase } from "../../../lib/supabaseClient";

export type A3Row = {
  vehicle: string;
  type: string;        // M82 (lookup key)
  date: string;
  cost: string;        // reused as "Nom du site"
  avgPrice: string;    // reused as "Commentaires"
  estimateQty: string; // W82 (quantity = distance)
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
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
  highlight?: string;
  tableBg?: string;
}

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
  conversion_kwh_unite: number; // ✅ energy factor
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
  highlight = "#245a7c",
  tableBg = "#f3f6ef",
}: Source2A3FormProps) {
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Refs | null>(null);

  const inputBorder = useColorModeValue("#E8ECE7", "#2f3a36");
  const faintLine = useColorModeValue(
    "rgba(0,0,0,0.12)",
    "rgba(255,255,255,0.12)"
  );
  const headerFg = "white";

  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, "2A3", { rows: [] });

  // ✅ load refs like 2A1
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
        setRefs({ byTypeVehicule: {}, byCarburant: {}, prpCO2: 1, prpCH4: 0, prpN2O: 0 });
      }
    })();
  }, []);

  // prefill
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

  // ✅ Excel replica calc
  // CO2 = IF(M=0,"", VLOOKUP(M,FÉ,8)*W*PRP_CO2)
  // CH4 = col9*W*PRP_CH4
  // N2O = col10*W*PRP_N2O
  // total gCO2e = sum
  // tCO2e = /1e6
  // energy = VLOOKUP(M,FÉ,7)*W
  const computeResults = (rows: A3Row[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    return (rows || []).map((row) => {
      const keyRaw = String(row.type ?? "").trim(); // M82
      const qty = toNum(row.estimateQty, 0);        // W82 (distance)

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

      if (!keyRaw || qty === 0 || !ef) {
        if (keyRaw && qty !== 0 && !ef) {
          console.warn("2A3: lookup failed for type =", keyRaw);
        }
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

      const total_g = hasGas ? (co2 + ch4 + n2o) : (ef.co2eq_g_unite * qty);
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

  // recompute live (like 4B2)
  useEffect(() => {
    const res = computeResults(a3Rows, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a3Rows, refs]);

  // ✅ submit = compute + save (no Cloud Run)
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
      // keep original strings too, but ensure numeric qty saved
      estimateQty: toNum(row.estimateQty, 0),
    }));

    const results = computeResults(a3Rows, refs);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 2,
      source_code: "2A3",
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

  return (
    <VStack align="stretch" spacing={3}>
      <HStack justify="flex-end" spacing={3}>
        {prefillLoading && (
          <HStack spacing={2} color="gray.500">
            <Spinner size="sm" /> <Text fontSize="sm">Chargement…</Text>
          </HStack>
        )}
        {prefillError && (
          <Text fontSize="sm" color="red.500">Préchargement: {String(prefillError)}</Text>
        )}
      </HStack>

      <Grid
        templateColumns="2fr 1.6fr 1.6fr 1.2fr 1.2fr 1.2fr 96px"
        bg={highlight}
        color="white"
        fontWeight={600}
        fontSize="sm"
        alignItems="center"
        px={4}
        py={3}
        rounded="lg"
      >
        <GridItem>Véhicule</GridItem>
        <GridItem>Nom du site</GridItem>
        <GridItem>Type de véhicule</GridItem>
        <GridItem>Distance</GridItem>
        <GridItem>Référence</GridItem>
        <GridItem>Date</GridItem>
        <GridItem textAlign="right">Actions</GridItem>
      </Grid>

      <VStack
        spacing={0}
        bg={tableBg}
        rounded="xl"
        border="1px solid"
        borderColor={inputBorder}
        overflow="hidden"
      >
        {(a3Rows || []).map((row, idx) => (
          <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
            <Grid
              templateColumns="2fr 1.6fr 1.6fr 1.2fr 1.2fr 1.2fr 96px"
              gap={3}
              alignItems="center"
              px={1}
            >
              <GridItem>
                <PillInput placeholder="Véhicule" value={row.vehicle} onChange={(v) => updateA3Row(idx, "vehicle", v)} inputBorder={inputBorder} />
              </GridItem>
              <GridItem>
                <PillInput placeholder="Nom du site" value={row.cost} onChange={(v) => updateA3Row(idx, "cost", v)} inputBorder={inputBorder} />
              </GridItem>
              <GridItem>
                <PillVehicleSelect value={row.type} onChange={(v) => updateA3Row(idx, "type", v)} inputBorder={inputBorder} />
              </GridItem>
              <GridItem>
                <PillInput placeholder="Distance" value={row.estimateQty} onChange={(v) => updateA3Row(idx, "estimateQty", v)} inputBorder={inputBorder} />
              </GridItem>
              <GridItem>
                <PillInput placeholder="Référence" value={row.reference} onChange={(v) => updateA3Row(idx, "reference", v)} inputBorder={inputBorder} />
              </GridItem>
              <GridItem>
                <PillDate value={row.date} onChange={(v) => updateA3Row(idx, "date", v)} inputBorder={inputBorder} />
              </GridItem>
              <GridItem>
                <HStack spacing={2} justify="flex-end" pr={1}>
                  <MiniIconBtn icon={Lock} ariaLabel="Verrouiller" />
                  <MiniIconBtn icon={Copy} ariaLabel="Dupliquer" onClick={() => setA3Rows((prev) => { const copy = [...prev]; copy.splice(idx + 1, 0, { ...row }); return copy; })} />
                  <MiniIconBtn icon={Trash2} ariaLabel="Supprimer" onClick={() => removeA3Row(idx)} />
                </HStack>
              </GridItem>
            </Grid>

            <HStack spacing={3} align="center" px={1} py={3}>
              <PillInput placeholder="Commentaires" value={row.avgPrice} onChange={(v) => updateA3Row(idx, "avgPrice", v)} inputBorder={inputBorder} full />
              <Text ml="auto" fontSize="sm" color="gray.600">
                <strong>{formatResult(gesResults[idx])}</strong>
              </Text>
            </HStack>
            <Box h="2px" bg={faintLine} mx={2} rounded="full" />
          </Box>
        ))}

        {(!a3Rows || a3Rows.length === 0) && (
          <Box p={4} textAlign="center" color="gray.500">
            Aucune ligne. Cliquez sur “Ajouter une ligne” pour commencer.
          </Box>
        )}
      </VStack>

      <HStack pt={3} spacing={3}>
        <Button
          leftIcon={<Icon as={Plus} boxSize={4} />}
          bg={highlight}
          color="white"
          rounded="full"
          px={6}
          h="44px"
          _hover={{ opacity: 0.95 }}
          onClick={addA3Row}
        >
          Ajouter une ligne
        </Button>
        <Button
          colorScheme="blue"
          rounded="full"
          px={6}
          h="44px"
          onClick={handle2A3Submit}
          isLoading={loading}
        >
          Soumettre
        </Button>
      </HStack>

      {Array.isArray(gesResults) && gesResults.length > 0 && (
        <Box mt={4} bg="#e5f2fa" rounded="xl" p={4} boxShadow="sm">
          <Text fontWeight="bold" color={highlight} mb={2}>
            Calculs et résultats (récapitulatif)
          </Text>
          <Grid templateColumns="repeat(6, 1fr)" gap={3} fontSize="sm">
            <ResultPill label="CO₂ [gCO₂e]" value={sumField(gesResults, "total_co2_gco2e")} />
            <ResultPill label="CH₄ [gCO₂e]" value={sumField(gesResults, "total_ges_ch4_gco2e")} />
            <ResultPill label="N₂O [gCO₂e]" value={sumField(gesResults, "total_ges_n2o_gco2e")} />
            <ResultPill label="Total GES [gCO₂e]" value={sumField(gesResults, "total_ges_gco2e")} />
            <ResultPill label="Total GES [tCO₂e]" value={sumField(gesResults, "total_ges_tco2e")} />
            <ResultPill label="Énergie [kWh]" value={sumField(gesResults, "total_energie_kwh")} />
          </Grid>
        </Box>
      )}
    </VStack>
  );
}

/* ===== UI helpers ===== */
function PillInput({ value, onChange, placeholder, inputBorder, full }: any) {
  return (
    <Input
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
      flex={full ? 1 : undefined}
    />
  );
}
function PillDate({ value, onChange, inputBorder }: any) {
  return (
    <HStack
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      px={3}
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      justify="space-between"
    >
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        variant="unstyled"
        fontSize="sm"
        h="100%"
        p={0}
      />
      <Icon as={Calendar} boxSize={4} color="gray.500" />
    </HStack>
  );
}
function PillVehicleSelect({ value, onChange, inputBorder }: any) {
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      px={2}
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      display="flex"
      alignItems="center"
    >
      <VehicleSelect value={value} onChange={onChange} />
    </Box>
  );
}
function MiniIconBtn({ icon, ariaLabel, onClick }: any) {
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

/* ===== Utils ===== */
function sumField(results: GesResult[], key: keyof GesResult): string {
  const s = results.reduce((acc, r) => acc + (toNumLocal((r as any)[key]) || 0), 0);
  return formatNumber(s);
}
function toNumLocal(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return isFinite(n) ? n : 0;
}
function formatNumber(n: number): string {
  return Number(n).toLocaleString("fr-CA", { maximumFractionDigits: 3 });
}
function formatResult(r?: GesResult): string {
  if (!r) return "-";
  const t = r.total_ges_tco2e ?? r.total_ges_gco2e ?? r.total_co2_gco2e ?? "-";
  if (t === "-") return "-";
  const n = toNumLocal(t as any);
  return formatNumber(n);
}

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
