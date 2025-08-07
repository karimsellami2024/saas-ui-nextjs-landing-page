import { useEffect, useState } from 'react';
import { Box, Heading, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import { SourceA1Form } from './SourceA1Form';
import { Source2A3Form } from './SourceA3Form';
import { SourceB1Form } from './SourceB1Form';

// ---- Types for form state ----
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

const POSTE_LABEL = "POSTE 2 – COMBUSTION MOBILE";

export default function Poste2Page() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  // Shared data states for forms
  const [carburantGroups, setCarburantGroups] = useState<CarburantGroup[]>([]);
  const [a3Rows, setA3Rows] = useState<A3Row[]>([]);
  const [b1Rows, setB1Rows] = useState<B1Row[]>([]);
  const [gesResults, setGesResults] = useState<any[]>([]);

  // --- All Handlers for A1 modularity ---
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
      { vehicle: '', fuelType: '', rows: [{ details: '', date: '', invoiceNumber: '', qty: '' }] }
    ]);
  }
  function addRow(gIdx: number) {
    setCarburantGroups(prev => {
      const copy = [...prev];
      copy[gIdx].rows.push({ details: '', date: '', invoiceNumber: '', qty: '' });
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
      }))
    );
  }
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

  async function handleA1Submit(posteSourceId) {
  console.log('🟦 [handleA1Submit] Called with:', { posteSourceId, carburantGroups, userId });
  if (!posteSourceId || !userId) {
    console.error('🟥 [handleA1Submit] Missing required fields (posteSourceId or userId)', { posteSourceId, userId });
    alert("Missing required fields (posteSourceId or userId)");
    return;
  }

  // Compose the payload for both endpoints
  const payload = {
    user_id: userId,
    poste_source_id: posteSourceId,
    source_code: 'A1',
    data: { groups: carburantGroups }
  };

  let results = [];
  let webhookOk = false;

  // 1. Call Cloud Run webhook to get GES results
  try {
    const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/2A1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      console.error('🟥 [handleA1Submit] Cloud Run failed:', result);
      alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
    } else {
      console.log('🟩 [handleA1Submit] Cloud Run success:', result);
      results = Array.isArray(result.results) ? result.results : [];
      webhookOk = true;
    }
  } catch (error) {
    console.error('🟥 [handleA1Submit] Cloud Run network error:', error);
    alert('Erreur réseau lors du calcul Cloud Run.');
  }

  // 2. Save to your database (Supabase/Postgres)
  try {
    // Merge the results in the payload for DB saving
    const dbPayload = {
      ...payload,
      results,
    };
    const dbResponse = await fetch('/api/2submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbPayload),
    });
    const dbResult = await dbResponse.json();

    if (!dbResponse.ok) {
      console.error('🟥 [handleA1Submit] Database save failed:', dbResult);
      alert('Erreur lors de la sauvegarde en base : ' + (dbResult.error || ''));
    } else {
      setGesResults(results); // Always show the GES result
      alert(webhookOk
        ? 'Données A1 calculées et sauvegardées avec succès!'
        : 'Données A1 sauvegardées sans résultat de calcul GES.');
    }
  } catch (error) {
    console.error('🟥 [handleA1Submit] Database network or logic error:', error);
    alert('Erreur inattendue lors de la sauvegarde en base.');
  }
}

// async function handleA1Submit(posteSourceId) {
//   console.log('🟦 [handleA1Submit] Called with:', { posteSourceId, carburantGroups, userId });
//   if (!posteSourceId || !userId) {
//     console.error('🟥 [handleA1Submit] Missing required fields (posteSourceId or userId)', { posteSourceId, userId });
//     alert("Missing required fields (posteSourceId or userId)");
//     return;
//   }

//   try {
//     // Compose the payload in the expected format for the webhook
//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       source_code: 'A1',
//       data: { groups: carburantGroups },
//     };

//     // 🔥 Direct call to your Cloud Run webhook
//     const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/2A1', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });

//     const result = await response.json();

