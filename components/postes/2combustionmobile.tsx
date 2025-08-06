import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Box, Stack, Heading, Text, Table, Thead, Tbody, Tr, Th, Td, Input, Button, useColorModeValue,
} from '@chakra-ui/react';

// --- Types
type CarburantRow = {
  details: string; date: string; invoiceNumber: string; qty: string;
};
type CarburantGroup = {
  vehicle: string; fuelType: string; rows: CarburantRow[];
};
type A3Row = {
  vehicle: string; type: string; date: string; cost: string; avgPrice: string; estimateQty: string; reference: string;
};
type B1Row = {
  vehicle: string; year: string; make: string; model: string; trans: string; distance: string; type: string; cons: string; estimate: string; reference: string; ac: string;
};
type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

type PosteVisibility = { [posteId: string]: boolean };
type SourceVisibility = { [posteId: string]: { [source: string]: boolean } };
type PosteLabels = { [posteId: string]: string };

function aggregateEtape1ForBackend(groups: CarburantGroup[]) {
  return groups.map(group => {
    const totalQty = group.rows.reduce(
      (sum, r) => sum + Number(r.qty || 0), 0
    );
    return {
      "Liste des véhicules": group.vehicle,
      "Type de véhicule et type de carburant": group.fuelType,
      "Quantité Totale": totalQty
    };
  });
}
function etape1ToCarburantGroups(etape1Rows: any[]): CarburantGroup[] {
  if (!etape1Rows || !Array.isArray(etape1Rows)) return [];
  return etape1Rows.map(row => ({
    vehicle: row["Liste des véhicules"] || "",
    fuelType: row["Type de véhicule et type de carburant"] || "",
    rows: [{
      details: row["Autres détails"] || "",
      date: "",
      invoiceNumber: "",
      qty: row["Quantité Totale"] || ""
    }]
  }));
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
    }))
  );
}

