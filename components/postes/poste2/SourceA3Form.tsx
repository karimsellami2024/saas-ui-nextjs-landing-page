import React, { useEffect, useState } from 'react';
import {
  Box, HStack, VStack, Grid, GridItem,
  Text, Button, Icon, Input, useColorModeValue, Spinner
} from '@chakra-ui/react';
import { Plus, Trash2, Copy, Lock, Calendar } from 'lucide-react';
import VehicleSelect from "#components/vehicleselect/VehicleSelect";
import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

export type A3Row = {
  vehicle: string;
  type: string;
  date: string;
  cost: string;        // reused as "Nom du site"
  avgPrice: string;    // reused as "Commentaires"
  estimateQty: string; // reused as "Distance"
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
  highlight = '#245a7c',
  tableBg = '#f3f6ef',
}: Source2A3FormProps) {
  const [loading, setLoading] = useState(false);

  const inputBorder = useColorModeValue('#E8ECE7', '#2f3a36');
  const faintLine = useColorModeValue('rgba(0,0,0,0.12)', 'rgba(255,255,255,0.12)');
  const headerFg = 'white';

  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, '2A3', { rows: [] });

  useEffect(() => {
    if (Array.isArray(prefillData?.rows) && prefillData.rows.length) {
      setA3Rows(prefillData.rows as A3Row[]);
    }
    if (prefillResults) {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults]);

  const validateData = (rows: A3Row[]) =>
    rows.length > 0 &&
    rows.every(row => row.vehicle && row.type && row.date && row.estimateQty);

  const handle2A3Submit = async () => {
    if (!posteSourceId || !userId) {
      alert("Missing required fields (posteSourceId or userId)");
      return;
    }
    if (!validateData(a3Rows)) {
      alert("Veuillez remplir tous les champs requis.");
      return;
    }
    setLoading(true);

    const sanitizedRows = a3Rows.map(row => ({
      ...row,
      site: row.cost,
      commentaires: row.avgPrice,
      cost: parseFloat(row.cost) || 0,
      avgPrice: parseFloat(row.avgPrice) || 0,
      estimateQty: parseFloat(row.estimateQty) || 0,
    }));

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 2,
      source_code: '2A3',
      data: { rows: sanitizedRows }
    };

    let results: any[] = [];
    let webhookOk = false;

    try {
      const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/2A3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
      } else {
        results = Array.isArray(result.results) ? result.results : result.results || [];
        webhookOk = true;
      }
    } catch {
      alert('Erreur réseau lors du calcul Cloud Run.');
    }

    try {
      const dbPayload = { ...payload, results };
      const dbResponse = await fetch('/api/2submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        alert('Erreur lors de la sauvegarde en base : ' + (dbResult.error || ''));
      } else {
        setGesResults(results as GesResult[]);
        alert(
          webhookOk
            ? 'Données 2A3 calculées et sauvegardées avec succès!'
            : 'Données 2A3 sauvegardées sans résultat de calcul GES.'
        );
      }
    } catch {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }

    setLoading(false);
  };

  return (
    <VStack align="stretch" spacing={3}>
      {/* Prefill status */}
      <HStack justify="flex-end" spacing={3}>
        {prefillLoading && (
          <HStack spacing={2} color="gray.500">
            <Spinner size="sm" /> <Text fontSize="sm">Chargement…</Text>
          </HStack>
        )}
        {prefillError && (
          <Text fontSize="sm" color="red.500">Préchargement: {prefillError}</Text>
        )}
      </HStack>

      {/* Header row */}
      <Grid
        templateColumns="2fr 1.6fr 1.6fr 1.2fr 1.2fr 1.2fr 96px"
        bg={highlight}
        color={headerFg}
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

      {/* Rows */}
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
              <GridItem><PillInput placeholder="Véhicule" value={row.vehicle} onChange={(v) => updateA3Row(idx, 'vehicle', v)} inputBorder={inputBorder} /></GridItem>
              <GridItem><PillInput placeholder="Nom du site" value={row.cost} onChange={(v) => updateA3Row(idx, 'cost', v)} inputBorder={inputBorder} /></GridItem>
              <GridItem><PillVehicleSelect value={row.type} onChange={(v) => updateA3Row(idx, 'type', v)} inputBorder={inputBorder} /></GridItem>
              <GridItem><PillInput placeholder="Distance (km)" value={row.estimateQty} onChange={(v) => updateA3Row(idx, 'estimateQty', v)} inputBorder={inputBorder} /></GridItem>
              <GridItem><PillInput placeholder="Référence" value={row.reference} onChange={(v) => updateA3Row(idx, 'reference', v)} inputBorder={inputBorder} /></GridItem>
              <GridItem><PillDate value={row.date} onChange={(v) => updateA3Row(idx, 'date', v)} inputBorder={inputBorder} /></GridItem>
              <GridItem>
                <HStack spacing={2} justify="flex-end" pr={1}>
                  <MiniIconBtn icon={Lock} ariaLabel="Verrouiller" />
                  <MiniIconBtn icon={Copy} ariaLabel="Dupliquer" onClick={() => setA3Rows(prev => { const copy = [...prev]; copy.splice(idx + 1, 0, { ...row }); return copy; })} />
                  <MiniIconBtn icon={Trash2} ariaLabel="Supprimer" onClick={() => removeA3Row(idx)} />
                </HStack>
              </GridItem>
            </Grid>

            {/* Comment + result line */}
            <HStack spacing={3} align="center" px={1} py={3}>
              <PillInput placeholder="Commentaires" value={row.avgPrice} onChange={(v) => updateA3Row(idx, 'avgPrice', v)} inputBorder={inputBorder} full />
              <Text ml="auto" fontSize="sm" color="gray.600">
                <strong>{formatResult(gesResults[idx])}</strong>
              </Text>
            </HStack>
            <Box h="2px" bg={faintLine} mx={2} rounded="full" />
          </Box>
        ))}

        {/* Placeholder row */}
        {(!a3Rows || a3Rows.length === 0) && (
          <Box p={4} textAlign="center" color="gray.500">
            Aucune ligne. Cliquez sur “Ajouter une ligne” pour commencer.
          </Box>
        )}
      </VStack>

      {/* Footer buttons */}
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

      {/* ✅ Recap summary box kept here */}
      {Array.isArray(gesResults) && gesResults.length > 0 && (
        <Box mt={4} bg="#e5f2fa" rounded="xl" p={4} boxShadow="sm">
          <Text fontWeight="bold" color={highlight} mb={2}>
            Calculs et résultats (récapitulatif)
          </Text>
          <Grid templateColumns="repeat(6, 1fr)" gap={3} fontSize="sm">
            <ResultPill label="CO₂ [gCO₂e]" value={sumField(gesResults, 'total_co2_gco2e')} />
            <ResultPill label="CH₄ [gCO₂e]" value={sumField(gesResults, 'total_ges_ch4_gco2e')} />
            <ResultPill label="N₂O [gCO₂e]" value={sumField(gesResults, 'total_ges_n2o_gco2e')} />
            <ResultPill label="Total GES [gCO₂e]" value={sumField(gesResults, 'total_ges_gco2e')} />
            <ResultPill label="Total GES [tCO₂e]" value={sumField(gesResults, 'total_ges_tco2e')} />
            <ResultPill label="Énergie [kWh]" value={sumField(gesResults, 'total_energie_kwh')} />
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
      <Text fontSize="xs" color="gray.600">{label}</Text>
      <Text fontWeight="bold">{value}</Text>
    </VStack>
  );
}