//     if (!response.ok) {
//       console.error('🟥 [handleA1Submit] Save failed:', result);
//       alert('Erreur lors de la sauvegarde : ' + (result.error || ''));
//     } else {
//       console.log('🟩 [handleA1Submit] Save success:', result);
//       setGesResults(Array.isArray(result.results) ? result.results : []);
//       alert('Données A1 sauvegardées avec succès!');
//     }
//   } catch (error) {
//     console.error('🟥 [handleA1Submit] Network or logic error:', error);
//     alert('Erreur inattendue lors de la sauvegarde.');
//   }
// }

  // --- Save to poste_sources on submit ---
  // async function handleA1Submit(posteSourceId: string) {
  //   console.log('🟦 [handleA1Submit] Called with:', { posteSourceId, carburantGroups, userId });
  //   if (!posteSourceId || !userId) {
  //     console.error('🟥 [handleA1Submit] Missing required fields (posteSourceId or userId)', { posteSourceId, userId });
  //     alert("Missing required fields (posteSourceId or userId)");
  //     return;
  //   }

  //   try {
  //     const response = await fetch('/api/2submit', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         user_id: userId,
  //         poste_source_id: posteSourceId,
  //         source_code: 'A1',
  //         data: carburantGroups
  //       }),
  //     });
  //     const result = await response.json();
  //     if (!response.ok) {
  //       console.error('🟥 [handleA1Submit] Save failed:', result);
  //       alert('Erreur lors de la sauvegarde : ' + (result.error || ''));
  //     } else {
  //       console.log('🟩 [handleA1Submit] Save success:', result);
  //       setGesResults(Array.isArray(result.results) ? result.results : []);
  //       alert('Données A1 sauvegardées avec succès!');
  //     }
  //   } catch (error) {
  //     console.error('🟥 [handleA1Submit] Network or logic error:', error);
  //     alert('Erreur inattendue lors de la sauvegarde.');
  //   }
  // }

  // --- A3/B1 modular add handlers ---
  function addA3Row() {
    setA3Rows(prev => [
      ...prev,
      { vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' }
    ]);
  }
  function addB1Row() {
    setB1Rows(prev => [
      ...prev,
      { vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' }
    ]);
  }

  // --- Fetch user and config ---
  const highlight = '#245a7c';
  const bg = useColorModeValue('#f3f6ef', '#222e32');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        console.error('🟥 No authenticated user found');
        return;
      }
      setUserId(user.id);

      // Fetch source visibility for this user
      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      // Find the posteId for Poste 2 (by label containing "2")
      let poste2Id: string | null = null;
      if (data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          if (typeof label === "string" && label.toLowerCase().includes("2")) {
            poste2Id = id;
            break;
          }
        }
      }
      setPosteId(poste2Id);

      if (poste2Id) {
        setPosteLabel(data.posteLabels?.[poste2Id] || POSTE_LABEL);
        setEnabledSources(data.sources?.[poste2Id] || []);
        setSourceVisibility(data.sourceVisibility?.[poste2Id] || {});
        console.log('🟨 [useEffect] Poste2 config:', {
          poste2Id,
          sources: data.sources?.[poste2Id] || [],
          sourceVisibility: data.sourceVisibility?.[poste2Id] || {},
          posteLabel: data.posteLabels?.[poste2Id] || POSTE_LABEL
        });
      } else {
        setPosteLabel(POSTE_LABEL);
        setEnabledSources([]);
        setSourceVisibility({});
        console.warn('🟧 [useEffect] NO poste2Id found', { posteLabels: data.posteLabels });
      }
      setLoading(false);
    })();
  }, []);

  // --- Modular form rendering ---
  function getFormForSource(source: any) {
    const code = source?.source_code;
    const posteSourceId = source?.id;
    console.log('🟩 [getFormForSource] Rendering for source:', { code, posteSourceId, source });

    if (code === "2A1" && userId && posteSourceId) {
      return (
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
  highlight={highlight}
  tableBg={bg}
  userId={userId}
  gesResults={gesResults}
  setGesResults={setGesResults}
/>

        // <SourceA1Form
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
        //   handleSubmit={handleA1Submit}
        // />
      );
    }
    if (code === "2A3")
      return (
        <Source2A3Form
  key={code}
  posteSourceId={posteSourceId}
  a3Rows={a3Rows}
  setA3Rows={setA3Rows}
  addA3Row={addA3Row}
  removeA3Row={removeA3Row}
  updateA3Row={updateA3Row}
  userId={userId ?? ""}
  gesResults={gesResults}
  setGesResults={setGesResults}
  highlight={highlight}
  tableBg={bg}
/>



      );
    if (code === "2B1")
      return (
        <SourceB1Form
          key={code}
          b1Rows={b1Rows}
          setB1Rows={setB1Rows}
          addB1Row={addB1Row}
          highlight={highlight}
          tableBg={bg}
        />
      );
    return null;
  }

  return (
    <Box minH="100vh" bg={bg} py={10} px={{ base: 2, md: 10 }}>
      <Box maxW="7xl" mx="auto">
        <Heading as="h1" size="xl" color={highlight} textAlign="center" mb={2} fontWeight="bold">
          {posteLabel}
        </Heading>
        {loading || !userId || !enabledSources.length ? (
          <Box display="flex" alignItems="center" justifyContent="center" minH="50vh">
            <Spinner color={highlight} size="xl" />
          </Box>
        ) : enabledSources.length === 0 ? (
          <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
            Aucun mode de saisie n'est activé pour ce poste.
          </Text>
        ) : (
          enabledSources.map((source) => {
            const isHidden = !!sourceVisibility[source.source_code];
            if (isHidden) {
              return (
                <Text key={source.source_code} color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
                  La source <b>{source.label}</b> est masquée pour votre compte.
                </Text>
              );
            }
            return getFormForSource(source);
          })
        )}
      </Box>
    </Box>
  );
}