export function CombustionMobileForm({ posteType }: { posteType: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [posteId, setPosteId] = useState<string | null>(null);

  const [posteVisibility, setPosteVisibility] = useState<PosteVisibility>({});
  const [sourceVisibility, setSourceVisibility] = useState<SourceVisibility>({});
  const [posteLabels, setPosteLabels] = useState<PosteLabels>({});

  // Main form states
  const [carburantGroups, setCarburantGroups] = useState<CarburantGroup[]>([]);
  const [a3Rows, setA3Rows] = useState<A3Row[]>([{ vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' }]);
  const [b1Rows, setB1Rows] = useState<B1Row[]>([{ vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' }]);
  const [gesResults, setGesResults] = useState<GesResult[]>([{
    total_co2_gco2e: '-', total_ges_ch4_gco2e: '-', total_ges_n2o_gco2e: '-', total_ges_gco2e: '-', total_ges_tco2e: '-', total_energie_kwh: '-'
  }]);

  // 1. Load user, then visibility maps
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Load poste and source visibility
      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const visData = await res.json();
      setPosteVisibility(visData.posteVisibility || {});
      setSourceVisibility(visData.sourceVisibility || {});
      setPosteLabels(visData.posteLabels || {});

      // Find active posteId for this posteType (by label or by number)
      const foundPosteId = Object.entries(visData.posteLabels || {}).find(
        ([id, label]) => label === posteType || id === posteType
      )?.[0] || null;
      setPosteId(foundPosteId);
    })();
  }, [posteType]);

  // 2. Fetch poste data for this posteId
  useEffect(() => {
    if (!posteId || !userId) return;
    const fetchPrevious = async () => {
      const res = await fetch(`/api/2submit?user_id=${userId}&poste_id=${posteId}`);
      if (!res.ok) return;
      const { poste_data, poste_results } = await res.json();
      setCarburantGroups(etape1ToCarburantGroups(poste_data?.etape1 || []));
      setGesResults(poste_results || []);
      setA3Rows(poste_data?.a3 || []);
      setB1Rows(poste_data?.b1 || []);
    };
    fetchPrevious();
  }, [posteId, userId]);

  // 3. Visibility handlers
  const isSourceVisible = (code: string) => {
    if (!posteId) return false;
    return !(sourceVisibility[posteId]?.[code] ?? false); // hidden=false means visible
  };
  const isPosteVisible = () => posteId && !(posteVisibility[posteId] ?? false);

  // -- Form handlers (unchanged) --
  const addVehicleGroup = () => {
    setCarburantGroups([
      ...carburantGroups,
      {
        vehicle: `Camion #${carburantGroups.length + 1}`,
        fuelType: "",
        rows: [{ details: "", date: "", invoiceNumber: "", qty: "" }]
      }
    ]);
  };
  const addRow = (gIdx: number) => {
    const newGroups = [...carburantGroups];
    newGroups[gIdx].rows.push({ details: "", date: "", invoiceNumber: "", qty: "" });
    setCarburantGroups(newGroups);
  };
  const removeRow = (gIdx: number, rIdx: number) => {
    const newGroups = [...carburantGroups];
    newGroups[gIdx].rows.splice(rIdx, 1);
    if (newGroups[gIdx].rows.length === 0) {
      newGroups.splice(gIdx, 1);
    }
    setCarburantGroups(newGroups);
  };
  const removeGroup = (gIdx: number) => {
    const newGroups = [...carburantGroups];
    newGroups.splice(gIdx, 1);
    setCarburantGroups(newGroups);
  };
  const updateGroupField = (gIdx: number, key: keyof CarburantGroup, value: string) => {
    const newGroups = [...carburantGroups];
    (newGroups[gIdx] as any)[key] = value;
    setCarburantGroups(newGroups);
  };
  const updateRowField = (gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) => {
    const newGroups = [...carburantGroups];
    (newGroups[gIdx].rows[rIdx] as any)[key] = value;
    setCarburantGroups(newGroups);
  };

  const addA3Row = () => setA3Rows(prev => [...prev, { vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' }]);
  const addB1Row = () => setB1Rows(prev => [...prev, { vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' }]);

  // SUBMIT HANDLER
  const handleSubmit = async () => {
    if (!userId || !posteId) {
      alert('Vous devez être connecté et le poste doit être chargé pour soumettre.');
      return;
    }
    const etape1Rows = aggregateEtape1ForBackend(carburantGroups);
    const payload = {
      user_id: userId,
      poste_id: posteId,
      data: {
        etape1: etape1Rows,
        etape2: [],
        a3: a3Rows,
        b1: b1Rows,
      }
    };

    const res = await fetch('/api/2submit', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok) {
      alert(result.error || "Erreur lors de la soumission.");
    } else {
      alert("Soumission réussie !");
      setGesResults(result);
    }
  };

  // --- UI ---
  const tableBg = useColorModeValue('#f3f6ef', '#222e32');
  const highlight = '#245a7c';

  // If poste is not visible, display nothing or a message
  if (!isPosteVisible()) return <Text color="red.600">Poste non disponible ou masqué.</Text>;

  return (
    <Box minH="100vh" bg={tableBg} py={10} px={{ base: 2, md: 10 }}>
      <Box maxW="7xl" mx="auto">
        <Heading as="h1" size="xl" color={highlight} textAlign="center" mb={2} fontWeight="bold">
          {posteLabels[posteId!] || `POSTE ${posteType}`}
        </Heading>
        <Stack spacing={12}>

          {/* SOURCE A1 */}
          {isSourceVisible('A1') && (
            <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
              <Heading as="h3" size="md" color={highlight} mb={4}>
                Saisie carburant – Groupé par véhicule
              </Heading>
              {/* ...same as your table rendering before... */}
              {/* All your table, add, remove, submit code unchanged */}
              {/* (omitted for brevity, paste from your existing code) */}
            </Box>
          )}

          {/* SOURCE A3 */}
          {isSourceVisible('A3') && (
            <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
              <Heading as="h3" size="md" color={highlight} pb={2} mb={4} borderBottom="1px" borderColor={`${highlight}30`}>
                Source A3 – Véhicules (Coûts des carburants)
              </Heading>
              {/* ...A3 Table as before... */}
            </Box>
          )}

          {/* SOURCE B1 */}
          {isSourceVisible('B1') && (
            <Box bg="white" rounded="2xl" boxShadow="xl" p={6}>
              <Heading as="h3" size="md" color={highlight} pb={2} mb={4} borderBottom="1px" borderColor={`${highlight}30`}>
                Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
              </Heading>
              {/* ...B1 Table as before... */}
            </Box>
          )}
        </Stack>

        {/* GES Calculs & Résultats */}
        <Box mt={10} p={6} bg="#e5f2fa" rounded="2xl" boxShadow="xl">
          <Heading as="h4" size="md" color={highlight} mb={3}>
            Calculs et résultats GES (à venir)
          </Heading>
          {gesResults.length === 0 ? (
            <Text color="gray.600">Les résultats seront affichés ici après soumission.</Text>
          ) : (
            <pre>{JSON.stringify(gesResults, null, 2)}</pre>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// import { useEffect, useState } from 'react';
// import { supabase } from '../../lib/supabaseClient';

// import {
//   Box,
//   Stack,
//   Heading,
//   Text,
//   Table,
//   Thead,
//   Tbody,
//   Tr,
//   Th,
//   Td,
//   Input,
//   Button,
//   useColorModeValue,
// } from '@chakra-ui/react';

// // Types
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

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// function aggregateEtape1ForBackend(groups: CarburantGroup[]) {
//   return groups.map(group => {
//     const totalQty = group.rows.reduce(
//       (sum, r) => sum + Number(r.qty || 0), 0
//     );
//     return {
//       "Liste des véhicules": group.vehicle,
//       "Type de véhicule et type de carburant": group.fuelType,
//       "Quantité Totale": totalQty
//     };
//   });
// }

// function etape1ToCarburantGroups(etape1Rows: any[]): CarburantGroup[] {
//   if (!etape1Rows || !Array.isArray(etape1Rows)) return [];
//   return etape1Rows.map(row => ({
//     vehicle: row["Liste des véhicules"] || "",
//     fuelType: row["Type de véhicule et type de carburant"] || "",
//     rows: [
//       {
//         details: row["Autres détails"] || "",
//         date: "",
//         invoiceNumber: "",
//         qty: row["Quantité Totale"] || ""
//       }
//     ]
//   }));
// }

// function flattenCarburantGroups(groups: CarburantGroup[]) {
//   return groups.flatMap(group =>
//     group.rows.map(row => ({
//       "Liste des véhicules": group.vehicle,
//       "Type de véhicule et type de carburant": group.fuelType,
//       "Autres détails": row.details,
//       "Date": row.date,
//       "# facture": row.invoiceNumber,
//       "Quantité Totale": row.qty,
//     }))
//   );
// }

// export function CombustionMobileForm() {
//   // 1. STATE FOR HIDDEN SOURCES
//   const [hiddenSources, setHiddenSources] = useState<string[]>([]);
//   const [userId, setUserId] = useState<string | null>(null);

//   // TODO: Provide posteId from context/props/router/whatever is correct in your app
//   const posteId = /* YOUR_POSTE_ID_HERE */ '';

//   useEffect(() => {
//     (async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) setUserId(user.id);
//     })();
//   }, []);

//   useEffect(() => {
//     if (!userId || !posteId) return;
//     async function fetchHiddenSources() {
//       const { data } = await supabase
//         .from('poste_source_visibility')
//         .select('source_code')
//         .eq('user_id', userId)
//         .eq('poste_id', posteId)
//         .eq('is_hidden', true);
//       if (data) setHiddenSources(data.map((r: { source_code: string }) => r.source_code));
//     }
//     fetchHiddenSources();
//   }, [userId, posteId]);

//   // Main data states with type safety
//   const [carburantGroups, setCarburantGroups] = useState<CarburantGroup[]>([]);
//   const [a3Rows, setA3Rows] = useState<A3Row[]>([
//     { vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' }
//   ]);
//   const [b1Rows, setB1Rows] = useState<B1Row[]>([
//     { vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' }
//   ]);
//   const [gesResults, setGesResults] = useState<GesResult[]>([{
//     total_co2_gco2e: '-',
//     total_ges_ch4_gco2e: '-',
//     total_ges_n2o_gco2e: '-',
//     total_ges_gco2e: '-',
//     total_ges_tco2e: '-',
//     total_energie_kwh: '-'
//   }]);

//   // Fetch previous data
//   useEffect(() => {
//     const fetchPrevious = async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;
//       const res = await fetch(`/api/2submit?user_id=${user.id}`);
//       if (!res.ok) return;
//       const { poste_data, poste_results } = await res.json();
//       setCarburantGroups(etape1ToCarburantGroups(poste_data?.etape1 || []));
//       setGesResults(poste_results || []);
//       setA3Rows(poste_data?.a3 || []);
//       setB1Rows(poste_data?.b1 || []);
//     };
//     fetchPrevious();
//   }, []);

//   // Source visibility
//   const isSourceVisible = (code: string) => !hiddenSources.includes(code);

//   // -- Handlers for carburantGroups (A1) --
//   const addVehicleGroup = () => {
//     setCarburantGroups([
//       ...carburantGroups,
//       {
//         vehicle: `Camion #${carburantGroups.length + 1}`,
//         fuelType: "",
//         rows: [{ details: "", date: "", invoiceNumber: "", qty: "" }]
//       }
//     ]);
//   };

//   const addRow = (gIdx: number) => {
//     const newGroups = [...carburantGroups];
//     newGroups[gIdx].rows.push({ details: "", date: "", invoiceNumber: "", qty: "" });
//     setCarburantGroups(newGroups);
//   };

//   const removeRow = (gIdx: number, rIdx: number) => {
//     const newGroups = [...carburantGroups];
//     newGroups[gIdx].rows.splice(rIdx, 1);
//     if (newGroups[gIdx].rows.length === 0) {
//       newGroups.splice(gIdx, 1);
//     }
//     setCarburantGroups(newGroups);
//   };

//   const removeGroup = (gIdx: number) => {
//     const newGroups = [...carburantGroups];
//     newGroups.splice(gIdx, 1);
//     setCarburantGroups(newGroups);
//   };

//   const updateGroupField = (gIdx: number, key: keyof CarburantGroup, value: string) => {
//     const newGroups = [...carburantGroups];
//     (newGroups[gIdx] as any)[key] = value;
//     setCarburantGroups(newGroups);
//   };

//   const updateRowField = (gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) => {
//     const newGroups = [...carburantGroups];
//     (newGroups[gIdx].rows[rIdx] as any)[key] = value;
//     setCarburantGroups(newGroups);
//   };

//   // Handlers for A3
//   const addA3Row = () =>
//     setA3Rows(prev => [...prev, { vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' }]);
//   // Handlers for B1
//   const addB1Row = () =>
//     setB1Rows(prev => [...prev, { vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' }]);

//   // SUBMIT HANDLER
//   const handleSubmit = async () => {
//     const { data: { user }, error } = await supabase.auth.getUser();
//     if (!user) {
//       alert('Vous devez être connecté pour soumettre.');
//       return;
//     }
//     const etape1Rows = aggregateEtape1ForBackend(carburantGroups);
//     const payload = {
//       user_id: user.id,
//       data: {
//         etape1: etape1Rows,
//         etape2: [], // Unused in your current form
//         a3: a3Rows,
//         b1: b1Rows,
//       }
//     };

//     const res = await fetch('/api/2submit', {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload)
//     });

//     const result = await res.json();
//     if (!res.ok) {
//       alert(result.error || "Erreur lors de la soumission.");
//     } else {
//       alert("Soumission réussie !");
//       setGesResults(result);
//     }
//   };

//   // UI
//   const tableBg = useColorModeValue('#f3f6ef', '#222e32');
//   const highlight = '#245a7c';

//   return (
//     <Box minH="100vh" bg={tableBg} py={10} px={{ base: 2, md: 10 }}>
//       <Box maxW="7xl" mx="auto">
//         <Heading as="h1" size="xl" color={highlight} textAlign="center" mb={2} fontWeight="bold">
//           POSTE 2 – COMBUSTION MOBILE
//         </Heading>
//         <Stack spacing={12}>

//           {/* SOURCE A1 */}
//           {isSourceVisible('A1') && (
//             <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//               <Heading as="h3" size="md" color={highlight} mb={4}>
//                 Saisie carburant – Groupé par véhicule
//               </Heading>
//               <Table size="sm" variant="simple">
//                 <Thead>
//                   <Tr>
//                     <Th>Véhicule / Province</Th>
//                     <Th>Type de carburant</Th>
//                     <Th>Détail</Th>
//                     <Th>Date</Th>
//                     <Th># facture</Th>
//                     <Th>Quantité de carburant</Th>
//                     <Th>Unité</Th>
//                     <Th>Total carburant</Th>
//                     <Th></Th>
//                   </Tr>
//                 </Thead>
//                 <Tbody>
//                   {carburantGroups.map((group, gIdx) => {
//                     const total = group.rows.reduce((sum, r) => sum + parseFloat(r.qty || "0"), 0);
//                     return group.rows.map((row, rIdx) => (
//                       <Tr key={gIdx + "-" + rIdx}>
//                         {rIdx === 0 && (
//                           <>
//                             <Td rowSpan={group.rows.length}>
//                               <Input
//                                 value={group.vehicle}
//                                 onChange={e => updateGroupField(gIdx, "vehicle", e.target.value)}
//                               />
//                             </Td>
//                             <Td rowSpan={group.rows.length}>
//                               <Input
//                                 value={group.fuelType}
//                                 onChange={e => updateGroupField(gIdx, "fuelType", e.target.value)}
//                               />
//                             </Td>
//                           </>
//                         )}
//                         <Td>
//                           <Input
//                             value={row.details}
//                             onChange={e => updateRowField(gIdx, rIdx, "details", e.target.value)}
//                           />
//                         </Td>
//                         <Td>
//                           <Input
//                             type="date"
//                             value={row.date}
//                             onChange={e => updateRowField(gIdx, rIdx, "date", e.target.value)}
//                           />
//                         </Td>
//                         <Td>
//                           <Input
//                             value={row.invoiceNumber}
//                             onChange={e => updateRowField(gIdx, rIdx, "invoiceNumber", e.target.value)}
//                           />
//                         </Td>
//                         <Td>
//                           <Input
//                             type="number"
//                             value={row.qty}
//                             onChange={e => updateRowField(gIdx, rIdx, "qty", e.target.value)}
//                           />
//                         </Td>
//                         <Td>L</Td>
//                         {rIdx === 0 && (
//                           <Td rowSpan={group.rows.length} fontWeight="bold">
//                             {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
//                           </Td>
//                         )}
//                         <Td>
//                           <Stack direction="row" spacing={1}>
//                             <Button
//                               size="xs"
//                               onClick={() => addRow(gIdx)}
//                               colorScheme="blue"
//                               title="Ajouter une ligne"
//                             >+</Button>
//                             {group.rows.length > 1 && (
//                               <Button
//                                 size="xs"
//                                 onClick={() => removeRow(gIdx, rIdx)}
//                                 colorScheme="red"
//                                 title="Supprimer la ligne"
//                               >-</Button>
//                             )}
//                             {rIdx === 0 && (
//                               <Button
//                                 size="xs"
//                                 onClick={() => removeGroup(gIdx)}
//                                 colorScheme="red"
//                                 title="Supprimer tout ce véhicule"
//                               >Suppr. véhicule</Button>
//                             )}
//                           </Stack>
//                         </Td>
//                       </Tr>
//                     ));
//                   })}
//                 </Tbody>
//               </Table>
//               <Button mt={3} colorScheme="green" onClick={addVehicleGroup}>
//                 Ajouter un véhicule
//               </Button>
//               <Button mt={3} ml={4} colorScheme="blue" onClick={handleSubmit}>
//                 Soumettre
//               </Button>
//               <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
//                 <Text fontWeight="bold" color="#245a7c" mb={2}>Calculs et résultats</Text>
//                 <Table size="sm" variant="simple">
//                   <Thead>
//                     <Tr>
//                       <Th>CO₂ [gCO2e]</Th>
//                       <Th>CH₄ [gCO2e]</Th>
//                       <Th>N₂O [gCO2e]</Th>
//                       <Th>Total GES [gCO2e]</Th>
//                       <Th>Total GES [tCO2e]</Th>
//                       <Th>Énergie équivalente [kWh]</Th>
//                     </Tr>
//                   </Thead>
//                   <Tbody>
//                     {flattenCarburantGroups(carburantGroups).map((_, idx) => {
//                       const row = gesResults[idx] || {};
//                       return (
//                         <Tr key={idx}>
//                           <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
//                           <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
//                           <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
//                           <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
//                           <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
//                           <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
//                         </Tr>
//                       );
//                     })}
//                   </Tbody>
//                 </Table>
//               </Box>
//             </Box>
//           )}

//           {/* SOURCE A3 */}
//           {isSourceVisible('A3') && (
//             <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//               <Heading as="h3" size="md" color={highlight} pb={2} mb={4} borderBottom="1px" borderColor={`${highlight}30`}>
//                 Source A3 – Véhicules (Coûts des carburants)
//               </Heading>
//               <Table size="sm" variant="simple" bg={tableBg}>
//                 <Thead>
//                   <Tr>
//                     <Th>Détails sur les véhicules</Th>
//                     <Th>Type de véhicule et carburant</Th>
//                     <Th>Date du reçu</Th>
//                     <Th>Coûts en carburants [$]</Th>
//                     <Th>Prix moyen du carburant [$]</Th>
//                     <Th>Estimation quantité [L]</Th>
//                     <Th>Références</Th>
//                   </Tr>
//                 </Thead>
//                 <Tbody>
//                   {a3Rows.map((row, idx) => (
//                     <Tr key={idx}>
//                       <Td><Input value={row.vehicle} onChange={e => { const updated = [...a3Rows]; updated[idx].vehicle = e.target.value; setA3Rows(updated); }} /></Td>
//                       <Td><Input value={row.type} onChange={e => { const updated = [...a3Rows]; updated[idx].type = e.target.value; setA3Rows(updated); }} /></Td>
//                       <Td><Input value={row.date} onChange={e => { const updated = [...a3Rows]; updated[idx].date = e.target.value; setA3Rows(updated); }} /></Td>
//                       <Td><Input type="number" value={row.cost} onChange={e => { const updated = [...a3Rows]; updated[idx].cost = e.target.value; setA3Rows(updated); }} /></Td>
//                       <Td><Input type="number" value={row.avgPrice} onChange={e => { const updated = [...a3Rows]; updated[idx].avgPrice = e.target.value; setA3Rows(updated); }} /></Td>
//                       <Td><Input type="number" value={row.estimateQty} onChange={e => { const updated = [...a3Rows]; updated[idx].estimateQty = e.target.value; setA3Rows(updated); }} /></Td>
//                       <Td><Input value={row.reference} onChange={e => { const updated = [...a3Rows]; updated[idx].reference = e.target.value; setA3Rows(updated); }} /></Td>
//                     </Tr>
//                   ))}
//                 </Tbody>
//               </Table>
//               <Button mt={3} onClick={addA3Row} colorScheme="blue" rounded="xl">Ajouter une ligne</Button>
//             </Box>
//           )}

//           {/* SOURCE B1 */}
//           {isSourceVisible('B1') && (
//             <Box bg="white" rounded="2xl" boxShadow="xl" p={6}>
//               <Heading as="h3" size="md" color={highlight} pb={2} mb={4} borderBottom="1px" borderColor={`${highlight}30`}>
//                 Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
//               </Heading>
//               <Table size="sm" variant="simple" bg={tableBg}>
//                 <Thead>
//                   <Tr>
//                     <Th>Détails sur les véhicules</Th>
//                     <Th>Année</Th>
//                     <Th>Marque</Th>
//                     <Th>Modèle</Th>
//                     <Th>Transmission</Th>
//                     <Th>Distance parcourue [km]</Th>
//                     <Th>Type et carburant</Th>
//                     <Th>Conso. [L/100km]</Th>
//                     <Th>Estimation [L]</Th>
//                     <Th>Références</Th>
//                     <Th>Climatisation?</Th>
//                   </Tr>
//                 </Thead>
//                 <Tbody>
//                   {b1Rows.map((row, idx) => (
//                     <Tr key={idx}>
//                       <Td><Input value={row.vehicle} onChange={e => { const updated = [...b1Rows]; updated[idx].vehicle = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input value={row.year} onChange={e => { const updated = [...b1Rows]; updated[idx].year = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input value={row.make} onChange={e => { const updated = [...b1Rows]; updated[idx].make = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input value={row.model} onChange={e => { const updated = [...b1Rows]; updated[idx].model = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input value={row.trans} onChange={e => { const updated = [...b1Rows]; updated[idx].trans = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input type="number" value={row.distance} onChange={e => { const updated = [...b1Rows]; updated[idx].distance = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input value={row.type} onChange={e => { const updated = [...b1Rows]; updated[idx].type = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input type="number" value={row.cons} onChange={e => { const updated = [...b1Rows]; updated[idx].cons = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input type="number" value={row.estimate} onChange={e => { const updated = [...b1Rows]; updated[idx].estimate = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input value={row.reference} onChange={e => { const updated = [...b1Rows]; updated[idx].reference = e.target.value; setB1Rows(updated); }} /></Td>
//                       <Td><Input value={row.ac} onChange={e => { const updated = [...b1Rows]; updated[idx].ac = e.target.value; setB1Rows(updated); }} placeholder="Oui/Non" /></Td>
//                     </Tr>
//                   ))}
//                 </Tbody>
//               </Table>
//               <Button mt={3} onClick={addB1Row} colorScheme="blue" rounded="xl">Ajouter une ligne</Button>
//             </Box>
//           )}

//         </Stack>

//         {/* GES Calculs & Résultats */}
//         <Box mt={10} p={6} bg="#e5f2fa" rounded="2xl" boxShadow="xl">
//           <Heading as="h4" size="md" color={highlight} mb={3}>
//             Calculs et résultats GES (à venir)
//           </Heading>
//           {gesResults.length === 0 ? (
//             <Text color="gray.600">Les résultats seront affichés ici après soumission.</Text>
//           ) : (
//             <pre>{JSON.stringify(gesResults, null, 2)}</pre>
//           )}
//         </Box>
//       </Box>
//     </Box>
//   );
// }
