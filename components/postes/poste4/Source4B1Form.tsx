import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Spinner,
  HStack,
  VStack,
  Grid,
  GridItem,
  useColorModeValue,
} from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";

export type Source4B1Row = {
  vehicle: string;
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
  climatisation: string;
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
  { key: "total_energie_kwh", label: "Énergie équivalente [kWh]" },
];

type GesResult = {
  prob_fuite?: string | number;
  fuite_estime?: string | number;
  fuite_calculee?: string | number;
  prp?: string | number;
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface Source4B1FormProps {
  rows: Source4B1Row[];
  setRows: (rows: Source4B1Row[]) => void;
  addRow: () => void;
  removeRow: (idx: number) => void;
  updateRow: (idx: number, key: keyof Source4B1Row, value: string) => void;
  highlight?: string;
  tableBg?: string;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

const REFRIGERATION_TYPE_OPTIONS = ["Climatisation - Automobile"];
const REFRIGERANT_OPTIONS = ["R-134a"];
const CLIMATISATION_OPTIONS = ["Oui", "Non"];

// helpers
const todayISO = () => new Date().toISOString().slice(0, 10);
const orStr = (v: any, d: string) =>
  v != null && String(v).trim() !== "" ? String(v) : d;

export function Source4B1Form({
  rows = [],
  setRows,
  addRow,
  removeRow,
  updateRow,
  highlight = "#264a3b",
  tableBg = "#f3f6ef",
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: Source4B1FormProps) {
  const [loading, setLoading] = useState(false);

  const inputBorder = useColorModeValue("#E8ECE7", "#2f3a36");
  const faintLine = useColorModeValue(
    "rgba(0,0,0,0.12)",
    "rgba(255,255,255,0.12)"
  );

  // avoid double prefill / submit
  const autoPrefilledRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  const validateData = (rowsToCheck: Source4B1Row[]) =>
    rowsToCheck.length > 0 &&
    rowsToCheck.every(
      (row) =>
        row.vehicle &&
        row.date &&
        row.months &&
        row.site &&
        row.refrigerationType &&
        row.refrigerant &&
        row.qtyInEquipment &&
        row.climatisation
    );

  const handleSubmit = async () => {
    if (!posteSourceId || !userId) {
      alert("Champs obligatoires manquants (posteSourceId ou userId)");
      return;
    }
    if (!validateData(rows)) {
      alert("Veuillez remplir tous les champs requis.");
      return;
    }
    setLoading(true);

    const sanitizedRows = rows.map((row) => ({
      vehicle: row.vehicle,
      description: row.description,
      date: row.date,
      months: row.months,
      site: row.site,
      product: row.product,
      reference: row.reference,
      refrigerationType: row.refrigerationType,
      refrigerant: row.refrigerant,
      qtyInEquipment: parseFloat(row.qtyInEquipment) || 0,
      leakObserved: parseFloat(row.leakObserved) || 0,
      climatisation: row.climatisation,
    }));

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: "4B1",
      poste_num: 4,
      data: { rows: sanitizedRows },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // 1) Cloud Run
    try {
      const response = await fetch(
        "https://allposteswebhook-129138384907.us-central1.run.app/submit/4B1",
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
    } catch {
      alert("Erreur réseau lors du calcul Cloud Run.");
    }

    // 2) DB save
    try {
      const dbPayload = {
        ...payload,
        results,
      };
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
        alert(
          webhookOk
            ? "Données 4B1 calculées et sauvegardées avec succès!"
            : "Données 4B1 sauvegardées sans résultat de calcul GES."
        );
      }
    } catch {
      alert("Erreur inattendue lors de la sauvegarde en base.");
    }

    setLoading(false);
  };

  // --- Auto-prefill from vehicle_fleet then auto-submit ---
  useEffect(() => {
    (async () => {
      if (autoPrefilledRef.current) return; // only once
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

        const mapped: Source4B1Row[] = vehicles.map((v: any) => {
          const label =
            v?.details?.toString().trim() ||
            [v?.annee, v?.marque, v?.modele].filter(Boolean).join(" ").trim() ||
            "Véhicule";
          const refType = orStr(
            v?.type_equipement_refrigeration,
            "Climatisation - Automobile"
          );
          const refrig = orStr(v?.type_refrigerant, "R-134a");
          const charge = orStr(v?.charge_lbs, "1000");
          const clim =
            (typeof v?.climatisation === "boolean"
              ? v.climatisation
              : !!v?.clim) === true
              ? "Oui"
              : "Non";

          return {
            vehicle: label,
            description: "",
            date: todayISO(),
            months: "12",
            site: "Parc véhicules",
            product: "Climatisation",
            reference: "",
            refrigerationType: refType,
            refrigerant: refrig,
            qtyInEquipment: charge,
            leakObserved: "",
            climatisation: clim,
          };
        });

        if (mapped.length > 0) {
          setRows(mapped);
          autoPrefilledRef.current = true;
        }
      } catch (e) {
        console.error("4B1 auto-prefill error", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoSubmit]);

  // ---- results: only show columns that have data ----
  const displayColumns = resultFields.filter((f) =>
    gesResults.some(
      (res) =>
        res &&
        res[f.key] !== undefined &&
        res[f.key] !== "" &&
        res[f.key] !== "#N/A"
    )
  );

  return (
    <VStack align="stretch" spacing={3}>
      <Heading as="h3" size="md" color={highlight}>
        4B1 – Climatisation des véhicules
      </Heading>

      {/* Header bar */}
      <Grid
        templateColumns="1.6fr 1.4fr 1.0fr 0.9fr 1.2fr 1.1fr 1.2fr 1.6fr 1.1fr 1.1fr 1.1fr 96px"
        bg={highlight}
        color="white"
        fontWeight={600}
        fontSize="sm"
        alignItems="center"
        px={4}
        py={3}
        rounded="lg"
      >
        <GridItem>Liste des véhicules</GridItem>
        <GridItem>Description</GridItem>
        <GridItem>Date</GridItem>
        <GridItem>Mois</GridItem>
        <GridItem>Site</GridItem>
        <GridItem>Produit</GridItem>
        <GridItem>Références</GridItem>
        <GridItem>Type d&apos;équipement</GridItem>
        <GridItem>Réfrigérant</GridItem>
        <GridItem>Quantité [lbs]</GridItem>
        <GridItem>Fuites [lbs]</GridItem>
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
        {(rows || []).map((row, idx) => (
          <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
            <Grid
              templateColumns="1.6fr 1.4fr 1.0fr 0.9fr 1.2fr 1.1fr 1.2fr 1.6fr 1.1fr 1.1fr 1.1fr 96px"
              gap={3}
              alignItems="center"
              px={1}
            >
              <GridItem>
                <PillInput
                  placeholder="Véhicule"
                  value={row.vehicle}
                  onChange={(v: string) => updateRow(idx, "vehicle", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  placeholder="Facultatif"
                  value={row.description}
                  onChange={(v: string) => updateRow(idx, "description", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  type="date"
                  value={row.date}
                  onChange={(v: string) => updateRow(idx, "date", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  type="number"
                  placeholder="Mois"
                  value={row.months}
                  onChange={(v: string) => updateRow(idx, "months", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  placeholder="Site"
                  value={row.site}
                  onChange={(v: string) => updateRow(idx, "site", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  placeholder="Produit"
                  value={row.product}
                  onChange={(v: string) => updateRow(idx, "product", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  placeholder="Références"
                  value={row.reference}
                  onChange={(v: string) => updateRow(idx, "reference", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillSelect
                  value={row.refrigerationType}
                  onChange={(v: string) =>
                    updateRow(idx, "refrigerationType", v)
                  }
                  placeholder="(Sélectionner)"
                  options={REFRIGERATION_TYPE_OPTIONS}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillSelect
                  value={row.refrigerant}
                  onChange={(v: string) => updateRow(idx, "refrigerant", v)}
                  placeholder="(Sélectionner)"
                  options={REFRIGERANT_OPTIONS}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  type="number"
                  placeholder="Quantité"
                  value={row.qtyInEquipment}
                  onChange={(v: string) =>
                    updateRow(idx, "qtyInEquipment", v)
                  }
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillInput
                  type="number"
                  placeholder="Fuites (facultatif)"
                  value={row.leakObserved}
                  onChange={(v: string) => updateRow(idx, "leakObserved", v)}
                  inputBorder={inputBorder}
                />
              </GridItem>
              <GridItem>
                <PillSelect
                  value={row.climatisation}
                  onChange={(v: string) => updateRow(idx, "climatisation", v)}
                  placeholder="Oui / Non"
                  options={CLIMATISATION_OPTIONS}
                  inputBorder={inputBorder}
                />
              </GridItem>
            </Grid>

            <Box h="2px" bg={faintLine} mx={2} mt={3} rounded="full" />
          </Box>
        ))}

        {(!rows || rows.length === 0) && (
          <Box p={4} textAlign="center" color="gray.500">
            Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot; pour
            commencer.
          </Box>
        )}
      </VStack>

      {/* Footer buttons */}
      <HStack pt={3} spacing={3}>
        <Button
          bg={highlight}
          color="white"
          rounded="full"
          px={6}
          h="44px"
          _hover={{ opacity: 0.95 }}
          onClick={addRow}
        >
          Ajouter une ligne
        </Button>
        <Button
          colorScheme="blue"
          rounded="full"
          px={6}
          h="44px"
          onClick={handleSubmit}
          isLoading={loading}
        >
          Soumettre
        </Button>
      </HStack>

      {/* Résultats */}
      <Box mt={4} bg="#e5f2fa" rounded="xl" boxShadow="sm" p={4}>
        <Text fontWeight="bold" color={highlight} mb={2}>
          Calculs et résultats
        </Text>
        {gesResults && gesResults.length > 0 && displayColumns.length > 0 ? (
          <Grid
            templateColumns={`repeat(${displayColumns.length}, minmax(0, 1fr))`}
            gap={3}
            fontSize="sm"
          >
            {displayColumns.map((f) => (
              <ResultPill
                key={f.key}
                label={f.label}
                value={formatResultField(gesResults, f.key as any)}
              />
            ))}
          </Grid>
        ) : (
          <Text color="gray.500">Aucun résultat à afficher.</Text>
        )}
      </Box>
    </VStack>
  );
}

/* ===== UI helpers ===== */

function PillInput({
  value,
  onChange,
  placeholder,
  inputBorder,
  type = "text",
}: any) {
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
  options,
  inputBorder,
}: any) {
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
      {options.map((opt: string) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </Select>
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

/* ===== Result utils ===== */

function formatResultField(results: GesResult[], key: keyof GesResult): string {
  const nonEmpty = results
    .map((r) => r[key])
    .filter((v) => v !== undefined && v !== "" && v !== "#N/A");
  if (!nonEmpty.length) return "-";
  const n = Number(nonEmpty[0]);
  if (!isFinite(n)) return String(nonEmpty[0]);
  return n.toLocaleString("fr-CA", { maximumFractionDigits: 3 });
}


// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
// } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';

// export type Source4B1Row = {
//   vehicle: string;
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
//   climatisation: string;
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
//   { key: "total_energie_kwh", label: "Énergie équivalente [kWh]" },
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
//   total_energie_kwh?: string | number;
// };

// export interface Source4B1FormProps {
//   rows: Source4B1Row[];
//   setRows: (rows: Source4B1Row[]) => void;
//   addRow: () => void;
//   removeRow: (idx: number) => void;
//   updateRow: (idx: number, key: keyof Source4B1Row, value: string) => void;
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// const REFRIGERATION_TYPE_OPTIONS = ['Climatisation - Automobile'];
// const REFRIGERANT_OPTIONS = ['R-134a'];
// const CLIMATISATION_OPTIONS = ['Oui', 'Non'];

// // ---- helpers ----
// const todayISO = () => new Date().toISOString().slice(0, 10);
// const orStr = (v: any, d: string) => (v != null && String(v).trim() !== '' ? String(v) : d);

// export function Source4B1Form({
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
// }: Source4B1FormProps) {
//   const [loading, setLoading] = useState(false);

//   // so we don't double-submit on re-renders
//   const autoPrefilledRef = useRef(false);
//   const autoSubmittedRef = useRef(false);

//   const validateData = (rowsToCheck: Source4B1Row[]) =>
//     rowsToCheck.length > 0 && rowsToCheck.every(row =>
//       row.vehicle &&
//       row.date &&
//       row.months &&
//       row.site &&
//       row.refrigerationType &&
//       row.refrigerant &&
//       row.qtyInEquipment &&
//       row.climatisation
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
//       vehicle: row.vehicle,
//       description: row.description,
//       date: row.date,
//       months: row.months,
//       site: row.site,
//       product: row.product,
//       reference: row.reference,
//       refrigerationType: row.refrigerationType,
//       refrigerant: row.refrigerant,
//       qtyInEquipment: parseFloat(row.qtyInEquipment) || 0,
//       leakObserved: parseFloat(row.leakObserved) || 0,
//       climatisation: row.climatisation,
//     }));

//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: '4B1',
//       poste_num: 4,
//       data: { rows: sanitizedRows },
//     };

//     let results: GesResult[] = [];
//     let webhookOk = false;

//     // 1) Cloud Run
//     try {
//       const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/4B1', {
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

//     // 2) DB save
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
//           ? 'Données 4B1 calculées et sauvegardées avec succès!'
//           : 'Données 4B1 sauvegardées sans résultat de calcul GES.');
//       }
//     } catch (error) {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }

//     setLoading(false);
//   };

//   // --- Auto-prefill from Supabase company.vehicle_fleet, then auto-submit ---
//   useEffect(() => {
//     (async () => {
//       if (autoPrefilledRef.current) return; // only once
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

//         // 4) map vehicles -> 4B1 rows with sensible defaults to pass validation
//         const mapped: Source4B1Row[] = vehicles.map((v: any) => {
//           const label =
//             v?.details?.toString().trim() ||
//             [v?.annee, v?.marque, v?.modele].filter(Boolean).join(' ').trim() ||
//             'Véhicule';
//           const refType = orStr(v?.type_equipement_refrigeration, 'Climatisation - Automobile');
//           const refrig = orStr(v?.type_refrigerant, 'R-134a');
//           const charge = orStr(v?.charge_lbs, '1000');
//           const clim = (typeof v?.climatisation === 'boolean' ? v.climatisation : !!v?.clim) ? 'Oui' : 'Non';

//           return {
//             vehicle: label,
//             description: '',
//             date: todayISO(),      // default: today
//             months: '12',          // default: full year
//             site: 'Parc véhicules',
//             product: 'Climatisation',
//             reference: '',
//             refrigerationType: refType,
//             refrigerant: refrig,
//             qtyInEquipment: charge,
//             leakObserved: '',
//             climatisation: clim,
//           };
//         });

//         if (mapped.length > 0) {
//           setRows(mapped);
//           autoPrefilledRef.current = true;
//         }
//       } catch (e) {
//         // silent; user can still fill manually
//         console.error('4B1 auto-prefill error', e);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // After prefill, auto-submit once everything is ready and valid
//   const canAutoSubmit = useMemo(
//     () => !!posteSourceId && !!userId && validateData(rows),
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     [rows, posteSourceId, userId]
//   );

//   useEffect(() => {
//     if (!autoPrefilledRef.current) return;      // only after prefill
//     if (autoSubmittedRef.current) return;       // only once
//     if (!canAutoSubmit) return;
//     autoSubmittedRef.current = true;
//     // fire and forget
//     handleSubmit();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [canAutoSubmit]);

//   // ---- UI ----
//   // Only display result columns with at least one non-empty/non-#N/A value
//   const displayColumns = resultFields.filter(f =>
//     gesResults.some(res =>
//       res && res[f.key] !== undefined && res[f.key] !== "" && res[f.key] !== "#N/A"
//     )
//   );

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         4B1 – Climatisation des véhicules
//       </Heading>
//       <Table size="sm" variant="simple" bg={tableBg}>
//         <Thead>
//           <Tr>
//             <Th>Liste des véhicules</Th>
//             <Th>Description</Th>
//             <Th>Date</Th>
//             <Th>mois</Th>
//             <Th>Site</Th>
//             <Th>Produit</Th>
//             <Th>Références</Th>
//             <Th>Type d'équipement de réfrigération</Th>
//             <Th>Type de réfrigérant</Th>
//             <Th>Quantité dans l'équipement [lbs]</Th>
//             <Th>Fuites constaté par le frigoriste [lbs] (Facultatif)</Th>
//             <Th>Climatisation</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {rows.map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Input
//                   value={row.vehicle}
//                   onChange={e => updateRow(idx, "vehicle", e.target.value)}
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
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.product}
//                   onChange={e => updateRow(idx, "product", e.target.value)}
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
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Select
//                   value={row.climatisation}
//                   onChange={e => updateRow(idx, "climatisation", e.target.value)}
//                   placeholder="Oui / Non"
//                 >
//                   {CLIMATISATION_OPTIONS.map(opt => (
//                     <option key={opt} value={opt}>{opt}</option>
//                   ))}
//                 </Select>
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

