'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, HStack, Heading, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import { SourceAForm } from './Source6A1Form';      // 6A1
import { Source6B1Form } from './Source6B1Form';   // 6B1

const POSTE_LABEL_FALLBACK = "Émissions indirects de l'énergie importée";

/** pills in Section.tsx for Cat 2 */
type SubKey = 'products' | 'autre_energie';

/** Map pills -> source codes that belong to Poste 2 */
const SUBKEY_TO_SOURCE_CODES: Record<SubKey, string[]> = {
  products: ['6A1', '6B1'],
  autre_energie: [], // later
};

type Props = {
  /** pass selectedMenu from Section.tsx: "products" | "autre_energie" */
  activeSubKey: SubKey | string;
  bilanId?: string;
  onNextSource?: () => void;
  onPrevSource?: () => void;
  onGesChange?: (tco2e: number) => void;
};

export default function Categorie2EnergiePage({ activeSubKey, bilanId, onNextSource, onPrevSource, onGesChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [ges6A1, setGes6A1] = useState(0);
  const [ges6B1, setGes6B1] = useState(0);

  useEffect(() => { onGesChange?.(ges6A1 + ges6B1); }, [ges6A1, ges6B1, onGesChange]);

  // ✅ Catégorie 2 = Poste 2 (DB)
  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL_FALLBACK);
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

      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      // ✅ Find posteId by poste.num === 2 (robust)
      let poste2Id: string | null = null;

      if (data?.postes && Array.isArray(data.postes)) {
        const p2 = data.postes.find((p: any) => Number(p?.num) === 2);
        poste2Id = p2?.id ?? null;
      }

      // fallback if api doesn't return data.postes
      if (!poste2Id && data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          const s = typeof label === 'string' ? label.toLowerCase() : '';
          if (
            s.includes('poste 2') ||
            s.includes("énergie importée") ||
            s.includes("energie importee")
          ) {
            poste2Id = id;
            break;
          }
        }
      }

      setPosteId(poste2Id);

      if (poste2Id) {
        setPosteLabel(data.posteLabels?.[poste2Id] || POSTE_LABEL_FALLBACK);
        setEnabledSources(data.sources?.[poste2Id] || []);
        setSourceVisibility(data.sourceVisibility?.[poste2Id] || {});
      } else {
        setPosteLabel(POSTE_LABEL_FALLBACK);
        setEnabledSources([]);
        setSourceVisibility({});
      }

      setLoading(false);
    })();
  }, []);

  /** ✅ Filter enabled sources by the active pill */
  const filteredSources = useMemo(() => {
    const key = activeSubKey as SubKey;
    const allowed = SUBKEY_TO_SOURCE_CODES[key] ?? [];
    if (allowed.length === 0) return [];
    return (enabledSources || []).filter((s: any) =>
      allowed.includes(String(s?.source_code))
    );
  }, [enabledSources, activeSubKey]);

  function getFormForSource(source: any) {
    const code = source?.source_code;
    const posteSourceId = source?.id;
    if (!userId || !posteSourceId) return null;

    if (code === "6A1") {
      return (
        <Box key={code} mb={6}>
          <SourceAForm
            posteId={posteSourceId}
            posteNum={2}
            posteLabel="6A1 - Électricité provenant du réseau électrique (Location based)"
            userId={userId}
            bilanId={bilanId}
            onGesChange={setGes6A1}
          />
        </Box>
      );
    }

    if (code === "6B1") {
      return (
        <Box key={code} mb={0}>
          <Source6B1Form
            posteId={posteSourceId}
            posteNum={2}
            posteLabel="6B1 - Électricité provenant du réseau électrique (Market based)"
            userId={userId}
            bilanId={bilanId}
            onGesChange={setGes6B1}
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
        ) : filteredSources.length === 0 ? (
          <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
            Aucun mode de saisie n&apos;est activé pour cette sous-catégorie.
          </Text>
        ) : (
          filteredSources.map((source) => {
            const isHidden = !!sourceVisibility[source.source_code];
            if (isHidden) {
              return (
                <Text
                  key={source.source_code}
                  color="red.600"
                  textAlign="center"
                  fontWeight="bold"
                  fontSize="lg"
                  mt={6}
                >
                  La source <b>{source.label}</b> est masquée pour votre compte.
                </Text>
              );
            }
            return getFormForSource(source);
          })
        )}

        {!loading && userId && (
          <HStack justify="space-between" mt={6} spacing={4}>
            <Button
              variant="outline"
              borderColor="#1f3f33"
              color="#1f3f33"
              _hover={{ bg: "#e8f0ea" }}
              size="md"
              px={6}
              isDisabled={!onPrevSource}
              onClick={onPrevSource}
            >
              ← Source précédente
            </Button>
            <HStack spacing={4}>
              <Button
                variant="outline"
                borderColor="#1f3f33"
                color="#1f3f33"
                _hover={{ bg: "#e8f0ea" }}
                size="md"
                px={6}
                isDisabled
              >
                Valider la source
              </Button>
              <Button
                bg="#1f3f33"
                color="white"
                _hover={{ bg: "#2d5c4a" }}
                size="md"
                px={6}
                isDisabled={!onNextSource}
                onClick={onNextSource}
              >
                Prochaine Source →
              </Button>
            </HStack>
          </HStack>
        )}
      </Box>
    </Box>
  );
}

