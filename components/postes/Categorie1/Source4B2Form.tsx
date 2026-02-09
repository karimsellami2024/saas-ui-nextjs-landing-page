import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Select,
  Text,
} from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";

// ---- Types ----
export type Source4B2Row = {
  vehicle: string;
  date: string;
  refrigerant: string;        // e.g. "R-134a"
  qtyInEquipment: string;     // [lbs]
  leakObserved: string;       // facultatif [lbs]
};

type GesResult = { [k: string]: string | number | undefined };

export interface Source4B2FormProps {
  rows: Source4B2Row[];
  setRows: (rows: Source4B2Row[]) => void;
  addRow: () => void;
  removeRow: (idx: number) => void;
  updateRow: (idx: number, key: keyof Source4B2Row, value: string) => void;
  highlight?: string;
  tableBg?: string;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

// ---- Constants & helpers ----
const LBS_PER_KG = 2.20462;
const todayISO = () => new Date().toISOString().slice(0, 10);
const orStr = (v: any, d: string) =>
  v != null && String(v).trim() !== "" ? String(v) : d;
const toNum = (x: any, fallback = 0) => {
  if (x === "" || x == null) return fallback;
  const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

// bottom results table columns
const resultFields = [
  { key: "prob_fuite", label: "Probabilité de fuite (fraction)" },
  { key: "fuite_estime", label: "Fuite estimée [kg]" },
  { key: "fuite_calculee", label: "Fuite calculée [kg]" },
  { key: "prp", label: "PRP (kgCO2e/kg)" },
  { key: "total_ges_gco2e", label: "Total GES [gCO2e]" },
  { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
];

// Reference maps loaded from DB
type Refs = {
  leakProbByRef: Record<string, number>; // "R-134a" -> %/an (we divide by 100)
  prpByRef: Record<string, number>;      // "R-134a" -> PRP (from refrigerants_gwp)
  prpByFormula: Record<string, number>;  // "CO2" -> PRP (from gaz_effet_serre)
};

export function Source4B2Form({
  rows = [],
  setRows,
  addRow,
  removeRow,
  updateRow,
  highlight = "#245a7c",
  tableBg = "#f3f6ef",
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: Source4B2FormProps) {
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Refs | null>(null);
  const [refrigerantOptions, setRefrigerantOptions] = useState<string[]>(["R-134a"]);

  // prevent double auto-actions
  const autoPrefilledRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  // ------ Load reference data from your DB schema ------
  useEffect(() => {
    (async () => {
      try {
        // 1) Refrigerants list + leak probabilities
        const { data: rfRows, error: rfErr } = await supabase
          .from("refrigerants")
          .select("nom_refrigerant, probabilite_fuite, application, secteur");
        if (rfErr) throw rfErr;

        const leakProbByRef: Record<string, number> = {};
        const optionSet = new Set<string>();
        (rfRows ?? []).forEach((r: any) => {
          const name = (r?.nom_refrigerant || "").trim();
          if (!name) return;
          optionSet.add(name);
          if (typeof r?.probabilite_fuite === "number") {
            leakProbByRef[name] = r.probabilite_fuite; // %; convert to fraction later
          }
        });

        // 2) PRP (GWP-100) per refrigerant — from refrigerants_gwp
        const { data: gwpRows, error: gwpErr } = await supabase
          .from("refrigerants_gwp")
          .select("nom, prp_100ans");
        if (gwpErr) throw gwpErr;

        const prpByRef: Record<string, number> = Object.fromEntries(
          (gwpRows ?? [])
            .filter((r: any) => r?.nom && r?.prp_100ans != null)
            .map((r: any) => [String(r.nom), Number(r.prp_100ans)])
        );

        // make sure dropdown includes any refrigerant present in PRP table too
        (gwpRows ?? []).forEach((r: any) => {
          if (r?.nom) optionSet.add(String(r.nom));
        });

        const options = Array.from(optionSet).sort();
        if (options.length) setRefrigerantOptions(options);

        // 3) Gaz à effet de serre PRP fallback (CO2, CH4, N2O, CF4, SF6)
        const { data: gesRows, error: gesErr } = await supabase
          .from("gaz_effet_serre")
          .select("formule_chimique, prp_100ans");
        if (gesErr) throw gesErr;

        const prpByFormula: Record<string, number> = Object.fromEntries(
          (gesRows ?? [])
            .filter((r: any) => r?.formule_chimique && r?.prp_100ans != null)
            .map((r: any) => [
              String(r.formule_chimique).trim().toUpperCase(),
              Number(r.prp_100ans),
            ])
        );

        setRefs({ leakProbByRef, prpByRef, prpByFormula });
      } catch (e) {
        console.error("4B2 refs load error:", e);
        setRefs({ leakProbByRef: {}, prpByRef: {}, prpByFormula: {} });
      }
    })();
  }, []);

  // ------ Compute Excel-equivalent formulas using DB refs ------
  const computeResults = (rowsIn: Source4B2Row[], rf: Refs | null): GesResult[] => {
    if (!rf) return [];

    return rowsIn.map((row) => {
      // AE145: equipment charge [lbs]
      const AE_lbs = toNum(row.qtyInEquipment, 0);
      // AF145: observed leak [lbs] (optional)
      const AF_lbs = row.leakObserved === "" ? null : toNum(row.leakObserved, 0);

      // 1) AX: leak probability (fraction). We store % in DB, so divide by 100.
      const leakPct = rf.leakProbByRef[row.refrigerant] ?? 0; // e.g., 10 => 10%
      const AX = leakPct / 100;

      // 2) AY = AE * AX / 2.20462 -> kg estimated
      const AY = (AE_lbs * AX) / LBS_PER_KG;

      // 3) R3 = IF(AF empty, AY, AF/2.20462) -> kg
      const R3 = AF_lbs == null ? AY : AF_lbs / LBS_PER_KG;

      // 4) PRP: prefer refrigerants_gwp; fallback to GES formula PRP if refrigerant is CO2/CH4/N2O/CF4/SF6
      const prpLookup = rf.prpByRef[row.refrigerant];
      const prpFallback =
        rf.prpByFormula[String(row.refrigerant).trim().toUpperCase()];
      const PRP = toNum(prpLookup ?? prpFallback, 0); // kgCO2e/kg

      // 5) BI = R3 * PRP * 10^3 -> gCO2e
      const BI = R3 * PRP * 1e3;

      // 6) tCO2e = BI / 10^6
      const tCO2e = BI / 1e6;

      return {
        prob_fuite: AX,          // fraction
        fuite_estime: AY,        // kg
        fuite_calculee: R3,      // kg
        prp: PRP,                // kgCO2e / kg
        total_ges_gco2e: BI,     // gCO2e
        total_ges_tco2e: tCO2e,  // tCO2e
      };
    });
  };

  // Recompute whenever rows/refs change
  useEffect(() => {
    const res = computeResults(rows, refs);
    setGesResults(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, refs]);

  // ------ Submit (persist inputs + computed results) ------
  const validateData = (rowsToCheck: Source4B2Row[]) =>
    rowsToCheck.length > 0 &&
    rowsToCheck.every(
      (row) =>
        row.vehicle &&
        row.date &&
        row.refrigerant &&
        row.qtyInEquipment !== "" // can be "0" but not empty
    );

  const handleSubmit = async () => {
    if (!posteSourceId || !userId)
      return alert("Champs obligatoires manquants (posteSourceId ou userId)");
    if (!validateData(rows))
      return alert("Veuillez remplir tous les champs requis.");
    setLoading(true);

    const sanitizedRows = rows.map((row) => ({
      vehicle: row.vehicle,
      date: row.date,
      refrigerant: row.refrigerant,
      qtyInEquipment: parseFloat(row.qtyInEquipment) || 0,
      leakObserved:
        row.leakObserved === "" ? 0 : parseFloat(row.leakObserved) || 0,
    }));

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: "4B2",
      poste_num: 4,
      data: { rows: sanitizedRows },
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
        alert("Données 4B2 calculées et sauvegardées avec succès!");
      }
    } catch {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    } finally {
      setLoading(false);
    }
  };

  // ------ Auto-prefill from company.vehicle_fleet (unchanged) ------
  useEffect(() => {
    (async () => {
      if (autoPrefilledRef.current) return;
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const uid = userRes?.user?.id;
        if (!uid) return;

        const { data: profile, error: profErr } = await supabase
          .from("user_profiles")
          .select("company_id")
          .eq("id", uid)
          .single();
        if (profErr) throw profErr;
        const companyId = profile?.company_id;
        if (!companyId) return;

        const { data: company, error: compErr } = await supabase
          .from("companies")
          .select("vehicle_fleet")
          .eq("id", companyId)
          .single();
        if (compErr) throw compErr;

        const vehicles = Array.isArray(company?.vehicle_fleet)
          ? company.vehicle_fleet
          : [];

        const mapped: Source4B2Row[] = vehicles.map((v: any) => {
          const label =
            v?.details?.toString().trim() ||
            [v?.annee, v?.marque, v?.modele].filter(Boolean).join(" ").trim() ||
            "Véhicule";

        const refrig = orStr(v?.type_refrigerant, "R-134a");
          const charge = orStr(v?.charge_lbs, "1000");

          return {
            vehicle: label,
            date: todayISO(),
            refrigerant: refrig,
            qtyInEquipment: charge,
            leakObserved: "",
          };
        });

        if (mapped.length > 0) {
          setRows(mapped);
          autoPrefilledRef.current = true;
        }
      } catch (e) {
        console.error("4B2 auto-prefill error", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-submit once after prefill if everything is valid
  const canAutoSubmit = useMemo(
    () => !!posteSourceId && !!userId && validateData(rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, posteSourceId, userId]
  );

  useEffect(() => {
    if (!autoPrefilledRef.current) return;
    if (autoSubmittedRef.current) return;
    if (!canAutoSubmit) return;
    autoSubmittedRef.current = true;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoSubmit]);

  // show only result columns that have at least one value
  const displayColumns = resultFields.filter((f) =>
    (gesResults || []).some(
      (res) =>
        res &&
        res[f.key] !== undefined &&
        res[f.key] !== "" &&
        res[f.key] !== "#N/A"
    )
  );

  // ------ UI ------
  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        4B2 – Climatisation des véhicules
      </Heading>

      <Table size="sm" variant="simple" bg={tableBg}>
        <Thead>
          <Tr>
            <Th>Liste des véhicules</Th>
            <Th>Date</Th>
            <Th>Type de réfrigérant</Th>
            <Th>Quantité dans l'équipement [lbs]</Th>
            <Th>Fuites constatées par le frigoriste [lbs] (Facultatif)</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, idx) => (
            <Tr key={idx}>
              <Td>
                <Input
                  value={row.vehicle}
                  onChange={(e) => updateRow(idx, "vehicle", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(idx, "date", e.target.value)}
                />
              </Td>
              <Td>
                <Select
                  value={row.refrigerant || "R-134a"}
                  onChange={(e) => updateRow(idx, "refrigerant", e.target.value)}
                >
                  {refrigerantOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.qtyInEquipment}
                  onChange={(e) =>
                    updateRow(idx, "qtyInEquipment", e.target.value)
                  }
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.leakObserved}
                  onChange={(e) =>
                    updateRow(idx, "leakObserved", e.target.value)
                  }
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Button
                  size="xs"
                  colorScheme="red"
                  onClick={() => removeRow(idx)}
                  title="Supprimer la ligne"
                >
                  -
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Button mt={3} colorScheme="blue" onClick={addRow}>
        Ajouter une ligne
      </Button>
      <Button
        mt={3}
        ml={4}
        colorScheme="green"
        onClick={handleSubmit}
        isLoading={loading}
      >
        Soumettre
      </Button>

      <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
        <Text fontWeight="bold" color={highlight} mb={2}>
          Calculs et résultats
        </Text>
        {gesResults && gesResults.length > 0 && displayColumns.length > 0 ? (
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                {displayColumns.map((f) => (
                  <Th key={f.key}>{f.label}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {gesResults.map((result, idx) => (
                <Tr key={idx}>
                  {displayColumns.map((f) => (
                    <Td fontWeight="bold" key={f.key}>
                      {result[f.key] !== "#N/A" && result[f.key] !== undefined
                        ? (typeof result[f.key] === "number"
                            ? (result[f.key] as number)
                            : result[f.key]) ?? "-"
                        : "-"}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Text color="gray.500">Aucun résultat à afficher.</Text>
        )}
      </Box>
    </Box>
  );
}




// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
// } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';

// // ---- Row / Props ----
// export type Source4B2Row = {
//   vehicle: string;
//   date: string;
//   refrigerant: string;        // keep list, default R-134a
//   qtyInEquipment: string;     // [lbs]
//   leakObserved: string;       // facultatif [lbs]
// };

// type GesResult = { [k: string]: string | number | undefined };

// export interface Source4B2FormProps {
//   rows: Source4B2Row[];
//   setRows: (rows: Source4B2Row[]) => void;
//   addRow: () => void;
//   removeRow: (idx: number) => void;
//   updateRow: (idx: number, key: keyof Source4B2Row, value: string) => void;
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// // ---- Options ----
// const REFRIGERANT_OPTIONS = ['R-134a']; // you can extend this list later

// // ---- Helpers ----
// const todayISO = () => new Date().toISOString().slice(0, 10);
// const orStr = (v: any, d: string) => (v != null && String(v).trim() !== '' ? String(v) : d);

// // ---- Result columns (same as 4B1) ----
// const resultFields = [
//   { key: 'prob_fuite', label: 'Probabilité de fuite' },
//   { key: 'fuite_estime', label: 'Fuite estimée' },
//   { key: 'fuite_calculee', label: 'Fuite calculée' },
//   { key: 'prp', label: 'PRP' },
//   { key: 'total_co2_gco2e', label: 'CO₂ [gCO2e]' },
//   { key: 'total_ges_ch4_gco2e', label: 'CH₄ [gCO2e]' },
//   { key: 'total_ges_n2o_gco2e', label: 'N₂O [gCO2e]' },
//   { key: 'total_ges_gco2e', label: 'Total GES [gCO2e]' },
//   { key: 'total_ges_tco2e', label: 'Total GES [tCO2e]' },
//   { key: 'total_energie_kwh', label: 'Énergie équivalente [kWh]' },
// ];

// export function Source4B2Form({
//   rows = [],
//   setRows,
//   addRow,
//   removeRow,
//   updateRow,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
// }: Source4B2FormProps) {
//   const [loading, setLoading] = useState(false);

//   // prevent double auto-actions
//   const autoPrefilledRef = useRef(false);
//   const autoSubmittedRef = useRef(false);

//   // Validation: only the kept fields
//   const validateData = (rowsToCheck: Source4B2Row[]) =>
//     rowsToCheck.length > 0 &&
//     rowsToCheck.every(row =>
//       row.vehicle &&
//       row.date &&
//       row.refrigerant &&
//       row.qtyInEquipment !== '' // can be "0" but not empty
//     );

//   const handleSubmit = async () => {
//     if (!posteSourceId || !userId) {
//       alert('Champs obligatoires manquants (posteSourceId ou userId)');
//       return;
//     }
//     if (!validateData(rows)) {
//       alert('Veuillez remplir tous les champs requis.');
//       return;
//     }

//     setLoading(true);

//     // sanitize payload
//     const sanitizedRows = rows.map(row => ({
//       vehicle: row.vehicle,
//       date: row.date,
//       refrigerant: row.refrigerant,
//       qtyInEquipment: parseFloat(row.qtyInEquipment) || 0,
//       leakObserved: row.leakObserved === '' ? 0 : (parseFloat(row.leakObserved) || 0),
//       // NOTE: refrigerationType = "Climatisation - Automobile" is implied by design for 4B2.
//       // NOTE: months, site, product, reference, climatisation are intentionally omitted in 4B2.
//     }));

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: '4B2',
//       poste_num: 4,
//       data: { rows: sanitizedRows },
//     };

//     let results: GesResult[] = [];
//     let webhookOk = false;

//     // 1) Cloud Run calc
//     try {
//       const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/4B2', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       const result = await response.json();
//       if (!response.ok) {
//         alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
//       } else {
//         results = Array.isArray(result.results) ? result.results : [];
//         webhookOk = true;
//       }
//     } catch (error) {
//       alert('Erreur réseau lors du calcul Cloud Run.');
//     }

//     // 2) Save in DB
//     try {
//       const dbPayload = { ...payload, results };
//       const dbResponse = await fetch('/api/4submit', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(dbPayload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         alert('Erreur lors de la sauvegarde en base : ' + (dbResult.error || ''));
//       } else {
//         setGesResults(results);
//         alert(
//           webhookOk
//             ? 'Données 4B2 calculées et sauvegardées avec succès!'
//             : 'Données 4B2 sauvegardées sans résultat de calcul GES.'
//         );
//       }
//     } catch (error) {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }

//     setLoading(false);
//   };

//   // --- Auto-prefill from Supabase company.vehicle_fleet (once) ---
//   useEffect(() => {
//     (async () => {
//       if (autoPrefilledRef.current) return;
//       try {
//         // 1) auth
//         const { data: userRes, error: userErr } = await supabase.auth.getUser();
//         if (userErr) throw userErr;
//         const uid = userRes?.user?.id;
//         if (!uid) return;

//         // 2) profile -> company_id
//         const { data: profile, error: profErr } = await supabase
//           .from('user_profiles')
//           .select('company_id')
//           .eq('id', uid)
//           .single();
//         if (profErr) throw profErr;
//         const companyId = profile?.company_id;
//         if (!companyId) return;

//         // 3) companies -> vehicle_fleet
//         const { data: company, error: compErr } = await supabase
//           .from('companies')
//           .select('vehicle_fleet')
//           .eq('id', companyId)
//           .single();
//         if (compErr) throw compErr;

//         const vehicles = Array.isArray(company?.vehicle_fleet) ? company.vehicle_fleet : [];

//         // 4) map vehicles -> minimal 4B2 rows
//         const mapped: Source4B2Row[] = vehicles.map((v: any) => {
//           const label =
//             v?.details?.toString().trim() ||
//             [v?.annee, v?.marque, v?.modele].filter(Boolean).join(' ').trim() ||
//             'Véhicule';

//           // default R-134a if not specified
//           const refrig = orStr(v?.type_refrigerant, 'R-134a');
//           const charge = orStr(v?.charge_lbs, '1000');

//           return {
//             vehicle: label,
//             date: todayISO(),
//             refrigerant: refrig,
//             qtyInEquipment: charge,
//             leakObserved: '',
//           };
//         });

//         if (mapped.length > 0) {
//           setRows(mapped);
//           autoPrefilledRef.current = true;
//         }
//       } catch (e) {
//         console.error('4B2 auto-prefill error', e);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Auto-submit once after prefill if everything is valid
//   const canAutoSubmit = useMemo(
//     () => !!posteSourceId && !!userId && validateData(rows),
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     [rows, posteSourceId, userId]
//   );

//   useEffect(() => {
//     if (!autoPrefilledRef.current) return;
//     if (autoSubmittedRef.current) return;
//     if (!canAutoSubmit) return;
//     autoSubmittedRef.current = true;
//     handleSubmit(); // fire-and-forget
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [canAutoSubmit]);

//   // Only display result columns that have data
//   const displayColumns = resultFields.filter(f =>
//     (gesResults || []).some(res => res && res[f.key] !== undefined && res[f.key] !== '' && res[f.key] !== '#N/A')
//   );

//   // ---- UI ----
//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         4B2 – Climatisation des véhicules
//       </Heading>

//       <Table size="sm" variant="simple" bg={tableBg}>
//         <Thead>
//           <Tr>
//             <Th>Liste des véhicules</Th>
//             <Th>Date</Th>
//             <Th>Type de réfrigérant</Th>
//             <Th>Quantité dans l'équipement [lbs]</Th>
//             <Th>Fuites constatées par le frigoriste [lbs] (Facultatif)</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {rows.map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Input
//                   value={row.vehicle}
//                   onChange={e => updateRow(idx, 'vehicle', e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="date"
//                   value={row.date}
//                   onChange={e => updateRow(idx, 'date', e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Select
//                   value={row.refrigerant || 'R-134a'}
//                   onChange={e => updateRow(idx, 'refrigerant', e.target.value)}
//                 >
//                   {REFRIGERANT_OPTIONS.map(opt => (
//                     <option key={opt} value={opt}>{opt}</option>
//                   ))}
//                 </Select>
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.qtyInEquipment}
//                   onChange={e => updateRow(idx, 'qtyInEquipment', e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.leakObserved}
//                   onChange={e => updateRow(idx, 'leakObserved', e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Button
//                   size="xs"
//                   colorScheme="red"
//                   onClick={() => removeRow(idx)}
//                   title="Supprimer la ligne"
//                 >
//                   -
//                 </Button>
//               </Td>
//             </Tr>
//           ))}
//         </Tbody>
//       </Table>

//       <Button mt={3} colorScheme="blue" onClick={addRow}>
//         Ajouter une ligne
//       </Button>
//       <Button
//         mt={3}
//         ml={4}
//         colorScheme="green"
//         onClick={handleSubmit}
//         isLoading={loading}
//       >
//         Soumettre
//       </Button>

//       <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
//         <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
//         {(gesResults && gesResults.length > 0 && displayColumns.length > 0) ? (
//           <Table size="sm" variant="simple">
//             <Thead>
//               <Tr>
//                 {displayColumns.map(f => (
//                   <Th key={f.key}>{f.label}</Th>
//                 ))}
//               </Tr>
//             </Thead>
//             <Tbody>
//               {gesResults.map((result, idx) => (
//                 <Tr key={idx}>
//                   {displayColumns.map(f => (
//                     <Td fontWeight="bold" key={f.key}>
//                       {(result[f.key] && result[f.key] !== '#N/A') ? result[f.key] : '-'}
//                     </Td>
//                   ))}
//                 </Tr>
//               ))}
//             </Tbody>
//           </Table>
//         ) : (
//           <Text color="gray.500">Aucun résultat à afficher.</Text>
//         )}
//       </Box>
//     </Box>
//   );
// }
