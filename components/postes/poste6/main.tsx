import { useEffect, useState } from 'react';
import { Box, Heading, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import { SourceAForm } from './Source1Form';      // 6A1
import { Source6B1Form } from './Source6B1Form';  // 6B1

const POSTE_LABEL = "POSTE 6 – ÉLECTRICITÉ";

export default function Poste6Page() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  // Styling
  const olive = '#708238';
  const oliveBg = useColorModeValue('#f6f8f3', '#202616');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Fetch poste/source visibility for this user
      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      // Find the posteId for Poste 6
      let poste6Id: string | null = null;
      if (data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          if (typeof label === "string" && label.toLowerCase().includes("6")) {
            poste6Id = id;
            break;
          }
        }
      }
      setPosteId(poste6Id);

      if (poste6Id) {
        setPosteLabel(data.posteLabels?.[poste6Id] || POSTE_LABEL);
        setEnabledSources(data.sources?.[poste6Id] || []);
        setSourceVisibility(data.sourceVisibility?.[poste6Id] || {});
      } else {
        setPosteLabel(POSTE_LABEL);
        setEnabledSources([]);
        setSourceVisibility({});
      }
      setLoading(false);
    })();
  }, []);

  // --- Modular form rendering for 6A1 and 6B1 ---
  function getFormForSource(source: any) {
    const code = source?.source_code;
    const posteSourceId = source?.id;
    if (!userId || !posteSourceId) return null;

    if (code === "6A1") {
      return (
        <Box key={code} mb={6}>
          <SourceAForm
            posteId={posteSourceId}
            posteNum={6}
            posteLabel="6A1 - Électricité provenant du réseau électrique (Location based)"
            userId={userId}
          />
        </Box>
      );
    }
    if (code === "6B1") {
      return (
        <Box key={code} mb={0}>
          <Source6B1Form
            posteId={posteSourceId}
            posteNum={6}
            posteLabel="6B1 - Électricité provenant du réseau électrique (Market based)"
            userId={userId}
          />
        </Box>
      );
    }
    return null;
  }

  return (
    <Box minH="100vh" bg={oliveBg} py={10} px={{ base: 2, md: 10 }}>
      <Box maxW="7xl" mx="auto">
        <Heading as="h1" size="xl" color={olive} textAlign="center" mb={2} fontWeight="bold">
          {posteLabel}
        </Heading>
        {loading || !userId ? (
          <Box display="flex" alignItems="center" justifyContent="center" minH="50vh">
            <Spinner color={olive} size="xl" />
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
// import { SourceAForm } from './Source1Form';

// const POSTE_NUM = 6;
// const POSTE_LABEL = "POSTE 6 – ÉLECTRICITÉ";
// const SOURCE_CODE = "A";
// const DEFAULT_POSTE_ID = ''; // fallback, leave empty string if you want strict matching

// export default function Poste6Page() {
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [posteId, setPosteId] = useState<string | null>(null);
//   const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL);
//   const [isPosteVisible, setIsPosteVisible] = useState<boolean>(true); // Default to true!
//   const [isSourceVisible, setIsSourceVisible] = useState<boolean>(true); // Default to true!

//   const olive = '#708238';
//   const oliveBg = useColorModeValue('#f6f8f3', '#202616');

//   useEffect(() => {
//     (async () => {
//       setLoading(true);

//       // 1. Get current user
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) { setLoading(false); return; }
//       setUserId(user.id);

//       // 2. Get poste/source visibility for this user
//       const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
//       const data = await res.json();

//       // 3. Find the posteId for POSTE 6 by label or by known poste number
//       let poste6Id: string | null = null;
//       if (data.posteLabels) {
//         for (const [id, label] of Object.entries(data.posteLabels)) {
//           if (
//             typeof label === "string" &&
//             (label.toLowerCase().includes("6") ||
//               label.replace(/[^\d]/g, '') === POSTE_NUM.toString() || // label might be "Poste 6"
//               id === POSTE_NUM.toString())
//           ) {
//             poste6Id = id;
//             break;
//           }
//         }
//       }
//       if (!poste6Id) poste6Id = DEFAULT_POSTE_ID;
//       setPosteId(poste6Id);

//       // 4. Set the poste label if found, else fallback
//       setPosteLabel(data.posteLabels?.[poste6Id] || POSTE_LABEL);

//       // 5. Set poste visibility (if missing from API, treat as visible)
//       const posteHidden = data.posteVisibility?.[poste6Id];
//       setIsPosteVisible(posteHidden !== true);

//       // 6. Set source visibility (if missing from API, treat as visible)
//       const isSourceHidden = data.sourceVisibility?.[poste6Id]?.[SOURCE_CODE];
//       setIsSourceVisible(isSourceHidden !== true);

//       setLoading(false);
//     })();
//   }, []);

//   return (
//     <Box minH="100vh" bg={oliveBg} py={10} px={{ base: 2, md: 10 }}>
//       <Box maxW="7xl" mx="auto">
//         <Heading as="h1" size="xl" color={olive} textAlign="center" mb={2} fontWeight="bold">
//           {posteLabel}
//         </Heading>
//         {loading ? (
//           <Box display="flex" alignItems="center" justifyContent="center" minH="50vh">
//             <Spinner color={olive} size="xl" />
//           </Box>
//         ) : !isPosteVisible ? (
//           <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
//             Ce poste est masqué pour votre compte.
//           </Text>
//         ) : !isSourceVisible ? (
//           <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
//             La source de données pour ce poste est masquée pour votre compte.
//           </Text>
//         ) : (
//           posteId && userId && (
//             <SourceAForm
//               posteId={posteId}
//               posteNum={POSTE_NUM}
//               // posteLabel={posteLabel}
//               posteLabel="6A1 - Électricité provenant du réseaux électrique (Location based)"
//               userId={userId}
//             />
//           )
//         )}
//       </Box>
//     </Box>
//   );
// }
