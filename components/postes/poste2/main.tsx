'use client';

import React, { useEffect, useState } from "react";
import {
  Box, Stack, HStack, VStack,
  Heading, Text, Button, Icon, Spinner, useColorModeValue
} from "@chakra-ui/react";
import { Plus, HelpCircle } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { SourceA1Form } from "./SourceA1Form";
import { Source2A3Form } from "./SourceA3Form";
import { SourceB1Form } from "./SourceB1Form";

/* -------------------- Palette / tokens -------------------- */
const COL = {
  bg: "#f3f5f2",
  surface: "#ffffff",
  surfaceMuted: "#edf1ec",
  section: "#f7f9f6",
  border: "rgba(0,0,0,0.08)",
  greenBar: "#1f3f33",
  greenPill: "#2f5b47",
  textMuted: "#647067",
  textBody: "#2d332f",
  inputBorder: "#E8ECE7",
};

const POSTE_LABEL_FALLBACK = "POSTE 2 – COMBUSTION MOBILE";

/* -------------------- Types (identiques à ta version) -------------------- */
type CarburantRow = {
  details: string;
  date: string;
  invoiceNumber: string;
  qty: string;
};
type CarburantGroup = {
  vehicle: string;
  fuelType: string;
  rows: CarburantRow[];
};
type A3Row = {
  vehicle: string;
  type: string;
  date: string;
  cost: string;
  avgPrice: string;
  estimateQty: string;
  reference: string;
};
type B1Row = {
  vehicle: string;
  year: string;
  make: string;
  model: string;
  trans: string;
  distance: string;
  type: string;
  cons: string;
  estimate: string;
  reference: string;
  ac: string;
};

