import React, { useState } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Stack, Text,
} from '@chakra-ui/react';

export type A3Row = {
  vehicle: string;
  type: string;
  date: string;
  cost: string;
  avgPrice: string;
  estimateQty: string;
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

  // Validate all required fields before submission
  const validateData = (rows: A3Row[]) => {
    return rows.length > 0 && rows.every(row =>
      row.vehicle && row.type && row.date && row.cost && row.avgPrice && row.estimateQty
    );
  };

  // Handles form submission, including API calls and results display
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

    // Sanitize and prepare data for submission
    const sanitizedRows = a3Rows.map(row => ({
      ...row,
      cost: parseFloat(row.cost) || 0,
      avgPrice: parseFloat(row.avgPrice) || 0,
      estimateQty: parseFloat(row.estimateQty) || 0,
    }));

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: '2A3',
      data: { rows: sanitizedRows }
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // 1. Call Cloud Run webhook to get GES results
    try {
      const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/2A3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
      } else {
        results = Array.isArray(result.results) ? result.results : [];
        webhookOk = true;
      }
    } catch (error) {
      alert('Erreur réseau lors du calcul Cloud Run.');
    }

    // 2. Save to your database (Supabase/Postgres)
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
        setGesResults(results);
        alert(webhookOk
          ? 'Données 2A3 calculées et sauvegardées avec succès!'
          : 'Données 2A3 sauvegardées sans résultat de calcul GES.');
      }
    } catch (error) {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }

    setLoading(false);
  };

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        Source 2A3 – Véhicules (Coûts des carburants)
      </Heading>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Détails sur les véhicules</Th>
            <Th>Type de véhicule et carburant</Th>
            <Th>Date du reçu</Th>
            <Th>Coûts en carburants [$]</Th>
            <Th>Prix moyen du carburant [$]</Th>
            <Th>Estimation quantité [L]</Th>
            <Th>Références</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {(a3Rows || []).map((row, idx) => (
            <Tr key={idx}>
              <Td>
                <Input
                  value={row.vehicle}
                  onChange={e => updateA3Row(idx, "vehicle", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.type}
                  onChange={e => updateA3Row(idx, "type", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  type="date"
                  value={row.date}
                  onChange={e => updateA3Row(idx, "date", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.cost}
                  onChange={e => updateA3Row(idx, "cost", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.avgPrice}
                  onChange={e => updateA3Row(idx, "avgPrice", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.estimateQty}
                  onChange={e => updateA3Row(idx, "estimateQty", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.reference}
                  onChange={e => updateA3Row(idx, "reference", e.target.value)}
                />
              </Td>
              <Td>
                <Button
                  size="xs"
                  colorScheme="red"
                  onClick={() => removeA3Row(idx)}
                  title="Supprimer la ligne"
                >-</Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Button mt={3} colorScheme="green" onClick={addA3Row}>
        Ajouter une ligne
      </Button>
      <Button
        mt={3}
        ml={4}
        colorScheme="blue"
        onClick={handle2A3Submit}
        isLoading={loading}
      >
        Soumettre
      </Button>
      <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
        <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
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
            {(a3Rows || []).map((_, idx: number) => {
              const row = gesResults[idx] || {};
              return (
                <Tr key={idx}>
                  <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

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
// } from '@chakra-ui/react';

// // Define type for A3Row for type safety
// type A3Row = {
//   vehicle: string;
//   type: string;
//   date: string;
//   cost: string;
//   avgPrice: string;
//   estimateQty: string;
//   reference: string;
// };

// type SourceA3FormProps = {
//   a3Rows?: A3Row[];
//   setA3Rows: (rows: A3Row[]) => void;
//   addA3Row: () => void;
//   highlight?: string;
//   tableBg?: string;
// };

// export function SourceA3Form({
//   a3Rows = [],
//   setA3Rows,
//   addA3Row,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef'
// }: SourceA3FormProps) {
//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} pb={2} mb={4} borderBottom="1px" borderColor={`${highlight}30`}>
//         Source A3 – Véhicules (Coûts des carburants)
//       </Heading>
//       <Table size="sm" variant="simple" bg={tableBg}>
//         <Thead>
//           <Tr>
//             <Th>Détails sur les véhicules</Th>
//             <Th>Type de véhicule et carburant</Th>
//             <Th>Date du reçu</Th>
//             <Th>Coûts en carburants [$]</Th>
//             <Th>Prix moyen du carburant [$]</Th>
//             <Th>Estimation quantité [L]</Th>
//             <Th>Références</Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {(a3Rows || []).map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Input
//                   value={row.vehicle}
//                   onChange={e => {
//                     const updated = [...a3Rows];
//                     updated[idx].vehicle = e.target.value;
//                     setA3Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.type}
//                   onChange={e => {
//                     const updated = [...a3Rows];
//                     updated[idx].type = e.target.value;
//                     setA3Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.date}
//                   onChange={e => {
//                     const updated = [...a3Rows];
//                     updated[idx].date = e.target.value;
//                     setA3Rows(updated);
//                   }}
//                   type="date"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.cost}
//                   onChange={e => {
//                     const updated = [...a3Rows];
//                     updated[idx].cost = e.target.value;
//                     setA3Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.avgPrice}
//                   onChange={e => {
//                     const updated = [...a3Rows];
//                     updated[idx].avgPrice = e.target.value;
//                     setA3Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.estimateQty}
//                   onChange={e => {
//                     const updated = [...a3Rows];
//                     updated[idx].estimateQty = e.target.value;
//                     setA3Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.reference}
//                   onChange={e => {
//                     const updated = [...a3Rows];
//                     updated[idx].reference = e.target.value;
//                     setA3Rows(updated);
//                   }}
//                 />
//               </Td>
//             </Tr>
//           ))}
//         </Tbody>
//       </Table>
//       <Button mt={3} onClick={addA3Row} colorScheme="blue" rounded="xl">
//         Ajouter une ligne
//       </Button>
//     </Box>
//   );
// }