// import { useEffect, useState } from 'react';
// import { Box, Heading, Spinner, Text, useColorModeValue } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';
// import { SourceAForm } from './Source6A1Form';      // 6A1
// import { Source6B1Form } from './Source6B1Form';  // 6B1

// const POSTE_LABEL = "POSTE 6 – ÉLECTRICITÉ";

// export default function Poste6Page() {
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [posteId, setPosteId] = useState<string | null>(null);
//   const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL);
//   const [enabledSources, setEnabledSources] = useState<any[]>([]);
//   const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

//   // Styling
//   const olive = '#708238';
//   const oliveBg = useColorModeValue('#f6f8f3', '#202616');

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) { setLoading(false); return; }
//       setUserId(user.id);

//       // Fetch poste/source visibility for this user
//       const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
//       const data = await res.json();

//       // Find the posteId for Poste 6
//       let poste6Id: string | null = null;
//       if (data.posteLabels) {
//         for (const [id, label] of Object.entries(data.posteLabels)) {
//           if (typeof label === "string" && label.toLowerCase().includes("6")) {
//             poste6Id = id;
//             break;
//           }
//         }
//       }
//       setPosteId(poste6Id);

//       if (poste6Id) {
//         setPosteLabel(data.posteLabels?.[poste6Id] || POSTE_LABEL);
//         setEnabledSources(data.sources?.[poste6Id] || []);
//         setSourceVisibility(data.sourceVisibility?.[poste6Id] || {});
//       } else {
//         setPosteLabel(POSTE_LABEL);
//         setEnabledSources([]);
//         setSourceVisibility({});
//       }
//       setLoading(false);
//     })();
//   }, []);

//   // --- Modular form rendering for 6A1 and 6B1 ---
//   function getFormForSource(source: any) {
//     const code = source?.source_code;
//     const posteSourceId = source?.id;
//     if (!userId || !posteSourceId) return null;

//     if (code === "6A1") {
//       return (
//         <Box key={code} mb={6}>
//           <SourceAForm
//             posteId={posteSourceId}
//             posteNum={6}
//             posteLabel="6A1 - Électricité provenant du réseau électrique (Location based)"
//             userId={userId}
//           />
//         </Box>
//       );
//     }
//     if (code === "6B1") {
//       return (
//         <Box key={code} mb={0}>
//           <Source6B1Form
//             posteId={posteSourceId}
//             posteNum={6}
//             posteLabel="6B1 - Électricité provenant du réseau électrique (Market based)"
//             userId={userId}
//           />
//         </Box>
//       );
//     }
//     return null;
//   }

//   return (
//     <Box minH="100vh" bg={oliveBg} py={10} px={{ base: 2, md: 10 }}>
//       <Box maxW="7xl" mx="auto">
//         <Heading as="h1" size="xl" color={olive} textAlign="center" mb={2} fontWeight="bold">
//           {posteLabel}
//         </Heading>
//         {loading || !userId ? (
//           <Box display="flex" alignItems="center" justifyContent="center" minH="50vh">
//             <Spinner color={olive} size="xl" />
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