export default function Poste2Page() {
  /* -------------------- États globaux / config -------------------- */
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL_FALLBACK);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  // Form states partagés
  const [carburantGroups, setCarburantGroups] = useState<CarburantGroup[]>([]);
  const [a3Rows, setA3Rows] = useState<A3Row[]>([]);
  const [b1Rows, setB1Rows] = useState<B1Row[]>([]);
  const [gesResults, setGesResults] = useState<any[]>([]);

  // Couleurs/Thème
  const pageBg = useColorModeValue(COL.bg, "#222e32");

  /* -------------------- Handlers A1 (identiques) -------------------- */
  function updateGroupField(gIdx: number, key: keyof CarburantGroup, value: string) {
    setCarburantGroups(prev => {
      const copy = [...prev];
      (copy[gIdx] as any)[key] = value;
      return copy;
    });
  }
  function updateRowField(gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) {
    setCarburantGroups(prev => {
      const copy = [...prev];
      (copy[gIdx].rows[rIdx] as any)[key] = value;
      return copy;
    });
  }
  function addVehicleGroup() {
    setCarburantGroups(prev => [
      ...prev,
      { vehicle: "", fuelType: "", rows: [{ details: "", date: "", invoiceNumber: "", qty: "" }] },
    ]);
  }
  function addRow(gIdx: number) {
    setCarburantGroups(prev => {
      const copy = [...prev];
      copy[gIdx].rows.push({ details: "", date: "", invoiceNumber: "", qty: "" });
      return copy;
    });
  }
  function removeRow(gIdx: number, rIdx: number) {
    setCarburantGroups(prev => {
      const copy = [...prev];
      copy[gIdx].rows.splice(rIdx, 1);
      if (copy[gIdx].rows.length === 0) copy.splice(gIdx, 1);
      return copy;
    });
  }
  function removeGroup(gIdx: number) {
    setCarburantGroups(prev => {
      const copy = [...prev];
      copy.splice(gIdx, 1);
      return copy;
    });
  }
  function flattenCarburantGroups(groups: CarburantGroup[]) {
    return groups.flatMap(group =>
      group.rows.map(row => ({
        "Liste des véhicules": group.vehicle,
        "Type de véhicule et type de carburant": group.fuelType,
        "Autres détails": row.details,
        "Date": row.date,
        "# facture": row.invoiceNumber,
        "Quantité Totale": row.qty,
      })),
    );
  }

  // Suppression/maj A3
  function removeA3Row(idx: number) {
    setA3Rows(prev => prev.filter((_, i) => i !== idx));
  }
  function updateA3Row(idx: number, key: keyof A3Row, value: string) {
    setA3Rows(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  }

  /* -------------------- Ajout rapide A3 / B1 -------------------- */
  function addA3Row() {
    setA3Rows(prev => [
      ...prev,
      { vehicle: "", type: "", date: "", cost: "", avgPrice: "", estimateQty: "", reference: "" },
    ]);
  }
  function addB1Row() {
    setB1Rows(prev => [
      ...prev,
      { vehicle: "", year: "", make: "", model: "", trans: "", distance: "", type: "", cons: "", estimate: "", reference: "", ac: "" },
    ]);
  }

  /* -------------------- Chargement user + visibilité -------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        console.error("🟥 No authenticated user found");
        return;
      }
      setUserId(user.id);

      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      // Trouver poste 2 via son libellé contenant "2"
      let p2id: string | null = null;
      if (data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          if (typeof label === "string" && label.toLowerCase().includes("2")) {
            p2id = id;
            break;
          }
        }
      }
      setPosteId(p2id);

      if (p2id) {
        setPosteLabel(data.posteLabels?.[p2id] || POSTE_LABEL_FALLBACK);
        setEnabledSources(data.sources?.[p2id] || []);
        setSourceVisibility(data.sourceVisibility?.[p2id] || {});
        console.log("🟨 [useEffect] Poste2 config:", {
          p2id,
          sources: data.sources?.[p2id] || [],
          sourceVisibility: data.sourceVisibility?.[p2id] || {},
          posteLabel: data.posteLabels?.[p2id] || POSTE_LABEL_FALLBACK,
        });
      } else {
        setPosteLabel(POSTE_LABEL_FALLBACK);
        setEnabledSources([]);
        setSourceVisibility({});
        console.warn("🟧 [useEffect] NO poste2Id found", { posteLabels: data.posteLabels });
      }
      setLoading(false);
    })();
  }, []);

  /* -------------------- Helpers UI -------------------- */
  const cardShadow = "0 8px 24px rgba(0,0,0,0.08)";

  const totalTco2e =
    gesResults?.reduce((acc: number, r: any) => {
      const v =
        Number(r?.total_ges_tco2e) ||
        Number(r?.total_co2_gco2e) / 1_000_000 || // fallback si gCO2e
        0;
      return acc + (isFinite(v) ? v : 0);
    }, 0) ?? 0;

  /* -------------------- Rendu -------------------- */
  return (
    <Box bg={pageBg} minH="100vh" px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }} color={COL.textBody}>
      <Stack maxW="1200px" mx="auto" spacing={6}>
        {/* Titre + aide */}
        <HStack justify="space-between" align="center">
          <Heading as="h1" size="lg">Émissions directes</Heading>
          <Icon as={HelpCircle} boxSize={4} />
        </HStack>

        {/* Pills/onglets (visuel) */}
        <HStack mt={2} spacing={4}>
          {[
            { title: "Combustions fixes", active: false },
            { title: "Combustions mobiles", active: true },
            { title: "Procédés", active: false },
            { title: "Réfrigérants", active: false },
            { title: "Sols et forêts", active: false },
          ].map(tab => (
            <Box
              key={tab.title}
              as="button"
              px={4}
              h="32px"
              rounded="16px"
              border="1px solid"
              borderColor={tab.active ? COL.greenPill : "#DAD7CD"}
              bg={tab.active ? COL.greenPill : "white"}
              color={tab.active ? "white" : COL.textBody}
              fontWeight={tab.active ? "bold" : "normal"}
              fontSize="sm"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={!tab.active ? { borderColor: COL.greenPill, color: COL.textBody } : {}}
            >
              {tab.title}
            </Box>
          ))}
        </HStack>

        {/* En-tête Poste + Carte latérale */}
        <HStack align="stretch" spacing={6}>
          <Box
            flex="1"
            bg={COL.surface}
            rounded="2xl"
            p={{ base: 5, md: 6 }}
            border="1px solid"
            borderColor={COL.border}
            boxShadow={cardShadow}
          >
            <VStack align="flex-start" spacing={2}>
              <Heading as="h2" size="md">{posteLabel}</Heading>
              <Text color={COL.textMuted}>
                Ici, vous pouvez entrer vos véhicules et équipements mobiles pour mesurer l’impact de leurs déplacements et de leur utilisation. Qu’il s’agisse de voitures, camions, camionnettes, équipements de levage, bateaux ou autres fonctionnant au combustible fossile, la plateforme calcule pour vous les émissions correspondantes.
              </Text>
            </VStack>
          </Box>

          {/* Carte droite (total basé sur gesResults) */}
          <Box
            w={{ base: "100%", md: "380px" }}
            bg={COL.surfaceMuted}
            rounded="2xl"
            p={{ base: 6, md: 7 }}
            border="1px solid"
            borderColor={COL.border}
            boxShadow={cardShadow}
          >
            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="sm" color={COL.textBody}>Votre consommation totale :</Heading>
              <Heading as="p" size="lg" lineHeight="1.1" color={COL.greenBar}>
                {Number(totalTco2e).toLocaleString("fr-CA", { maximumFractionDigits: 3 })} t de CO²e
              </Heading>

              <HStack
                alignSelf="flex-start"
                bg="white"
                rounded="full"
                px={5}
                h="40px"
                spacing={3}
                boxShadow="0 8px 16px rgba(0,0,0,0.15)"
                border="1px solid"
                borderColor="rgba(0,0,0,0.06)"
              >
                <Text fontWeight="semibold" color={COL.textMuted}>Section en cours</Text>
                <Box
                  as="span"
                  w="22px"
                  h="22px"
                  rounded="full"
                  bg="#e7ebe6"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  color={COL.textMuted}
                >
                  2
                </Box>
              </HStack>
            </VStack>
          </Box>
        </HStack>

        {/* --------- Contenu dynamique des sources --------- */}
        {loading || !userId ? (
          <CenterLoader />
        ) : enabledSources.length === 0 ? (
          <EmptySources />
        ) : (
          enabledSources.map((source) => {
            const code: string = source?.source_code;
            const posteSourceId: string | undefined = source?.id;
            const idStr: string = String(posteSourceId ?? ""); // ✅ assure une string pour A3/B1
            const isHidden = !!sourceVisibility[code];

            if (isHidden) {
              return (
                <Text
                  key={code}
                  color="red.600"
                  textAlign="center"
                  fontWeight="bold"
                  fontSize="lg"
                  mt={6}
                >
                  La source <b>{source.label}</b> est masquée pour votre compte.
                </Text>
              );
            }

            if (code === "2A1" && userId && posteSourceId) {
              return (
                <Box key={code}>
                  <SectionHeader
                    title="2A1 – Véhicules (Quantité de combustible utilisé)"
                    onAddClick={addVehicleGroup}
                  />
                  <DataTable>
                    <SourceA1Form
                      key={code}
                      posteSourceId={posteSourceId}
                      carburantGroups={carburantGroups}
                      updateGroupField={updateGroupField}
                      updateRowField={updateRowField}
                      addVehicleGroup={addVehicleGroup}
                      addRow={addRow}
                      removeRow={removeRow}
                      removeGroup={removeGroup}
                      flattenCarburantGroups={flattenCarburantGroups}
                      highlight={COL.greenBar}
                      tableBg={COL.section}
                      userId={userId}
                      gesResults={gesResults}
                      setGesResults={setGesResults}
                    />
                  </DataTable>
                </Box>
              );
            }

            if (code === "2A3") {
              return (
                <Box key={code} mt={6}>
                  <SectionHeader
                    title="2A3 – Véhicules (Distance parcourue ; L/100km)"
                    onAddClick={addA3Row}
                  />
                  <DataTable>
                    <Source2A3Form
                      key={code}
                      posteSourceId={idStr}
                      a3Rows={a3Rows}
                      setA3Rows={setA3Rows}
                      addA3Row={addA3Row}
                      removeA3Row={removeA3Row}
                      updateA3Row={updateA3Row}
                      userId={userId ?? ""}
                      gesResults={gesResults}
                      setGesResults={setGesResults}
                      highlight={COL.greenBar}
                      tableBg={COL.section}
                    />
                  </DataTable>
                </Box>
              );
            }

            if (code === "2B1") {
              return (
                <Box key={code} mt={6}>
                  <SectionHeader
                    title="2B1 – Véhicules (Estimation par type & conso)"
                    onAddClick={addB1Row}
                  />
                  <DataTable>
                    <SourceB1Form
                      key={code}
                      posteSourceId={idStr}
                      b1Rows={b1Rows}
                      setB1Rows={setB1Rows}
                      addB1Row={addB1Row}
                      userId={userId ?? ""}
                      gesResults={gesResults}
                      setGesResults={setGesResults}
                      highlight={COL.greenBar}
                      tableBg={COL.section}
                    />
                  </DataTable>
                </Box>
              );
            }

            return null;
          })
        )}
      </Stack>
    </Box>
  );
}