/* ===== Utils ===== */
function sumField(results: GesResult[], key: keyof GesResult): string {
  const s = results.reduce((acc, r) => acc + (toNum(r[key]) || 0), 0);
  return formatNumber(s);
}
function toNum(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (typeof v === 'number' ? v : NaN);
  return isFinite(n) ? n : 0;
}
function formatNumber(n: number): string {
  return Number(n).toLocaleString('fr-CA', { maximumFractionDigits: 3 });
}
function formatResult(r?: GesResult): string {
  if (!r) return '-';
  const t = r.total_ges_tco2e ?? r.total_ges_gco2e ?? r.total_co2_gco2e ?? '-';
  if (t === '-') return '-';
  const n = toNum(t as any);
  return n > 10_000
    ? `${formatNumber(n)} gCO₂e`
    : `${formatNumber(n)} ${String(t).includes('t') ? 'tCO₂e' : 'gCO₂e'}`;
}

// import React, { useEffect, useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Stack, Text,
// } from '@chakra-ui/react';
// import VehicleSelect from "#components/vehicleselect/VehicleSelect";
// import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

// export type A3Row = {
//   vehicle: string;
//   type: string;
//   date: string;
//   cost: string;
//   avgPrice: string;
//   estimateQty: string;
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

//   // === Prefill from /api/get-source (poste 2, source 2A3) ===
//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource(userId, 2, '2A3', { rows: [] });

//   useEffect(() => {
//     // Inject saved rows
//     if (Array.isArray(prefillData?.rows) && prefillData.rows.length) {
//       setA3Rows(prefillData.rows as A3Row[]);
//     }
//     // Inject saved results
//     if (prefillResults) {
//       const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults]);

//   // Validate all required fields before submission
//   const validateData = (rows: A3Row[]) =>
//     rows.length > 0 &&
//     rows.every(row =>
//       row.vehicle && row.type && row.date && row.cost && row.avgPrice && row.estimateQty
//     );

//   // Handles form submission, including API calls and results display
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

//     // Sanitize and prepare data for submission
//     const sanitizedRows = a3Rows.map(row => ({
//       ...row,
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

//     // 1) Cloud Run webhook
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

//     // 2) Save to DB
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
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         Source 2A3 – Véhicules (Coûts des carburants)
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
//             <Th>Détails sur les véhicules</Th>
//             <Th>Type de véhicule et carburant</Th>
//             <Th>Date du reçu</Th>
//             <Th>Coûts en carburants [$]</Th>
//             <Th>Prix moyen du carburant [$]</Th>
//             <Th>Estimation quantité [L]</Th>
//             <Th>Références</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {(a3Rows || []).map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Input
//                   value={row.vehicle}
//                   onChange={e => updateA3Row(idx, "vehicle", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <VehicleSelect
//                   value={row.type}
//                   onChange={(val) => updateA3Row(idx, "type", val)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="date"
//                   value={row.date}
//                   onChange={e => updateA3Row(idx, "date", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.cost}
//                   onChange={e => updateA3Row(idx, "cost", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.avgPrice}
//                   onChange={e => updateA3Row(idx, "avgPrice", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.estimateQty}
//                   onChange={e => updateA3Row(idx, "estimateQty", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.reference}
//                   onChange={e => updateA3Row(idx, "reference", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Button
//                   size="xs"
//                   colorScheme="red"
//                   onClick={() => removeA3Row(idx)}
//                   title="Supprimer la ligne"
//                 >-</Button>
//               </Td>
//             </Tr>
//           ))}
//         </Tbody>
//       </Table>

//       <Button mt={3} colorScheme="green" onClick={addA3Row}>
//         Ajouter une ligne
//       </Button>
//       <Button
//         mt={3}
//         ml={4}
//         colorScheme="blue"
//         onClick={handle2A3Submit}
//         isLoading={loading}
//       >
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
//             {(a3Rows || []).map((_, idx: number) => {
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

