import React, { useState } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
} from '@chakra-ui/react';

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
  energie_kwh?: string | number;
};

export interface Source4A1FormProps {
  rows: Source4A1Row[];
  setRows: (rows: Source4A1Row[]) => void;
  addRow: () => void;
  removeRow: (idx: number) => void;
  updateRow: (idx: number, key: keyof Source4A1Row, value: string) => void;
  highlight?: string;
  tableBg?: string;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

const REFRIGERATION_TYPE_OPTIONS = [
  'Climatisation commerciale/industrielle',
  'Réfrigération – Commerciale / industriel',
];

const REFRIGERANT_OPTIONS = [
  'R-134a', 'R-448a',
];

export function Source4A1Form({
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
}: Source4A1FormProps) {
  const [loading, setLoading] = useState(false);

  const validateData = (rows: Source4A1Row[]) =>
    rows.length > 0 && rows.every(row =>
      row.equipment && row.date && row.months && row.site && row.refrigerationType && row.refrigerant && row.qtyInEquipment
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
      equipment: row.equipment,
      description: row.description,
      date: row.date,
      months: row.months,
      site: row.site,
      product: row.product,
      reference: row.reference,
      equipmentType: row.refrigerationType,
      refrigerantType: row.refrigerant,
      qty: parseFloat(row.qtyInEquipment) || 0,
      leaks: parseFloat(row.leakObserved) || 0,
    }));

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      source_code: '4A1',
      poste_num: 4,
      data: { rows: sanitizedRows },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // 1. Cloud Run webhook call
    try {
      const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/4A1', {
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
          ? 'Données 4A1 calculées et sauvegardées avec succès!'
          : 'Données 4A1 sauvegardées sans résultat de calcul GES.');
      }
    } catch (error) {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }
    setLoading(false);
  };

  // ---- RESULT TABLE LOGIC: Only show columns that have at least one non-empty/non-#N/A value ---
  const displayColumns = resultFields.filter(f =>
    gesResults.some(res =>
      res && res[f.key] !== undefined && res[f.key] !== "" && res[f.key] !== "#N/A"
    )
  );

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        4A1 – Équipement de réfrigération et de climatisation fixe
      </Heading>
      <Table size="sm" variant="simple">
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
                  onChange={e => updateRow(idx, "equipment", e.target.value)}
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
                />
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
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Stack, Text,
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
//   energie_kwh?: string | number;  // Not total_energie_kwh, if your backend outputs "energie_kwh"
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
//   // Ajoutez d'autres options selon besoin
// ];

// const REFRIGERANT_OPTIONS = [
//   'R-134a', 'R-448a',
//   // Ajoutez d'autres options selon besoin
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

//   // Validate data before submission
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
//   equipment: row.equipment,
//   description: row.description,
//   date: row.date,
//   months: row.months,
//   site: row.site,
//   product: row.product,
//   reference: row.reference,
//   equipmentType: row.refrigerationType,      // <--- Map!
//   refrigerantType: row.refrigerant,          // <--- Map!
//   qty: parseFloat(row.qtyInEquipment) || 0,  // <--- Map and convert!
//   leaks: parseFloat(row.leakObserved) || 0,  // <--- Map and convert!
// }));


//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: '4A1',
//       data: { rows: sanitizedRows },
//     };

//     let results: GesResult[] = [];
//     let webhookOk = false;

//     // 1. Cloud Run webhook call
//     try {
//       const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/4A1', {
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
//       // 2. Save to your database (Supabase/Postgres)
//     try {
//       const dbPayload = { 
//   ...payload, 
//   poste_num: 4,         // add this!
//   source_code: '4A1',   // add this!
//   results 
// };

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
//       {/* Optionally, results table */}
//       <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
//   <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
//   {gesResults && gesResults.length > 0 && gesResults.some(res =>
//       resultFields.some(f => !!res[f.key] && res[f.key] !== "" && res[f.key] !== "#N/A")
//     ) ? (
//     <Table size="sm" variant="simple">
//       <Thead>
//         <Tr>
//           {resultFields
//             .filter(f => gesResults.some(res => !!res[f.key] && res[f.key] !== "" && res[f.key] !== "#N/A"))
//             .map(f => (
//               <Th key={f.key}>{f.label}</Th>
//             ))}
//         </Tr>
//       </Thead>
//       <Tbody>
//         {gesResults.map((result, idx) => (
//           <Tr key={idx}>
//             {resultFields
//               .filter(f => gesResults.some(res => !!res[f.key] && res[f.key] !== "" && res[f.key] !== "#N/A"))
//               .map(f => (
//                 <Td fontWeight="bold" key={f.key}>
//                   {(result[f.key] && result[f.key] !== "#N/A") ? result[f.key] : "-"}
//                 </Td>
//               ))}
//           </Tr>
//         ))}
//       </Tbody>
//     </Table>
//   ) : (
//     <Text color="gray.500">Aucun résultat à afficher.</Text>
//   )}
// </Box>




//     </Box>
//   );
// }