/* ================== UI building blocks (nouveau design) ================== */

function SectionHeader({ title, onAddClick }: { title: string; onAddClick?: () => void }) {
  return (
    <HStack justify="space-between" mt={2}>
      <Heading as="h3" size="md">{title}</Heading>
      <Button
        leftIcon={<Icon as={Plus} boxSize={4} />}
        bg={COL.greenBar}
        color="white"
        rounded="full"
        px={6}
        h="48px"
        boxShadow="0 10px 16px rgba(0,0,0,0.20)"
        _hover={{ bg: "#20372d" }}
        _active={{ bg: "#1a2f27" }}
        onClick={onAddClick}
      >
        Ajouter une ligne
      </Button>
    </HStack>
  );
}

/** Conteneur visuel sans barre d’en-tête “Saisie” (pour éviter le doublon) */
function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <Box
      mt={3}
      bg={COL.surface}
      rounded="2xl"
      border="1px solid"
      borderColor={COL.border}
      overflow="hidden"
      p={{ base: 3, md: 4 }}
    >
      {/* plus de bande verte ici — le contenu interne gère son propre header */}
      <Box bg={COL.section}>{children}</Box>
    </Box>
  );
}

function CenterLoader() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minH="40vh">
      <Spinner color={COL.greenBar} size="xl" />
    </Box>
  );
}

