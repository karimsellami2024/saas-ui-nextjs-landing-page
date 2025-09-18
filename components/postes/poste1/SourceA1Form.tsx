import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
} from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

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
  'Génératrice - Mazout [L]',
  'Chauffage - Bois [kg]',
  'Chauffage - Propane [L]',
];
const UNIT_OPTIONS = ['L', 'kg'];

const DEFAULT_ROWS: Source1ARow[] = [
  {
    equipment: '',
    description: '',
    date: '',
    site: '',
    product: '',
    reference: '',
    usageAndFuel: '',
    qty: '',
    unit: '',
  },
];

// helper to parse unit from a fuel option e.g. "... [L]" -> "L"
const parseUnitFromFuel = (fuelLabel: string) => {
  const m = fuelLabel.match(/\[([^\]]+)\]\s*$/);
  return m?.[1] ?? '';
};

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

  // === NEW: Prefill from /api/get-source (poste 1, source 1A1) ===
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 1, '1A1', { rows: DEFAULT_ROWS });

  // When prefill returns, update parent-managed rows + results once
  useEffect(() => {
    if (prefillData?.rows) {
      const dataRows = Array.isArray(prefillData.rows) ? prefillData.rows : DEFAULT_ROWS;
      // ensure each row matches Source1ARow shape
      setRows(
        dataRows.length ? dataRows : DEFAULT_ROWS
      );
    } else if (!rows?.length) {
      setRows(DEFAULT_ROWS);
    }
    if (prefillResults) {
      // expecting an array of result rows; if single object, wrap it
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults]);

  // NEW: dropdown options from Supabase
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

  // Load company dropdown data (sites, products, references)
  useEffect(() => {
    (async () => {
      try {
        if (!userId) return;

        // 1) user_profiles -> company_id
        const { data: profile, error: profErr } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', userId)
          .single();
        if (profErr || !profile?.company_id) return;

        // 2) companies -> production_sites, products, company_references
        const { data: company, error: compErr } = await supabase
          .from('companies')
          .select('production_sites, products, company_references')
          .eq('id', profile.company_id)
          .single();
        if (compErr) return;

        const sites = Array.isArray(company?.production_sites)
          ? (company.production_sites as any[]).map(s => String(s?.nom ?? '')).filter(Boolean)
          : [];
        const prods = Array.isArray(company?.products)
          ? (company.products as any[]).map(p => String(p?.nom ?? '')).filter(Boolean)
          : [];
        const refs = Array.isArray(company?.company_references)
          ? (company.company_references as any[]).map(r => String(r)).filter(Boolean)
          : [];

        const uniq = (arr: string[]) => Array.from(new Set(arr));
        setSiteOptions(uniq(sites));
        setProductOptions(uniq(prods));
        setReferenceOptions(uniq(refs));
      } catch {
        // silent fail; dropdowns will just be empty
      }
    })();
  }, [userId]);

  // Validate required fields
  const validateData = (rws: Source1ARow[]) =>
    rws.length > 0 &&
    rws.every(row =>
      row.equipment &&
      row.site &&
      row.product &&
      row.usageAndFuel &&
      row.qty &&
      row.unit
    );

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (!posteSourceId || !userId) {
      alert('Champs obligatoires manquants (posteSourceId ou userId)');
      return;
    }
    if (!validateData(rows)) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }
    setLoading(true);

    // 1. Sanitize rows
    const sanitizedRows = rows.map(row => ({
      ...row,
      qty: parseFloat(String(row.qty)) || 0,
    }));
    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 1, // 1A1
      source_code: '1A1',
      data: { rows: sanitizedRows },
    };

    let results: any[] = [];
    let webhookOk = false;

    // 2. Cloud Run webhook call
    try {
      const response = await fetch(
        'https://allposteswebhook-129138384907.us-central1.run.app/submit/1A1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
      } else {
        results = Array.isArray(result.results) ? result.results : (result.results || []);
        webhookOk = true;
      }
    } catch {
      alert('Erreur réseau lors du calcul Cloud Run.');
    }

    // 3. Save to DB
    try {
      const dbPayload = { ...payload, results };
      const dbResponse = await fetch('/api/4submit', {
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
            ? 'Données 1A1 calculées et sauvegardées avec succès!'
            : 'Données 1A1 sauvegardées sans résultat de calcul GES.'
        );
      }
    } catch {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }

    setLoading(false);
  };

  // row helpers
  const addRow = () =>
    setRows(prev => [
      ...prev,
      {
        equipment: '',
        description: '',
        date: '',
        site: '',
        product: '',
        reference: '',
        usageAndFuel: '',
        qty: '',
        unit: '',
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

  // auto set unit when fuel chosen (only if unit blank)
  const onFuelChange = (idx: number, value: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[idx].usageAndFuel = value;
      const unit = parseUnitFromFuel(value);
      if (unit && !copy[idx].unit) {
        copy[idx].unit = unit;
      }
      return copy;
    });
  };

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        Chauffage des bâtiments et équipements fixes – Source 1A1
      </Heading>

      {prefillLoading && (
        <Text mb={2} fontSize="sm" color="gray.500">Chargement des données enregistrées…</Text>
      )}
      {prefillError && (
        <Text mb={2} fontSize="sm" color="red.500">Erreur de préchargement : {prefillError}</Text>
      )}

      <Table size="sm" variant="simple" bg={tableBg}>
        <Thead>
          <Tr>
            <Th>Source de combustion</Th>
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
                  onChange={e => updateRowField(idx, 'equipment', e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.description}
                  onChange={e => updateRowField(idx, 'description', e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  type="date"
                  value={row.date}
                  onChange={e => updateRowField(idx, 'date', e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>

              {/* Site dropdown */}
              <Td>
                <Select
                  value={row.site}
                  onChange={e => updateRowField(idx, 'site', e.target.value)}
                  placeholder={siteOptions.length ? 'Sélectionner le site' : 'Aucun site'}
                >
                  {siteOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Td>

              {/* Product dropdown */}
              <Td>
                <Select
                  value={row.product}
                  onChange={e => updateRowField(idx, 'product', e.target.value)}
                  placeholder={productOptions.length ? 'Sélectionner le produit' : 'Aucun produit'}
                >
                  {productOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Td>

              {/* Reference dropdown */}
              <Td>
                <Select
                  value={row.reference}
                  onChange={e => updateRowField(idx, 'reference', e.target.value)}
                  placeholder={referenceOptions.length ? 'Sélectionner une référence' : 'Aucune référence'}
                >
                  {referenceOptions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </Td>

              <Td>
                <Select
                  value={row.usageAndFuel}
                  onChange={e => onFuelChange(idx, e.target.value)}
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
                  onChange={e => updateRowField(idx, 'qty', e.target.value)}
                />
              </Td>

              <Td>
                <Select
                  value={row.unit}
                  onChange={e => updateRowField(idx, 'unit', e.target.value)}
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
      <Button mt={3} ml={4} colorScheme="green" onClick={handleSubmit} isLoading={loading}>
        Soumettre
      </Button>

      {/* Results */}
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



// import React, { useEffect, useMemo, useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
// } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';

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
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// const FUEL_OPTIONS = [
//   'Génératrice - Mazout [L]',
//   'Chauffage - Bois [kg]',
//   'Chauffage - Propane [L]',
//   // Add more as needed
// ];
// const UNIT_OPTIONS = ['L', 'kg'];

// // helper to parse unit from a fuel option e.g. "... [L]" -> "L"
// const parseUnitFromFuel = (fuelLabel: string) => {
//   const m = fuelLabel.match(/\[([^\]]+)\]\s*$/);
//   return m?.[1] ?? '';
// };

// export function Source1AForm({
//   rows = [],
//   setRows,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
// }: Source1AFormProps) {
//   const [loading, setLoading] = useState(false);

//   // NEW: dropdown options from Supabase
//   const [siteOptions, setSiteOptions] = useState<string[]>([]);
//   const [productOptions, setProductOptions] = useState<string[]>([]);
//   const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

//   // Load company dropdown data (sites, products, references)
//   useEffect(() => {
//     (async () => {
//       try {
//         if (!userId) return;

//         // 1) user_profiles -> company_id
//         const { data: profile, error: profErr } = await supabase
//           .from('user_profiles')
//           .select('company_id')
//           .eq('id', userId)
//           .single();
//         if (profErr || !profile?.company_id) return;

//         // 2) companies -> production_sites, products, company_references
//         const { data: company, error: compErr } = await supabase
//           .from('companies')
//           .select('production_sites, products, company_references')
//           .eq('id', profile.company_id)
//           .single();
//         if (compErr) return;

//         const sites = Array.isArray(company?.production_sites)
//           ? (company.production_sites as any[]).map(s => String(s?.nom ?? '')).filter(Boolean)
//           : [];
//         const prods = Array.isArray(company?.products)
//           ? (company.products as any[]).map(p => String(p?.nom ?? '')).filter(Boolean)
//           : [];
//         const refs = Array.isArray(company?.company_references)
//           ? (company.company_references as any[]).map(r => String(r)).filter(Boolean)
//           : [];

//         // Deduplicate
//         const uniq = (arr: string[]) => Array.from(new Set(arr));

//         setSiteOptions(uniq(sites));
//         setProductOptions(uniq(prods));
//         setReferenceOptions(uniq(refs));
//       } catch {
//         // silent fail; dropdowns will just be empty
//       }
//     })();
//   }, [userId]);

//   // Validate required fields
//   const validateData = (rows: Source1ARow[]) =>
//     rows.length > 0 &&
//     rows.every(row =>
//       row.equipment &&
//       row.site &&
//       row.product &&
//       row.usageAndFuel &&
//       row.qty &&
//       row.unit
//     );

//   // --- SUBMIT ---
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

//     // 1. Sanitize rows
//     const sanitizedRows = rows.map(row => ({
//       ...row,
//       qty: parseFloat(String(row.qty)) || 0,
//     }));
//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       poste_num: 1, // 1A1
//       source_code: '1A1',
//       data: { rows: sanitizedRows },
//     };

//     let results: any[] = [];
//     let webhookOk = false;

//     // 2. Cloud Run webhook call
//     try {
//       const response = await fetch(
//         'https://allposteswebhook-592102073404.us-central1.run.app/submit/1A1',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(payload),
//         }
//       );
//       const result = await response.json();
//       if (!response.ok) {
//         alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
//       } else {
//         results = Array.isArray(result.results) ? result.results : (result.results || []);
//         webhookOk = true;
//       }
//     } catch {
//       alert('Erreur réseau lors du calcul Cloud Run.');
//     }

//     // 3. Save to DB
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
//             ? 'Données 1A1 calculées et sauvegardées avec succès!'
//             : 'Données 1A1 sauvegardées sans résultat de calcul GES.'
//         );
//       }
//     } catch {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }

//     setLoading(false);
//   };

//   // row helpers
//   const addRow = () =>
//     setRows(prev => [
//       ...prev,
//       {
//         equipment: '',
//         description: '',
//         date: '',
//         site: '',
//         product: '',
//         reference: '',
//         usageAndFuel: '',
//         qty: '',
//         unit: '',
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

//   // auto set unit when fuel chosen (only if unit blank)
//   const onFuelChange = (idx: number, value: string) => {
//     setRows(prev => {
//       const copy = [...prev];
//       copy[idx].usageAndFuel = value;
//       const unit = parseUnitFromFuel(value);
//       if (unit && !copy[idx].unit) {
//         copy[idx].unit = unit;
//       }
//       return copy;
//     });
//   };

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         Chauffage des bâtiments et équipements fixes – Source 1A1
//       </Heading>
//       <Table size="sm" variant="simple" bg={tableBg}>
//         <Thead>
//           <Tr>
//             <Th>Source de combustion</Th>
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
//                   onChange={e => updateRowField(idx, 'equipment', e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.description}
//                   onChange={e => updateRowField(idx, 'description', e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="date"
//                   value={row.date}
//                   onChange={e => updateRowField(idx, 'date', e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>

//               {/* Site dropdown */}
//               <Td>
//                 <Select
//                   value={row.site}
//                   onChange={e => updateRowField(idx, 'site', e.target.value)}
//                   placeholder={siteOptions.length ? 'Sélectionner le site' : 'Aucun site'}
//                 >
//                   {siteOptions.map(s => (
//                     <option key={s} value={s}>{s}</option>
//                   ))}
//                 </Select>
//               </Td>

//               {/* Product dropdown */}
//               <Td>
//                 <Select
//                   value={row.product}
//                   onChange={e => updateRowField(idx, 'product', e.target.value)}
//                   placeholder={productOptions.length ? 'Sélectionner le produit' : 'Aucun produit'}
//                 >
//                   {productOptions.map(p => (
//                     <option key={p} value={p}>{p}</option>
//                   ))}
//                 </Select>
//               </Td>

//               {/* Reference dropdown */}
//               <Td>
//                 <Select
//                   value={row.reference}
//                   onChange={e => updateRowField(idx, 'reference', e.target.value)}
//                   placeholder={referenceOptions.length ? 'Sélectionner une référence' : 'Aucune référence'}
//                 >
//                   {referenceOptions.map(r => (
//                     <option key={r} value={r}>{r}</option>
//                   ))}
//                 </Select>
//               </Td>

//               <Td>
//                 <Select
//                   value={row.usageAndFuel}
//                   onChange={e => onFuelChange(idx, e.target.value)}
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
//                   onChange={e => updateRowField(idx, 'qty', e.target.value)}
//                 />
//               </Td>

//               <Td>
//                 <Select
//                     value={row.unit}
//                     onChange={e => updateRowField(idx, 'unit', e.target.value)}
//                     placeholder="Unité"
//                   >
//                     {UNIT_OPTIONS.map(opt => (
//                       <option key={opt} value={opt}>{opt}</option>
//                     ))}
//                 </Select>
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
//       <Button mt={3} ml={4} colorScheme="green" onClick={handleSubmit} isLoading={loading}>
//         Soumettre
//       </Button>

//       {/* Results */}
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

