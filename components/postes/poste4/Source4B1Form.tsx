import React, { useState } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
} from '@chakra-ui/react';

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

const REFRIGERATION_TYPE_OPTIONS = [
  'Climatisation - Automobile',
];

const REFRIGERANT_OPTIONS = [
  'R-134a',
];

const CLIMATISATION_OPTIONS = [
  'Oui',
  'Non',
];

export function Source4B1Form({
  rows = [],
  setRows,
  addRow,
  removeRow,
  updateRow,
  highlight = '#245a7c',
  tableBg = '#f3f6ef',
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: Source4B1FormProps) {
  const [loading, setLoading] = useState(false);

  const validateData = (rows: Source4B1Row[]) =>
    rows.length > 0 && rows.every(row =>
      row.vehicle && row.date && row.months && row.site && row.refrigerationType && row.refrigerant && row.qtyInEquipment && row.climatisation
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

    const sanitizedRows = rows.map(row => ({
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
      source_code: '4B1',
      poste_num: 4,
      data: { rows: sanitizedRows },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // 1. Cloud Run webhook call
    try {
      const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/4B1', {
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
      const dbPayload = {
        ...payload,
        results,
      };
      const dbResponse = await fetch('/api/4submit', {
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
          ? 'Données 4B1 calculées et sauvegardées avec succès!'
          : 'Données 4B1 sauvegardées sans résultat de calcul GES.');
      }
    } catch (error) {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }

    setLoading(false);
  };

  // Only display result columns with at least one non-empty/non-#N/A value
  const displayColumns = resultFields.filter(f =>
    gesResults.some(res =>
      res && res[f.key] !== undefined && res[f.key] !== "" && res[f.key] !== "#N/A"
    )
  );

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        4B1 – Climatisation des véhicules
      </Heading>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Liste des véhicules</Th>
            <Th>Description</Th>
            <Th>Date</Th>
            <Th>mois</Th>
            <Th>Site</Th>
            <Th>Produit</Th>
            <Th>Références</Th>
            <Th>Type d'équipement de réfrigération</Th>
            <Th>Type de réfrigérant</Th>
            <Th>Quantité dans l'équipement [lbs]</Th>
            <Th>Fuites constaté par le frigoriste [lbs] (Facultatif)</Th>
            <Th>Climatisation</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, idx) => (
            <Tr key={idx}>
              <Td>
                <Input
                  value={row.vehicle}
                  onChange={e => updateRow(idx, "vehicle", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.description}
                  onChange={e => updateRow(idx, "description", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  type="date"
                  value={row.date}
                  onChange={e => updateRow(idx, "date", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.months}
                  onChange={e => updateRow(idx, "months", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.site}
                  onChange={e => updateRow(idx, "site", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  value={row.product}
                  onChange={e => updateRow(idx, "product", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  value={row.reference}
                  onChange={e => updateRow(idx, "reference", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Select
                  value={row.refrigerationType}
                  onChange={e => updateRow(idx, "refrigerationType", e.target.value)}
                  placeholder="(Sélectionner)"
                >
                  {REFRIGERATION_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              </Td>
              <Td>
                <Select
                  value={row.refrigerant}
                  onChange={e => updateRow(idx, "refrigerant", e.target.value)}
                  placeholder="(Sélectionner)"
                >
                  {REFRIGERANT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.qtyInEquipment}
                  onChange={e => updateRow(idx, "qtyInEquipment", e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.leakObserved}
                  onChange={e => updateRow(idx, "leakObserved", e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Select
                  value={row.climatisation}
                  onChange={e => updateRow(idx, "climatisation", e.target.value)}
                  placeholder="Oui / Non"
                >
                  {CLIMATISATION_OPTIONS.map(opt => (
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

      <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
        <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
        {(gesResults && gesResults.length > 0 && displayColumns.length > 0) ? (
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                {displayColumns.map(f => (
                  <Th key={f.key}>{f.label}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {gesResults.map((result, idx) => (
                <Tr key={idx}>
                  {displayColumns.map(f => (
                    <Td fontWeight="bold" key={f.key}>
                      {(result[f.key] && result[f.key] !== "#N/A") ? result[f.key] : "-"}
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
//   { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
//   { key: "total_ges_ch4_gco2e", label: "CH₄ [gCO2e]" },
//   { key: "total_ges_n2o_gco2e", label: "N₂O [gCO2e]" },
//   { key: "total_ges_gco2e", label: "Total GES [gCO2e]" },
//   { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
//   { key: "total_energie_kwh", label: "Énergie équivalente [kWh]" },
// ];

// type GesResult = {
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

// const REFRIGERATION_TYPE_OPTIONS = [
//   'Climatisation - Automobile',
// ];

// const REFRIGERANT_OPTIONS = [
//   'R-134a',
// ];

// const CLIMATISATION_OPTIONS = [
//   'Oui',
//   'Non',
// ];

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

//   const validateData = (rows: Source4B1Row[]) =>
//     rows.length > 0 && rows.every(row =>
//       row.vehicle && row.date && row.months && row.site && row.refrigerationType && row.refrigerant && row.qtyInEquipment && row.climatisation
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

//     // 1. Cloud Run webhook call
//     try {
//       const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/4B1', {
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
//           ? 'Données 4B1 calculées et sauvegardées avec succès!'
//           : 'Données 4B1 sauvegardées sans résultat de calcul GES.');
//       }
//     } catch (error) {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }

//     setLoading(false);
//   };

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
//       <Table size="sm" variant="simple">
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