function EmptySources() {
  return (
    <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
      Aucun mode de saisie n'est activé pour ce poste.
    </Text>
  );
}



// import { useEffect, useState } from 'react';
// import { Box, Heading, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';
// import { SourceA1Form } from './SourceA1Form';
// import { Source2A3Form } from './SourceA3Form';
// import { SourceB1Form } from './SourceB1Form';

// // ---- Types for form state ----
// type CarburantRow = {
//   details: string;
//   date: string;
//   invoiceNumber: string;
//   qty: string;
// };
// type CarburantGroup = {
//   vehicle: string;
//   fuelType: string;
//   rows: CarburantRow[];
// };
// type A3Row = {
//   vehicle: string;
//   type: string;
//   date: string;
//   cost: string;
//   avgPrice: string;
//   estimateQty: string;
//   reference: string;
// };
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

// const POSTE_LABEL = "POSTE 2 – COMBUSTION MOBILE";

// export default function Poste2Page() {
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [posteId, setPosteId] = useState<string | null>(null);
//   const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL);
//   const [enabledSources, setEnabledSources] = useState<any[]>([]);
//   const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

//   // Shared data states for forms
//   const [carburantGroups, setCarburantGroups] = useState<CarburantGroup[]>([]);
//   const [a3Rows, setA3Rows] = useState<A3Row[]>([]);
//   const [b1Rows, setB1Rows] = useState<B1Row[]>([]);
//   const [gesResults, setGesResults] = useState<any[]>([]);