// import { useEffect, useState } from 'react';
// import { Box, Heading, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';
// import { SourceA1Form } from './SourceA1Form';
// import { SourceA3Form } from './SourceA3Form';
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
//   // Dummy GES results and submit (replace with real logic if needed)
//   const [gesResults, setGesResults] = useState<any[]>([]);
//   function handleSubmit() {
//     // ...your submit logic here, or call your API, etc.
//     setGesResults([{ total_co2_gco2e: 123 }]); // Example
//   }

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
//       if (!user) { setLoading(false); return; }
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
//       } else {
//         setPosteLabel(POSTE_LABEL);
//         setEnabledSources([]);
//         setSourceVisibility({});
//       }
//       setLoading(false);
//     })();
//   }, []);

//   // --- Modular form rendering ---
//   function getFormForSource(source: any) {
//     const code = source.source_code;
//     if (code === "A1")
//       return (
//         <SourceA1Form
//           key={code}
//           carburantGroups={carburantGroups}
//           updateGroupField={updateGroupField}
//           updateRowField={updateRowField}
//           addVehicleGroup={addVehicleGroup}
//           addRow={addRow}
//           removeRow={removeRow}
//           removeGroup={removeGroup}
//           flattenCarburantGroups={flattenCarburantGroups}
//           handleSubmit={handleSubmit}
//           gesResults={gesResults}
//           highlight={highlight}
//           tableBg={bg}
//         />
//       );
//     if (code === "A3")
//       return (
//         <SourceA3Form
//           key={code}
//           a3Rows={a3Rows}
//           setA3Rows={setA3Rows}
//           addA3Row={addA3Row}
//           highlight={highlight}
//           tableBg={bg}
//         />
//       );
//     if (code === "B1")
//       return (
//         <SourceB1Form
//           key={code}
//           b1Rows={b1Rows}
//           setB1Rows={setB1Rows}
//           addB1Row={addB1Row}
//           highlight={highlight}
//           tableBg={bg}
//         />
//       );
//     return null;
//   }

//   return (
//     <Box minH="100vh" bg={bg} py={10} px={{ base: 2, md: 10 }}>
//       <Box maxW="7xl" mx="auto">
//         <Heading as="h1" size="xl" color={highlight} textAlign="center" mb={2} fontWeight="bold">
//           {posteLabel}
//         </Heading>
//         {loading ? (
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
