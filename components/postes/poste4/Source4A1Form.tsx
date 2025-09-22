import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
  Spinner, Stack
} from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";
import { usePrefillPosteSource } from "#components/postes/HookForGetDataSource";

export type Source4A1Row = {
  equipment: string;
  description: string;
  date: string;
  months: string;
  site: string;
  product: string;
  reference: string;
  refrigerationType: string;
  refrigerant: string;
  qtyInEquipment: string;
  leakObserved: string;
};

const resultFields = [
  { key: "prob_fuite", label: "Probabilité de fuite" },
  { key: "fuite_estime", label: "Fuite estimée" },
  { key: "fuite_calculee", label: "Fuite calculée" },
  { key: "prp", label: "PRP" },
  { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
  { key: "total_ges_ch4_gco2e", label: "CH₄ [gCO2e]" },
  { key: "total_ges_n2o_gco2e", label: "N₂O [gCO2e]" },
  { key: "total_ges_gco2e", label: "Total GES [gCO2e]" },
  { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
  { key: "energie_kwh", label: "Énergie équivalente [kWh]" },
] as const;

type ResultKey = typeof resultFields[number]["key"];

type GesResult = Partial<Record<ResultKey, string | number>>;

export interface Source4A1FormProps {
  rows: Source4A1Row[];
  setRows: (rows: Source4A1Row[]) => void;
  addRow: () => void;
  removeRow: (idx: number) => void;
  updateRow: (idx: number, key: keyof Source4A1Row, value: string) => void;
  highlight?: string;
  tableBg?: string;
  posteSourceId: string | null;
  userId?: string | null;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

const REFRIGERATION_TYPE_OPTIONS = [
  "Climatisation commerciale/industrielle",
  "Réfrigération – Commerciale / industriel",
];

const REFRIGERANT_OPTIONS = ["R-134a", "R-448a"];

export function Source4A1Form({
  rows = [],
  setRows,
  addRow,
  removeRow,
  updateRow,
  highlight = "#245a7c",
  tableBg = "#f3f6ef",
  posteSourceId,
  userId: propUserId,
  gesResults = [],
  setGesResults,
}: Source4A1FormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);

  // ---- Prefill (like 6B1) ----
  // If the form is empty/pristine, hydrate from a shared prefill hook.
  const {
    loading: prefillLoading,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource((userId ?? "") as string, 4, "4A1", { rows: [] });

  const isPristine = useMemo(() => {
    if (!rows || rows.length === 0) return true;
    if (rows.length !== 1) return false;
    const r = rows[0];
    return (
      !r.equipment &&
      !r.description &&
      !r.date &&
      !r.months &&
      !r.site &&
      !r.product &&
      !r.reference &&
      !r.refrigerationType &&
      !r.refrigerant &&
      !r.qtyInEquipment &&
      !r.leakObserved
    );
  }, [rows]);

  // ---- Load saved from DB (latest submission/poste) ----
  useEffect(() => {
    (async () => {
      setLoading(true);
      let activeUserId = propUserId ?? null;
      if (!activeUserId) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          setLoading(false);
          return;
        }
        activeUserId = auth.user.id;
      }
      setUserId(activeUserId);

      // Pull latest submission+postes; filter by posteSourceId if present, else by poste_num=4
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

      if (!error && data && data.postes) {
        const poste = posteSourceId
          ? data.postes.find((p: any) => p.id === posteSourceId)
          : data.postes.find((p: any) => p.poste_num === 4);

        if (poste) {
          setSubmissionId(data.id);
          let parsed = poste.data;
          if (typeof parsed === "string") {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              parsed = {};
            }
          }
          if (parsed?.rows && Array.isArray(parsed.rows)) {
            // Expecting rows in draft/saved format
            setRows(
              parsed.rows.map((r: any) => ({
                equipment: r.equipment ?? "",
                description: r.description ?? "",
                date: r.date ?? "",
                months: String(r.months ?? ""),
                site: r.site ?? "",
                product: r.product ?? "",
                reference: r.reference ?? "",
                refrigerationType: r.equipmentType ?? r.refrigerationType ?? "",
                refrigerant: r.refrigerantType ?? r.refrigerant ?? "",
                qtyInEquipment:
                  r.qtyInEquipment ?? (r.qty !== undefined ? String(r.qty) : ""),
                leakObserved:
                  r.leakObserved ??
                  (r.leaks !== undefined ? String(r.leaks) : ""),
              }))
            );
          }
          if (poste.results && Array.isArray(poste.results)) {
            setGesResults(poste.results);
          }
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posteSourceId, propUserId]);

  // ---- Hydrate from prefill (only if pristine & not loading DB) ----
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (!isPristine) return;
    if (!prefillData) return;

    // Expecting prefillData like { rows: [...] }
    const incoming = (prefillData as any)?.rows;
    if (Array.isArray(incoming) && incoming.length) {
      setRows(
        incoming.map((r: any) => ({
          equipment: r.equipment ?? "",
          description: r.description ?? "",
          date: r.date ?? "",
          months: String(r.months ?? ""),
          site: r.site ?? "",
          product: r.product ?? "",
          reference: r.reference ?? "",
          refrigerationType: r.equipmentType ?? r.refrigerationType ?? "",
          refrigerant: r.refrigerantType ?? r.refrigerant ?? "",
          qtyInEquipment:
            r.qtyInEquipment ?? (r.qty !== undefined ? String(r.qty) : ""),
          leakObserved:
            r.leakObserved ?? (r.leaks !== undefined ? String(r.leaks) : ""),
        }))
      );
    }
    if (Array.isArray(prefillResults) && prefillResults.length) {
      setGesResults(prefillResults as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, prefillLoading, prefillData, prefillResults, isPristine]);

  // ---- Validation (used for manual submit) ----
  const validateData = (rs: Source4A1Row[]) =>
    rs.length > 0 &&
    rs.every(
      (row) =>
        row.equipment &&
        row.date &&
        row.months &&
        row.site &&
        row.refrigerationType &&
        row.refrigerant &&
        row.qtyInEquipment
    );

  // ---- Debounced autosave (draft) ----
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSONRef = useRef<string>("");

  const makeSanitizedRows = (rs: Source4A1Row[]) =>
    rs.map((row) => ({
      equipment: row.equipment,
      description: row.description,
      date: row.date,
      months: parseFloat(row.months) || 0,
      site: row.site,
      product: row.product,
      reference: row.reference,
      equipmentType: row.refrigerationType,
      refrigerantType: row.refrigerant,
      qty: parseFloat(row.qtyInEquipment) || 0,
      leaks: parseFloat(row.leakObserved) || 0,
    }));

  const saveDraft = async () => {
    if (!userId || !posteSourceId) return;
    // avoid redundant saves
    const jsonNow = JSON.stringify(rows);
    if (jsonNow === lastSavedJSONRef.current) return;

    setSaving(true);
    setSaveMsg("Enregistrement…");

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: "4A1",
      poste_num: 4,
      data: { rows: makeSanitizedRows(rows) },
      // No webhook call here. This is a draft autosave.
      results: gesResults ?? [],
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
      // Clear the status after a short delay
      setTimeout(() => setSaveMsg(null), 1500);
    }
  };

  // Trigger autosave on changes with debounce
  useEffect(() => {
    if (!userId || !posteSourceId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveDraft();
    }, 1000); // 1s after last keystroke

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, userId, posteSourceId]);

  // ---- Manual submit (compute + save) ----
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
    setSubmitting(true);
    setGesResults([]);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: "4A1",
      poste_num: 4,
      data: { rows: makeSanitizedRows(rows) },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // 1) Cloud Run webhook for calculation
    try {
      const response = await fetch(
        "https://allposteswebhook-129138384907.us-central1.run.app/submit/4A1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        alert("Erreur calcul GES (Cloud Run): " + (result.error || ""));
      } else {
        results = Array.isArray(result.results) ? result.results : [];
        webhookOk = true;
      }
    } catch (error) {
      alert("Erreur réseau lors du calcul Cloud Run.");
    }

    // 2) Save to DB with results
    try {
      const dbPayload = { ...payload, results };
      const dbResponse = await fetch("/api/4submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        alert(
          "Erreur lors de la sauvegarde en base : " + (dbResult.error || "")
        );
      } else {
        setGesResults(results);
        lastSavedJSONRef.current = JSON.stringify(rows);
        alert(
          webhookOk
            ? "Données 4A1 calculées et sauvegardées avec succès!"
            : "Données 4A1 sauvegardées sans résultat de calcul GES."
        );
      }
    } catch (error) {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }
    setSubmitting(false);
  };

  // ---- RESULT TABLE (show only non-empty columns) ----
  const displayColumns = resultFields.filter((f) =>
    (gesResults ?? []).some(
      (res) =>
        res &&
        (res as any)[f.key] !== undefined &&
        (res as any)[f.key] !== "" &&
        (res as any)[f.key] !== "#N/A"
    )
  );

  if (loading || prefillLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
        <Spinner color={highlight} size="xl" />
      </Box>
    );
  }

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={2}>
        4A1 – Équipement de réfrigération et de climatisation fixe
      </Heading>

      <Stack direction="row" align="center" spacing={3} mb={4}>
        {saving && <Spinner size="sm" color={highlight} />}
        <Text fontSize="sm" color="gray.600">
          {saveMsg ?? "Saisie automatique activée"}
        </Text>
      </Stack>

      <Table size="sm" variant="simple" style={{ background: tableBg }}>
        <Thead>
          <Tr>
            <Th>Liste des équipements</Th>
            <Th>Description</Th>
            <Th>Date</Th>
            <Th>mois</Th>
            <Th>Site</Th>
            <Th>Produit</Th>
            <Th>Références</Th>
            <Th>Type d'équipement de réfrigération</Th>
            <Th>Type de réfrigérant</Th>
            <Th>Quantité dans l'équipement [lbs]</Th>
            <Th>Fuites constaté par le frigoriste [lbs]</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, idx) => (
            <Tr key={idx}>
              <Td>
                <Input
                  value={row.equipment}
                  onChange={(e) => updateRow(idx, "equipment", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.description}
                  onChange={(e) => updateRow(idx, "description", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(idx, "date", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.months}
                  onChange={(e) => updateRow(idx, "months", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.site}
                  onChange={(e) => updateRow(idx, "site", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  value={row.product}
                  onChange={(e) => updateRow(idx, "product", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  value={row.reference}
                  onChange={(e) => updateRow(idx, "reference", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Select
                  value={row.refrigerationType}
                  onChange={(e) =>
                    updateRow(idx, "refrigerationType", e.target.value)
                  }
                  placeholder="(Sélectionner)"
                >
                  {REFRIGERATION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </Td>
              <Td>
                <Select
                  value={row.refrigerant}
                  onChange={(e) => updateRow(idx, "refrigerant", e.target.value)}
                  placeholder="(Sélectionner)"
                >
                  {REFRIGERANT_OPTIONS.map((opt) => (
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
        isLoading={submitting}
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
                      {(result as any)[f.key] &&
                      (result as any)[f.key] !== "#N/A"
                        ? (result as any)[f.key]
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


// import React, { useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
// } from '@chakra-ui/react';

// export type Source4A1Row = {
//   equipment: string;
//   description: string;
//   date: string;
//   months: string;
//   site: string;
//   product: string;
//   reference: string;
//   refrigerationType: string;
//   refrigerant: string;
//   qtyInEquipment: string;
//   leakObserved: string;
// };

// const resultFields = [
//   { key: "prob_fuite", label: "Probabilité de fuite" },
//   { key: "fuite_estime", label: "Fuite estimée" },
//   { key: "fuite_calculee", label: "Fuite calculée" },
//   { key: "prp", label: "PRP" },
//   { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
//   { key: "total_ges_ch4_gco2e", label: "CH₄ [gCO2e]" },
//   { key: "total_ges_n2o_gco2e", label: "N₂O [gCO2e]" },
//   { key: "total_ges_gco2e", label: "Total GES [gCO2e]" },
//   { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
//   { key: "energie_kwh", label: "Énergie équivalente [kWh]" },
// ];

// type GesResult = {
//   prob_fuite?: string | number;
//   fuite_estime?: string | number;
//   fuite_calculee?: string | number;
//   prp?: string | number;
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   energie_kwh?: string | number;
// };

// export interface Source4A1FormProps {
//   rows: Source4A1Row[];
//   setRows: (rows: Source4A1Row[]) => void;
//   addRow: () => void;
//   removeRow: (idx: number) => void;
//   updateRow: (idx: number, key: keyof Source4A1Row, value: string) => void;
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// const REFRIGERATION_TYPE_OPTIONS = [
//   'Climatisation commerciale/industrielle',
//   'Réfrigération – Commerciale / industriel',
// ];

// const REFRIGERANT_OPTIONS = [
//   'R-134a', 'R-448a',
// ];

// export function Source4A1Form({
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
// }: Source4A1FormProps) {
//   const [loading, setLoading] = useState(false);

//   const validateData = (rows: Source4A1Row[]) =>
//     rows.length > 0 && rows.every(row =>
//       row.equipment && row.date && row.months && row.site && row.refrigerationType && row.refrigerant && row.qtyInEquipment
//     );

//   const handleSubmit = async () => {
//     if (!posteSourceId || !userId) {
//       alert("Champs obligatoires manquants (posteSourceId ou userId)");
//       return;
//     }
//     if (!validateData(rows)) {
//       alert("Veuillez remplir tous les champs requis.");
//       return;
//     }
//     setLoading(true);

//     const sanitizedRows = rows.map(row => ({
//       equipment: row.equipment,
//       description: row.description,
//       date: row.date,
//       months: row.months,
//       site: row.site,
//       product: row.product,
//       reference: row.reference,
//       equipmentType: row.refrigerationType,
//       refrigerantType: row.refrigerant,
//       qty: parseFloat(row.qtyInEquipment) || 0,
//       leaks: parseFloat(row.leakObserved) || 0,
//     }));

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: '4A1',
//       poste_num: 4,
//       data: { rows: sanitizedRows },
//     };

//     let results: GesResult[] = [];
//     let webhookOk = false;

//     // 1. Cloud Run webhook call
//     try {
//       const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/4A1', {
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

//     // 2. Save to your database (Supabase/Postgres)
//     try {
//       const dbPayload = {
//         ...payload,
//         results,
//       };
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
//         alert(webhookOk
//           ? 'Données 4A1 calculées et sauvegardées avec succès!'
//           : 'Données 4A1 sauvegardées sans résultat de calcul GES.');
//       }
//     } catch (error) {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }
//     setLoading(false);
//   };

//   // ---- RESULT TABLE LOGIC: Only show columns that have at least one non-empty/non-#N/A value ---
//   const displayColumns = resultFields.filter(f =>
//     gesResults.some(res =>
//       res && res[f.key] !== undefined && res[f.key] !== "" && res[f.key] !== "#N/A"
//     )
//   );

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         4A1 – Équipement de réfrigération et de climatisation fixe
//       </Heading>
//       <Table size="sm" variant="simple">
//         <Thead>
//           <Tr>
//             <Th>Liste des équipements</Th>
//             <Th>Description</Th>
//             <Th>Date</Th>
//             <Th>mois</Th>
//             <Th>Site</Th>
//             <Th>Produit</Th>
//             <Th>Références</Th>
//             <Th>Type d'équipement de réfrigération</Th>
//             <Th>Type de réfrigérant</Th>
//             <Th>Quantité dans l'équipement [lbs]</Th>
//             <Th>Fuites constaté par le frigoriste [lbs]</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {rows.map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Input
//                   value={row.equipment}
//                   onChange={e => updateRow(idx, "equipment", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.description}
//                   onChange={e => updateRow(idx, "description", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="date"
//                   value={row.date}
//                   onChange={e => updateRow(idx, "date", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.months}
//                   onChange={e => updateRow(idx, "months", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.site}
//                   onChange={e => updateRow(idx, "site", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.product}
//                   onChange={e => updateRow(idx, "product", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.reference}
//                   onChange={e => updateRow(idx, "reference", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Select
//                   value={row.refrigerationType}
//                   onChange={e => updateRow(idx, "refrigerationType", e.target.value)}
//                   placeholder="(Sélectionner)"
//                 >
//                   {REFRIGERATION_TYPE_OPTIONS.map(opt => (
//                     <option key={opt} value={opt}>{opt}</option>
//                   ))}
//                 </Select>
//               </Td>
//               <Td>
//                 <Select
//                   value={row.refrigerant}
//                   onChange={e => updateRow(idx, "refrigerant", e.target.value)}
//                   placeholder="(Sélectionner)"
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
//                   onChange={e => updateRow(idx, "qtyInEquipment", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.leakObserved}
//                   onChange={e => updateRow(idx, "leakObserved", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Button
//                   size="xs"
//                   colorScheme="red"
//                   onClick={() => removeRow(idx)}
//                   title="Supprimer la ligne"
//                 >-</Button>
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
//                       {(result[f.key] && result[f.key] !== "#N/A") ? result[f.key] : "-"}
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