//   // --- All Handlers for A1 modularity ---
//   function updateGroupField(gIdx: number, key: keyof CarburantGroup, value: string) {
//     setCarburantGroups(prev => {
//       const copy = [...prev];
//       (copy[gIdx] as any)[key] = value;
//       return copy;
//     });
//   }
//   function updateRowField(gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) {
//     setCarburantGroups(prev => {
//       const copy = [...prev];
//       (copy[gIdx].rows[rIdx] as any)[key] = value;
//       return copy;
//     });
//   }
//   function addVehicleGroup() {
//     setCarburantGroups(prev => [
//       ...prev,
//       { vehicle: '', fuelType: '', rows: [{ details: '', date: '', invoiceNumber: '', qty: '' }] }
//     ]);
//   }
//   function addRow(gIdx: number) {
//     setCarburantGroups(prev => {
//       const copy = [...prev];
//       copy[gIdx].rows.push({ details: '', date: '', invoiceNumber: '', qty: '' });
//       return copy;
//     });
//   }
//   function removeRow(gIdx: number, rIdx: number) {
//     setCarburantGroups(prev => {
//       const copy = [...prev];
//       copy[gIdx].rows.splice(rIdx, 1);
//       if (copy[gIdx].rows.length === 0) copy.splice(gIdx, 1);
//       return copy;
//     });
//   }
//   function removeGroup(gIdx: number) {
//     setCarburantGroups(prev => {
//       const copy = [...prev];
//       copy.splice(gIdx, 1);
//       return copy;
//     });
//   }
//   function flattenCarburantGroups(groups: CarburantGroup[]) {
//     return groups.flatMap(group =>
//       group.rows.map(row => ({
//         "Liste des véhicules": group.vehicle,
//         "Type de véhicule et type de carburant": group.fuelType,
//         "Autres détails": row.details,
//         "Date": row.date,
//         "# facture": row.invoiceNumber,
//         "Quantité Totale": row.qty,
//       }))
//     );
//   }
//   function removeA3Row(idx: number) {
//   setA3Rows(prev => prev.filter((_, i) => i !== idx));
// }

// function updateA3Row(idx: number, key: keyof A3Row, value: string) {
//   setA3Rows(prev => {
//     const copy = [...prev];
//     copy[idx][key] = value;
//     return copy;
//   });
// }

//   async function handleA1Submit(posteSourceId) {
//   console.log('🟦 [handleA1Submit] Called with:', { posteSourceId, carburantGroups, userId });
//   if (!posteSourceId || !userId) {
//     console.error('🟥 [handleA1Submit] Missing required fields (posteSourceId or userId)', { posteSourceId, userId });
//     alert("Missing required fields (posteSourceId or userId)");
//     return;
//   }

//   // Compose the payload for both endpoints
//   const payload = {
//     user_id: userId,
//     poste_source_id: posteSourceId,
//     source_code: 'A1',
//     data: { groups: carburantGroups }
//   };

//   let results = [];
//   let webhookOk = false;

//   // 1. Call Cloud Run webhook to get GES results
//   try {
//     const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/2A1', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });
//     const result = await response.json();

//     if (!response.ok) {
//       console.error('🟥 [handleA1Submit] Cloud Run failed:', result);
//       alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
//     } else {
//       console.log('🟩 [handleA1Submit] Cloud Run success:', result);
//       results = Array.isArray(result.results) ? result.results : [];
//       webhookOk = true;
//     }
//   } catch (error) {
//     console.error('🟥 [handleA1Submit] Cloud Run network error:', error);
//     alert('Erreur réseau lors du calcul Cloud Run.');
//   }

//   // 2. Save to your database (Supabase/Postgres)
//   try {
//     // Merge the results in the payload for DB saving
//     const dbPayload = {
//       ...payload,
//       results,
//     };
//     const dbResponse = await fetch('/api/2submit', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(dbPayload),
//     });
//     const dbResult = await dbResponse.json();

//     if (!dbResponse.ok) {
//       console.error('🟥 [handleA1Submit] Database save failed:', dbResult);
//       alert('Erreur lors de la sauvegarde en base : ' + (dbResult.error || ''));
//     } else {
//       setGesResults(results); // Always show the GES result
//       alert(webhookOk
//         ? 'Données A1 calculées et sauvegardées avec succès!'
//         : 'Données A1 sauvegardées sans résultat de calcul GES.');
//     }
//   } catch (error) {
//     console.error('🟥 [handleA1Submit] Database network or logic error:', error);
//     alert('Erreur inattendue lors de la sauvegarde en base.');
//   }
// }

//   // --- A3/B1 modular add handlers ---
//   function addA3Row() {
//     setA3Rows(prev => [
//       ...prev,
//       { vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' }
//     ]);
//   }
//   function addB1Row() {
//     setB1Rows(prev => [
//       ...prev,
//       { vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' }
//     ]);
//   }

//   // --- Fetch user and config ---
//   const highlight = '#245a7c';
//   const bg = useColorModeValue('#f3f6ef', '#222e32');

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         setLoading(false);
//         console.error('🟥 No authenticated user found');
//         return;
//       }
//       setUserId(user.id);

//       // Fetch source visibility for this user
//       const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
//       const data = await res.json();

