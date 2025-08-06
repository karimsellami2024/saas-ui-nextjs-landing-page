import React, { useState } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Stack, Select, Text,
} from '@chakra-ui/react';

export type Source1ARow = {
  equipment: string;
  description: string;
  date: string;
  site: string;
  product: string;
  reference: string;
  usageAndFuel: string;
  qty: string;
  unit: string;
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface Source1AFormProps {
  rows: Source1ARow[];
  setRows: React.Dispatch<React.SetStateAction<Source1ARow[]>>;
  highlight?: string;
  tableBg?: string;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

const FUEL_OPTIONS = [
  "Génératrice - Mazout [L]",
  "Chauffage - Bois [kg]",
  "Chauffage - Propane [L]",
  // Add more as needed
];
const UNIT_OPTIONS = [
  "L", "kg"
];

export function Source1AForm({
  rows = [],
  setRows,
  highlight = '#245a7c',
  tableBg = '#f3f6ef',
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: Source1AFormProps) {
  const [loading, setLoading] = useState(false);

  // Validate all fields except facultatif
  const validateData = (rows: Source1ARow[]) => {
    return rows.length > 0 && rows.every(row =>
      row.equipment &&
      row.site &&
      row.product &&
      row.usageAndFuel &&
      row.qty &&
      row.unit
    );
  };

  // --- THE NEW HANDLESUBMIT ---
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

    // 1. Sanitize and prepare data
    const sanitizedRows = rows.map(row => ({
      ...row,
      qty: parseFloat(row.qty) || 0, // convert qty to number
    }));
    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: '1A1',
      data: { rows: sanitizedRows },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // 2. Cloud Run webhook call
    try {
      const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/1A1', {
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

    // 3. Save to database (Supabase/Postgres)
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
          ? 'Données 1A1 calculées et sauvegardées avec succès!'
          : 'Données 1A1 sauvegardées sans résultat de calcul GES.');
      }
    } catch (error) {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }

    setLoading(false);
  };

  // Handlers
  const addRow = () =>
    setRows(prev => [
      ...prev,
      {
        equipment: "",
        description: "",
        date: "",
        site: "",
        product: "",
        reference: "",
        usageAndFuel: "",
        qty: "",
        unit: "",
      },
    ]);

  const updateRowField = (idx: number, key: keyof Source1ARow, value: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        Chauffage des bâtiments et équipements fixes – Source 1A1
      </Heading>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Liste d'équipements</Th>
            <Th>Description</Th>
            <Th>Date</Th>
            <Th>Site</Th>
            <Th>Produit</Th>
            <Th>Références</Th>
            <Th>Utilisation et Combustible</Th>
            <Th>Quantité</Th>
            <Th>Unité</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, idx) => (
            <Tr key={idx}>
              <Td>
                <Input
                  value={row.equipment}
                  onChange={e => updateRowField(idx, "equipment", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.description}
                  onChange={e => updateRowField(idx, "description", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  type="date"
                  value={row.date}
                  onChange={e => updateRowField(idx, "date", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  value={row.site}
                  onChange={e => updateRowField(idx, "site", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.product}
                  onChange={e => updateRowField(idx, "product", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.reference}
                  onChange={e => updateRowField(idx, "reference", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Select
                  value={row.usageAndFuel}
                  onChange={e => updateRowField(idx, "usageAndFuel", e.target.value)}
                  placeholder="(Sélectionner)"
                >
                  {FUEL_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.qty}
                  onChange={e => updateRowField(idx, "qty", e.target.value)}
                />
              </Td>
              <Td>
                <Select
                  value={row.unit}
                  onChange={e => updateRowField(idx, "unit", e.target.value)}
                  placeholder="Unité"
                >
                  {UNIT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              </Td>
              <Td>
                <Button
                  size="xs"
                  colorScheme="red"
                  onClick={() => removeRow(idx)}
                  title="Supprimer la ligne"
                >-</Button>
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
      {/* Optionally, results table */}
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
            {gesResults.map((row, idx) => (
              <Tr key={idx}>
                <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}


// import React, { useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Stack, Select, Text,
// } from '@chakra-ui/react';

// export type Source1ARow = {
//   equipment: string;
//   description: string;
//   date: string;
//   site: string;
//   product: string;
//   reference: string;
//   usageAndFuel: string;
//   qty: string;
//   unit: string;
// };

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// export interface Source1AFormProps {
//   rows: Source1ARow[];
//   setRows: React.Dispatch<React.SetStateAction<Source1ARow[]>>;
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string;
//   userId: string;
//   handleSubmit: (posteSourceId: string) => Promise<void>;
//   gesResults?: GesResult[];
// }

// const FUEL_OPTIONS = [
//   "Génératrice - Mazout [L]",
//   "Chauffage - Bois [kg]",
//   "Chauffage - Propane [L]",
//   // Add more as needed
// ];
// const UNIT_OPTIONS = [
//   "L", "kg"
// ];

// export function Source1AForm({
//   rows = [],
//   setRows,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
//   posteSourceId,
//   userId,
//   handleSubmit,
//   gesResults = [],
// }: Source1AFormProps) {
//   const [loading, setLoading] = useState(false);

//   // Validate all fields except facultatif
//   const validateData = (rows: Source1ARow[]) => {
//     return rows.length > 0 && rows.every(row =>
//       row.equipment &&
//       row.site &&
//       row.product &&
//       row.usageAndFuel &&
//       row.qty &&
//       row.unit
//     );
//   };

//   const handleFormSubmit = async () => {
//     if (!posteSourceId || !userId) {
//       alert("Champs obligatoires manquants (posteSourceId ou userId)");
//       return;
//     }
//     if (!validateData(rows)) {
//       alert("Veuillez remplir tous les champs requis.");
//       return;
//     }
//     setLoading(true);
//     try {
//       // Sanitize and prepare data for submission
//       const sanitizedRows = rows.map(row => ({
//         ...row,
//         qty: parseFloat(row.qty) || 0, // convert qty to number
//       }));
//       const payload = {
//         user_id: userId,
//         poste_source_id: posteSourceId,
//         source_code: '1A1',
//         data: { rows: sanitizedRows },
//       };
//       console.log('🟦 [handleFormSubmit] Sending payload:', JSON.stringify(payload, null, 2));
//       await handleSubmit(posteSourceId);
//     } catch (error) {
//       console.error('🟥 [handleFormSubmit] Submission error:', error);
//       alert("Erreur lors de la soumission.");
//     }
//     setLoading(false);
//   };

//   // Handlers
//   const addRow = () =>
//     setRows(prev => [
//       ...prev,
//       {
//         equipment: "",
//         description: "",
//         date: "",
//         site: "",
//         product: "",
//         reference: "",
//         usageAndFuel: "",
//         qty: "",
//         unit: "",
//       },
//     ]);

//   const updateRowField = (idx: number, key: keyof Source1ARow, value: string) => {
//     setRows(prev => {
//       const copy = [...prev];
//       copy[idx][key] = value;
//       return copy;
//     });
//   };

//   const removeRow = (idx: number) => {
//     setRows(prev => prev.filter((_, i) => i !== idx));
//   };

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         Chauffage des bâtiments et équipements fixes – Source 1A1
//       </Heading>
//       <Table size="sm" variant="simple">
//         <Thead>
//           <Tr>
//             <Th>Liste d'équipements</Th>
//             <Th>Description</Th>
//             <Th>Date</Th>
//             <Th>Site</Th>
//             <Th>Produit</Th>
//             <Th>Références</Th>
//             <Th>Utilisation et Combustible</Th>
//             <Th>Quantité</Th>
//             <Th>Unité</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {rows.map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Input
//                   value={row.equipment}
//                   onChange={e => updateRowField(idx, "equipment", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.description}
//                   onChange={e => updateRowField(idx, "description", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="date"
//                   value={row.date}
//                   onChange={e => updateRowField(idx, "date", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.site}
//                   onChange={e => updateRowField(idx, "site", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.product}
//                   onChange={e => updateRowField(idx, "product", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.reference}
//                   onChange={e => updateRowField(idx, "reference", e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Select
//                   value={row.usageAndFuel}
//                   onChange={e => updateRowField(idx, "usageAndFuel", e.target.value)}
//                   placeholder="(Sélectionner)"
//                 >
//                   {FUEL_OPTIONS.map(opt => (
//                     <option key={opt} value={opt}>{opt}</option>
//                   ))}
//                 </Select>
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.qty}
//                   onChange={e => updateRowField(idx, "qty", e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Select
//                   value={row.unit}
//                   onChange={e => updateRowField(idx, "unit", e.target.value)}
//                   placeholder="Unité"
//                 >
//                   {UNIT_OPTIONS.map(opt => (
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
//         onClick={handleFormSubmit}
//         isLoading={loading}
//       >
//         Soumettre
//       </Button>
//       {/* Optionally, results table */}
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
//             {gesResults.map((row, idx) => (
//               <Tr key={idx}>
//                 <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
//               </Tr>
//             ))}
//           </Tbody>
//         </Table>
//       </Box>
//     </Box>
//   );
// }
