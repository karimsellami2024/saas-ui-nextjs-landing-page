import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Button,
  Stack,
  Text,
} from "@chakra-ui/react";
import VehicleSelect from "#components/vehicleselect/VehicleSelect";
import { usePrefillPosteSource } from "components/postes/HookForGetDataSource";
import { supabase } from "../../../lib/supabaseClient";

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
  highlight?: string;
  tableBg?: string;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

// ---- Helpers ----
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
  conversion_kwh_unite: number;
  carburant: string;
  unite: string;
  type_vehicule: string;
};

type Refs = {
  byTypeVehicule: Record<string, MobileEF>;
  byCarburant: Record<string, MobileEF>; // key = carburant OR carburant + unite
  prpCO2: number;
  prpCH4: number;
  prpN2O: number;
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
  highlight = "#245a7c",
  tableBg = "#f3f6ef",
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: SourceA1FormProps) {
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Refs | null>(null);

  const DEFAULT_FORM = { groups: [] as CarburantGroup[] };
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, "2A1", DEFAULT_FORM);

  // ✅ Load refs
  useEffect(() => {
    (async () => {
      try {
        // PRP
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

        // Factors from equipements_mobiles (YOUR schema)
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

          // carburant map supports keys like:
          // "Diesel [L]" or "Diesel" or "Essence [L]"
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults]);

  // ✅ Excel replica compute
  const computeResults = (groups: CarburantGroup[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    const out: GesResult[] = [];

    for (const g of groups || []) {
      const keyRaw = String(g.fuelType ?? "").trim(); // M39
      const k = norm(keyRaw);

      // Try both interpretations:
      // 1) key is type_vehicule
      // 2) key is carburant (or carburant [unite])
      const ef =
        rf.byTypeVehicule[k] ||
        rf.byCarburant[k] ||
        // last fallback: match contained strings (helps if VehicleSelect adds prefixes)
        (() => {
          const tvKey = Object.keys(rf.byTypeVehicule).find((kk) => kk === k || kk.includes(k) || k.includes(kk));
          if (tvKey) return rf.byTypeVehicule[tvKey];
          const cKey = Object.keys(rf.byCarburant).find((kk) => kk === k || kk.includes(k) || k.includes(kk));
          return cKey ? rf.byCarburant[cKey] : undefined;
        })();

      for (const r of g.rows || []) {
        const qty = toNum(r.qty, 0); // W39

        if (!keyRaw || qty === 0 || !ef) {
          if (keyRaw && qty !== 0 && !ef) {
            console.warn("2A1: lookup failed for fuelType =", keyRaw);
          }
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

        // If table provides co2/ch4/n2o (gas grams), do Excel formula with PRP.
        // Else if only co2eq exists, use it directly.
        const hasGas =
          (ef.co2_g_unite ?? 0) !== 0 ||
          (ef.ch4_g_unite ?? 0) !== 0 ||
          (ef.n2o_g_unite ?? 0) !== 0;

        const co2 = hasGas ? ef.co2_g_unite * qty * toNum(rf.prpCO2, 1) : 0;
        const ch4 = hasGas ? ef.ch4_g_unite * qty * toNum(rf.prpCH4, 0) : 0;
        const n2o = hasGas ? ef.n2o_g_unite * qty * toNum(rf.prpN2O, 0) : 0;

        const total_g = hasGas ? (co2 + ch4 + n2o) : (ef.co2eq_g_unite * qty);
        const total_t = total_g / 1e6;

        // ENERGY: conversion_kwh_unite * qty   ✅ correct column
        const energy_kwh = ef.conversion_kwh_unite * qty;

        out.push({
          total_co2_gco2e: hasGas ? co2 : total_g, // if only co2eq, show it in CO2 column too
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

  // recompute live
  useEffect(() => {
    const res = computeResults(carburantGroups, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carburantGroups, refs]);

  // validation
  const validateData = (groups: CarburantGroup[]) =>
    groups.every(
      (group) =>
        group.vehicle &&
        group.fuelType &&
        group.rows.length > 0 &&
        group.rows.every((row) => row.details && row.date && row.invoiceNumber && row.qty !== "")
    );

  // submit (compute + save, no Cloud Run)
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
        alert("Erreur lors de la sauvegarde en base : " + (dbResult.error || ""));
      } else {
        setGesResults(results);
        alert("Données 2A1 calculées et sauvegardées avec succès!");
      }
    } catch {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }

    setLoading(false);
  };

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        Saisie carburant – Groupé par véhicule
      </Heading>

      {prefillLoading && (
        <Text mb={2} fontSize="sm" color="gray.500">
          Chargement des données enregistrées…
        </Text>
      )}
      {prefillError && (
        <Text mb={2} fontSize="sm" color="red.500">
          Erreur de préchargement : {String(prefillError)}
        </Text>
      )}

      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Véhicule / Province</Th>
            <Th>Type de carburant</Th>
            <Th>Détail</Th>
            <Th>Date</Th>
            <Th># facture</Th>
            <Th>Quantité</Th>
            <Th>Unité</Th>
            <Th>Total carburant</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {(carburantGroups || []).map((group, gIdx) => {
            const total = (group.rows || []).reduce((sum, r) => sum + toNum(r.qty, 0), 0);
            return (group.rows || []).map((row, rIdx) => (
              <Tr key={`${gIdx}-${rIdx}`}>
                {rIdx === 0 && (
                  <>
                    <Td rowSpan={group.rows.length}>
                      <Input value={group.vehicle} onChange={(e) => updateGroupField(gIdx, "vehicle", e.target.value)} />
                    </Td>
                    <Td rowSpan={group.rows.length}>
                      <VehicleSelect value={group.fuelType} onChange={(val: string) => updateGroupField(gIdx, "fuelType", val)} />
                    </Td>
                  </>
                )}

                <Td>
                  <Input value={row.details} onChange={(e) => updateRowField(gIdx, rIdx, "details", e.target.value)} />
                </Td>
                <Td>
                  <Input type="date" value={row.date} onChange={(e) => updateRowField(gIdx, rIdx, "date", e.target.value)} />
                </Td>
                <Td>
                  <Input value={row.invoiceNumber} onChange={(e) => updateRowField(gIdx, rIdx, "invoiceNumber", e.target.value)} />
                </Td>
                <Td>
                  <Input type="number" value={row.qty} onChange={(e) => updateRowField(gIdx, rIdx, "qty", e.target.value)} />
                </Td>
                <Td>L</Td>

                {rIdx === 0 && (
                  <Td rowSpan={group.rows.length} fontWeight="bold">
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                  </Td>
                )}

                <Td>
                  <Stack direction="row" spacing={1}>
                    <Button size="xs" onClick={() => addRow(gIdx)} colorScheme="blue" title="Ajouter une ligne">
                      +
                    </Button>
                    {group.rows.length > 1 && (
                      <Button size="xs" onClick={() => removeRow(gIdx, rIdx)} colorScheme="red" title="Supprimer la ligne">
                        -
                      </Button>
                    )}
                    {rIdx === 0 && (
                      <Button size="xs" onClick={() => removeGroup(gIdx)} colorScheme="red" title="Supprimer tout ce véhicule">
                        Suppr. véhicule
                      </Button>
                    )}
                  </Stack>
                </Td>
              </Tr>
            ));
          })}
        </Tbody>
      </Table>

      <Button mt={3} colorScheme="green" onClick={addVehicleGroup}>
        Ajouter un véhicule
      </Button>

      <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
        <Text fontWeight="bold" color={highlight} mb={2}>
          Calculs et résultats
        </Text>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>CO₂ [gCO2e]</Th>
              <Th>CH₄ [gCO2e]</Th>
              <Th>N₂O [gCO2e]</Th>
              <Th>Total GES [gCO2e]</Th>
              <Th>Total GES [tCO2e]</Th>
              <Th>Énergie équivalente [kWh]</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(flattenCarburantGroups(carburantGroups) || []).map((_: any, idx: number) => {
              const row = gesResults[idx] || {};
              return (
                <Tr key={idx}>
                  <Td fontWeight="bold">{row.total_co2_gco2e ?? "-"}</Td>
                  <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? "-"}</Td>
                  <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? "-"}</Td>
                  <Td fontWeight="bold">{row.total_ges_gco2e ?? "-"}</Td>
                  <Td fontWeight="bold">{row.total_ges_tco2e ?? "-"}</Td>
                  <Td fontWeight="bold">{row.total_energie_kwh ?? "-"}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

// import React, { useEffect, useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Stack, Text,
// } from '@chakra-ui/react';
// import VehicleSelect from "#components/vehicleselect/VehicleSelect";
// import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

// export type CarburantRow = {
//   details: string;
//   date: string;
//   invoiceNumber: string;
//   qty: string;
// };
// export type CarburantGroup = {
//   vehicle: string;
//   fuelType: string;
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
//   /** OPTIONAL: if provided, we’ll use it to set the groups in one shot */
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

// export function SourceA1Form({
//   carburantGroups = [],
//   setCarburantGroups, // now optional
//   updateGroupField,
//   updateRowField,
//   addVehicleGroup,
//   addRow,
//   removeRow,
//   removeGroup,
//   flattenCarburantGroups,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
// }: SourceA1FormProps) {
//   const [loading, setLoading] = useState(false);

//   // ===== Prefill from /api/get-source for Poste 2, Source 2A1 =====
//   const DEFAULT_FORM = { groups: [] as CarburantGroup[] };
//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource(userId, 2, '2A1', DEFAULT_FORM);

//   // Fallback: rebuild UI via provided callbacks if we don't have a setter
//   const applyGroupsToParent = (groups: CarburantGroup[]) => {
//     // 1) Clear existing groups
//     for (let i = carburantGroups.length - 1; i >= 0; i--) {
//       removeGroup(i);
//     }
//     // 2) Recreate groups and rows, then fill fields
//     groups.forEach((g, gIdxTarget) => {
//       addVehicleGroup(); // creates a group at the end; assume at index current length
//       const newIdx = gIdxTarget; // after clearing, indices should align with creation order

//       // Ensure correct number of rows
//       // Assume addVehicleGroup creates at least 1 row. Add (len-1) more.
//       for (let r = 1; r < Math.max(1, g.rows.length); r++) {
//         addRow(newIdx);
//       }

//       // Fill group-level fields
//       updateGroupField(newIdx, 'vehicle', g.vehicle || '');
//       updateGroupField(newIdx, 'fuelType', g.fuelType || '');

//       // Fill row fields
//       (g.rows || []).forEach((row, rIdx) => {
//         updateRowField(newIdx, rIdx, 'details', row.details || '');
//         updateRowField(newIdx, rIdx, 'date', row.date || '');
//         updateRowField(newIdx, rIdx, 'invoiceNumber', row.invoiceNumber || '');
//         updateRowField(newIdx, rIdx, 'qty', String(row.qty ?? ''));
//       });
//     });
//   };

//   // When prefill returns, inject groups/results
//   useEffect(() => {
//     const groups = Array.isArray(prefillData?.groups) ? prefillData!.groups : [];
//     if (groups.length) {
//       if (typeof setCarburantGroups === 'function') {
//         setCarburantGroups(groups);
//       } else {
//         // use callbacks to reconstruct UI state
//         applyGroupsToParent(groups);
//       }
//     }
//     if (prefillResults) {
//       const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults]);

//   // ===== Validation =====
//   const validateData = (groups: CarburantGroup[]) => {
//     return groups.every(group =>
//       group.vehicle && group.fuelType && group.rows.length > 0 && group.rows.every(row =>
//         row.details && row.date && row.invoiceNumber && row.qty
//       )
//     );
//   };

//   // ===== Submit (unchanged) =====
//   const handleA1Submit = async () => {
//     if (!posteSourceId || !userId) {
//       alert("Missing required fields (posteSourceId or userId)");
//       return;
//     }
//     if (!validateData(carburantGroups)) {
//       alert("Veuillez remplir tous les champs des groupes de carburant, y compris au moins une ligne par groupe.");
//       return;
//     }
//     setLoading(true);

//     const sanitizedGroups = carburantGroups.map(group => ({
//       ...group,
//       rows: group.rows.map(row => ({
//         ...row,
//         qty: parseFloat(String(row.qty)) || 0,
//       })),
//     }));

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: '2A1',
//       data: { groups: sanitizedGroups }
//     };

//     let results: any[] = [];
//     let webhookOk = false;

//     try {
//       const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/2A1', {
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
//         alert(webhookOk
//           ? 'Données A1 calculées et sauvegardées avec succès!'
//           : 'Données A1 sauvegardées sans résultat de calcul GES.');
//       }
//     } catch {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }

//     setLoading(false);
//   };

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         Saisie carburant – Groupé par véhicule
//       </Heading>

//       {prefillLoading && (
//         <Text mb={2} fontSize="sm" color="gray.500">Chargement des données enregistrées…</Text>
//       )}
//       {prefillError && (
//         <Text mb={2} fontSize="sm" color="red.500">Erreur de préchargement : {prefillError}</Text>
//       )}

//       <Table size="sm" variant="simple">
//         <Thead>
//           <Tr>
//             <Th>Véhicule / Province</Th>
//             <Th>Type de carburant</Th>
//             <Th>Détail</Th>
//             <Th>Date</Th>
//             <Th># facture</Th>
//             <Th>Quantité de carburant</Th>
//             <Th>Unité</Th>
//             <Th>Total carburant</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {(carburantGroups || []).map((group, gIdx) => {
//             const total = (group.rows || []).reduce(
//               (sum, r) => sum + parseFloat(r.qty || "0"),
//               0
//             );
//             return (group.rows || []).map((row, rIdx) => (
//               <Tr key={`${gIdx}-${rIdx}`}>
//                 {rIdx === 0 && (
//                   <>
//                     <Td rowSpan={group.rows.length}>
//                       <Input
//                         value={group.vehicle}
//                         onChange={e => updateGroupField(gIdx, "vehicle", e.target.value)}
//                       />
//                     </Td>
//                     <Td rowSpan={group.rows.length}>
//                       <VehicleSelect
//                         value={group.fuelType}
//                         onChange={(val: string) => updateGroupField(gIdx, "fuelType", val)}
//                       />
//                     </Td>
//                   </>
//                 )}

//                 <Td>
//                   <Input
//                     value={row.details}
//                     onChange={e => updateRowField(gIdx, rIdx, "details", e.target.value)}
//                   />
//                 </Td>
//                 <Td>
//                   <Input
//                     type="date"
//                     value={row.date}
//                     onChange={e => updateRowField(gIdx, rIdx, "date", e.target.value)}
//                   />
//                 </Td>
//                 <Td>
//                   <Input
//                     value={row.invoiceNumber}
//                     onChange={e => updateRowField(gIdx, rIdx, "invoiceNumber", e.target.value)}
//                   />
//                 </Td>
//                 <Td>
//                   <Input
//                     type="number"
//                     value={row.qty}
//                     onChange={e => updateRowField(gIdx, rIdx, "qty", e.target.value)}
//                   />
//                 </Td>
//                 <Td>L</Td>
//                 {rIdx === 0 && (
//                   <Td rowSpan={group.rows.length} fontWeight="bold">
//                     {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
//                   </Td>
//                 )}
//                 <Td>
//                   <Stack direction="row" spacing={1}>
//                     <Button
//                       size="xs"
//                       onClick={() => addRow(gIdx)}
//                       colorScheme="blue"
//                       title="Ajouter une ligne"
//                     >+</Button>
//                     {group.rows.length > 1 && (
//                       <Button
//                         size="xs"
//                         onClick={() => removeRow(gIdx, rIdx)}
//                         colorScheme="red"
//                         title="Supprimer la ligne"
//                       >-</Button>
//                     )}
//                     {rIdx === 0 && (
//                       <Button
//                         size="xs"
//                         onClick={() => removeGroup(gIdx)}
//                         colorScheme="red"
//                         title="Supprimer tout ce véhicule"
//                       >Suppr. véhicule</Button>
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
//         <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
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
//                   <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
//                 </Tr>
//               );
//             })}
//           </Tbody>
//         </Table>
//       </Box>
//     </Box>
//   );
// }