//       // Find the posteId for Poste 2 (by label containing "2")
//       let poste2Id: string | null = null;
//       if (data.posteLabels) {
//         for (const [id, label] of Object.entries(data.posteLabels)) {
//           if (typeof label === "string" && label.toLowerCase().includes("2")) {
//             poste2Id = id;
//             break;
//           }
//         }
//       }
//       setPosteId(poste2Id);

//       if (poste2Id) {
//         setPosteLabel(data.posteLabels?.[poste2Id] || POSTE_LABEL);
//         setEnabledSources(data.sources?.[poste2Id] || []);
//         setSourceVisibility(data.sourceVisibility?.[poste2Id] || {});
//         console.log('🟨 [useEffect] Poste2 config:', {
//           poste2Id,
//           sources: data.sources?.[poste2Id] || [],
//           sourceVisibility: data.sourceVisibility?.[poste2Id] || {},
//           posteLabel: data.posteLabels?.[poste2Id] || POSTE_LABEL
//         });
//       } else {
//         setPosteLabel(POSTE_LABEL);
//         setEnabledSources([]);
//         setSourceVisibility({});
//         console.warn('🟧 [useEffect] NO poste2Id found', { posteLabels: data.posteLabels });
//       }
//       setLoading(false);
//     })();
//   }, []);

//   // --- Modular form rendering ---
//   function getFormForSource(source: any) {
//     const code = source?.source_code;
//     const posteSourceId = source?.id;
//     console.log('🟩 [getFormForSource] Rendering for source:', { code, posteSourceId, source });

//     if (code === "2A1" && userId && posteSourceId) {
//       return (
//       <SourceA1Form
//   key={code}
//   posteSourceId={posteSourceId}
//   carburantGroups={carburantGroups}
//   updateGroupField={updateGroupField}
//   updateRowField={updateRowField}
//   addVehicleGroup={addVehicleGroup}
//   addRow={addRow}
//   removeRow={removeRow}
//   removeGroup={removeGroup}
//   flattenCarburantGroups={flattenCarburantGroups}
//   highlight={highlight}
//   tableBg={bg}
//   userId={userId}
//   gesResults={gesResults}
//   setGesResults={setGesResults}
// />

      
//       );
//     }
//     if (code === "2A3")
//       return (
//         <Source2A3Form
//   key={code}
//   posteSourceId={posteSourceId}
//   a3Rows={a3Rows}
//   setA3Rows={setA3Rows}
//   addA3Row={addA3Row}
//   removeA3Row={removeA3Row}
//   updateA3Row={updateA3Row}
//   userId={userId ?? ""}
//   gesResults={gesResults}
//   setGesResults={setGesResults}
//   highlight={highlight}
//   tableBg={bg}
// />



//       );
//     if (code === "2B1")
//   return (
//     <SourceB1Form
//       key={code}
//       b1Rows={b1Rows}
//       setB1Rows={setB1Rows}
//       addB1Row={addB1Row}
//       posteSourceId={posteSourceId}
//       userId={userId ?? ""}
//       gesResults={gesResults}
//       setGesResults={setGesResults}
//       highlight={highlight}
//       tableBg={bg}
//     />
//   );

//     return null;
//   }

//   return (
//     <Box minH="100vh" bg={bg} py={10} px={{ base: 2, md: 10 }}>
//       <Box maxW="7xl" mx="auto">
//         <Heading as="h1" size="xl" color={highlight} textAlign="center" mb={2} fontWeight="bold">
//           {posteLabel}
//         </Heading>
//         {loading || !userId || !enabledSources.length ? (
//           <Box display="flex" alignItems="center" justifyContent="center" minH="50vh">
//             <Spinner color={highlight} size="xl" />
//           </Box>
//         ) : enabledSources.length === 0 ? (
//           <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
//             Aucun mode de saisie n'est activé pour ce poste.
//           </Text>
//         ) : (
//           enabledSources.map((source) => {
//             const isHidden = !!sourceVisibility[source.source_code];
//             if (isHidden) {
//               return (
//                 <Text key={source.source_code} color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
//                   La source <b>{source.label}</b> est masquée pour votre compte.
//                 </Text>
//               );
//             }
//             return getFormForSource(source);
//           })
//         )}
//       </Box>
//     </Box>
//   );
// }
