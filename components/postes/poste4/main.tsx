import { useEffect, useState } from 'react';
import { Box, Heading, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import { Source4A1Form } from './Source4A1Form';
import { Source4B1Form } from './Source4B1Form';
import { Source4B2Form } from './Source4B2Form'; // ⬅️ NEW

// ---- Types for form state ----
type Source4A1Row = {
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

type Source4B1Row = {
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

// ⬅️ NEW: minimal 4B2 row shape (per your 4B2 form)
type Source4B2Row = {
  vehicle: string;
  date: string;
  refrigerant: string;
  qtyInEquipment: string;
  leakObserved: string; // facultatif
};

// Make sure this matches your forms!
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

const POSTE_LABEL = "POSTE 4 – VOTRE LIBELLÉ ICI";

export default function Poste4Page() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  // Shared data states for forms
  const [a1Rows, setA1Rows] = useState<Source4A1Row[]>([]);
  const [b1Rows, setB1Rows] = useState<Source4B1Row[]>([]);
  const [b2Rows, setB2Rows] = useState<Source4B2Row[]>([]); // ⬅️ NEW
  const [gesResults4A1, setGesResults4A1] = useState<GesResult[]>([]);
  const [gesResults4B1, setGesResults4B1] = useState<GesResult[]>([]);
  const [gesResults4B2, setGesResults4B2] = useState<GesResult[]>([]); // ⬅️ NEW

  // --- Handlers for 4A1
  const addA1Row = () =>
    setA1Rows(prev => [
      ...prev,
      {
        equipment: '',
        description: '',
        date: '',
        months: '',
        site: '',
        product: '',
        reference: '',
        refrigerationType: '',
        refrigerant: '',
        qtyInEquipment: '',
        leakObserved: '',
      },
    ]);
  const updateA1Row = (idx: number, key: keyof Source4A1Row, value: string) => {
    setA1Rows(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };
  const removeA1Row = (idx: number) => setA1Rows(prev => prev.filter((_, i) => i !== idx));

  // --- Handlers for 4B1
  const addB1Row = () =>
    setB1Rows(prev => [
      ...prev,
      {
        vehicle: '',
        description: '',
        date: '',
        months: '',
        site: '',
        product: '',
        reference: '',
        refrigerationType: '',
        refrigerant: '',
        qtyInEquipment: '',
        leakObserved: '',
        climatisation: '',
      },
    ]);
  const updateB1Row = (idx: number, key: keyof Source4B1Row, value: string) => {
    setB1Rows(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };
  const removeB1Row = (idx: number) => setB1Rows(prev => prev.filter((_, i) => i !== idx));

  // --- Handlers for 4B2 (minimal form) ---
  const addB2Row = () =>
    setB2Rows(prev => [
      ...prev,
      {
        vehicle: '',
        date: '',
        refrigerant: 'R-134a',  // default as requested
        qtyInEquipment: '',
        leakObserved: '',
      },
    ]);
  const updateB2Row = (idx: number, key: keyof Source4B2Row, value: string) => {
    setB2Rows(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };
  const removeB2Row = (idx: number) => setB2Rows(prev => prev.filter((_, i) => i !== idx));

  // --- Fetch user and config ---
  const highlight = '#245a7c';
  const bg = useColorModeValue('#f3f6ef', '#222e32');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Fetch source visibility for this user
      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      // Find the posteId for Poste 4 (by label containing "4")
      let poste4Id: string | null = null;
      if (data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          if (typeof label === "string" && label.toLowerCase().includes("4")) {
            poste4Id = id;
            break;
          }
        }
      }
      setPosteId(poste4Id);

      if (poste4Id) {
        setPosteLabel(data.posteLabels?.[poste4Id] || POSTE_LABEL);
        setEnabledSources(data.sources?.[poste4Id] || []);
        setSourceVisibility(data.sourceVisibility?.[poste4Id] || {});
      } else {
        setPosteLabel(POSTE_LABEL);
        setEnabledSources([]);
        setSourceVisibility({});
      }
      setLoading(false);
    })();
  }, []);

  // --- Modular form rendering ---
  function getFormForSource(source: any) {
    const code = source?.source_code;
    const posteSourceId = source?.id;

    if (code === "4A1" && userId && posteSourceId) {
      return (
        <Source4A1Form
          key={code}
          rows={a1Rows}
          setRows={setA1Rows}
          addRow={addA1Row}
          removeRow={removeA1Row}
          updateRow={updateA1Row}
          posteSourceId={posteSourceId}
          userId={userId}
          gesResults={gesResults4A1}
          setGesResults={setGesResults4A1}
          highlight={highlight}
          tableBg={bg}
        />
      );
    }
    if (code === "4B1" && userId && posteSourceId) {
      return (
        <Source4B1Form
          key={code}
          rows={b1Rows}
          setRows={setB1Rows}
          addRow={addB1Row}
          removeRow={removeB1Row}
          updateRow={updateB1Row}
          posteSourceId={posteSourceId}
          userId={userId}
          gesResults={gesResults4B1}
          setGesResults={setGesResults4B1}
          highlight={highlight}
          tableBg={bg}
        />
      );
    }
    // ⬅️ NEW: 4B2 rendering
    if (code === "4B2" && userId && posteSourceId) {
      return (
        <Source4B2Form
          key={code}
          rows={b2Rows}
          setRows={setB2Rows}
          addRow={addB2Row}
          removeRow={removeB2Row}
          updateRow={updateB2Row}
          posteSourceId={posteSourceId}
          userId={userId}
          gesResults={gesResults4B2}
          setGesResults={setGesResults4B2}
          highlight={highlight}
          tableBg={bg}
        />
      );
    }
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
// import { Source4A1Form } from './Source4A1Form';
// import { Source4B1Form } from './Source4B1Form';

// // ---- Types for form state ----
// type Source4A1Row = {
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
// type Source4B1Row = {
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

// // Make sure this matches your forms!
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

// const POSTE_LABEL = "POSTE 4 – VOTRE LIBELLÉ ICI";

// export default function Poste4Page() {
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [posteId, setPosteId] = useState<string | null>(null);
//   const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL);
//   const [enabledSources, setEnabledSources] = useState<any[]>([]);
//   const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

//   // Shared data states for forms
//   const [a1Rows, setA1Rows] = useState<Source4A1Row[]>([]);
//   const [b1Rows, setB1Rows] = useState<Source4B1Row[]>([]);
//   const [gesResults4A1, setGesResults4A1] = useState<GesResult[]>([]);
//   const [gesResults4B1, setGesResults4B1] = useState<GesResult[]>([]);

//   // --- Handlers for 4A1
//   const addA1Row = () =>
//     setA1Rows(prev => [
//       ...prev,
//       {
//         equipment: '',
//         description: '',
//         date: '',
//         months: '',
//         site: '',
//         product: '',
//         reference: '',
//         refrigerationType: '',
//         refrigerant: '',
//         qtyInEquipment: '',
//         leakObserved: '',
//       },
//     ]);
//   const updateA1Row = (idx: number, key: keyof Source4A1Row, value: string) => {
//     setA1Rows(prev => {
//       const copy = [...prev];
//       copy[idx][key] = value;
//       return copy;
//     });
//   };
//   const removeA1Row = (idx: number) => setA1Rows(prev => prev.filter((_, i) => i !== idx));

//   // --- Handlers for 4B1
//   const addB1Row = () =>
//     setB1Rows(prev => [
//       ...prev,
//       {
//         vehicle: '',
//         description: '',
//         date: '',
//         months: '',
//         site: '',
//         product: '',
//         reference: '',
//         refrigerationType: '',
//         refrigerant: '',
//         qtyInEquipment: '',
//         leakObserved: '',
//         climatisation: '',
//       },
//     ]);
//   const updateB1Row = (idx: number, key: keyof Source4B1Row, value: string) => {
//     setB1Rows(prev => {
//       const copy = [...prev];
//       copy[idx][key] = value;
//       return copy;
//     });
//   };
//   const removeB1Row = (idx: number) => setB1Rows(prev => prev.filter((_, i) => i !== idx));

//   // --- Fetch user and config ---
//   const highlight = '#245a7c';
//   const bg = useColorModeValue('#f3f6ef', '#222e32');

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         setLoading(false);
//         return;
//       }
//       setUserId(user.id);

//       // Fetch source visibility for this user
//       const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
//       const data = await res.json();

//       // Find the posteId for Poste 4 (by label containing "4")
//       let poste4Id: string | null = null;
//       if (data.posteLabels) {
//         for (const [id, label] of Object.entries(data.posteLabels)) {
//           if (typeof label === "string" && label.toLowerCase().includes("4")) {
//             poste4Id = id;
//             break;
//           }
//         }
//       }
//       setPosteId(poste4Id);

//       if (poste4Id) {
//         setPosteLabel(data.posteLabels?.[poste4Id] || POSTE_LABEL);
//         setEnabledSources(data.sources?.[poste4Id] || []);
//         setSourceVisibility(data.sourceVisibility?.[poste4Id] || {});
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
//     const code = source?.source_code;
//     const posteSourceId = source?.id;

//     if (code === "4A1" && userId && posteSourceId) {
//       return (
//         <Source4A1Form
//           key={code}
//           rows={a1Rows}
//           setRows={setA1Rows}
//           addRow={addA1Row}
//           removeRow={removeA1Row}
//           updateRow={updateA1Row}
//           posteSourceId={posteSourceId}
//           userId={userId}
//           gesResults={gesResults4A1}
//           setGesResults={setGesResults4A1}
//           highlight={highlight}
//           tableBg={bg}
//         />
//       );
//     }
//     if (code === "4B1" && userId && posteSourceId) {
//       return (
//         <Source4B1Form
//           key={code}
//           rows={b1Rows}
//           setRows={setB1Rows}
//           addRow={addB1Row}
//           removeRow={removeB1Row}
//           updateRow={updateB1Row}
//           posteSourceId={posteSourceId}
//           userId={userId}
//           gesResults={gesResults4B1}
//           setGesResults={setGesResults4B1}
//           highlight={highlight}
//           tableBg={bg}
//         />
//       );
//     }
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
