import React, { useState, useEffect } from "react";
import { Box, Heading, Spinner, Text } from "@chakra-ui/react";
import { Source1AForm, Source1ARow } from "../poste1/SourceA1Form";
import { supabase } from "../../../lib/supabaseClient";

const POSTE_LABEL = "1A1 – Chauffage des bâtiments et équipements fixes";

// Same brand green as 2A3
const HIGHLIGHT = "#264a3b";
const TABLE_BG = "#f3f6ef";

export default function Poste1A1Page() {
  const [rows, setRows] = useState<Source1ARow[]>([
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
  const [posteSourceId, setPosteSourceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gesResults, setGesResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1. Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // 2. Fetch source visibility config for this user
      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      // 3. Find posteId for Poste 1 (label containing "1")
      let poste1Id: string | null = null;
      if (data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          if (typeof label === "string" && label.toLowerCase().includes("1")) {
            poste1Id = id;
            break;
          }
        }
      }

      // 4. Find source.id for source_code "1A1" in Poste 1
      if (poste1Id && data.sources?.[poste1Id]) {
        const found = data.sources[poste1Id].find(
          (src: any) => src.source_code === "1A1"
        );
        if (found) setPosteSourceId(found.id);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <Box minH="100vh" bg={TABLE_BG} py={10} px={{ base: 2, md: 10 }}>
      <Box maxW="7xl" mx="auto">
        <Heading
          as="h1"
          size="xl"
          color={HIGHLIGHT}
          textAlign="center"
          mb={6}
          fontWeight="bold"
        >
          {POSTE_LABEL}
        </Heading>

        {loading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="50vh"
          >
            <Spinner color={HIGHLIGHT} size="xl" />
          </Box>
        ) : !posteSourceId || !userId ? (
          <Text
            color="red.600"
            textAlign="center"
            fontWeight="bold"
            fontSize="lg"
            mt={6}
          >
            Source ou utilisateur introuvable.
          </Text>
        ) : (
          <Source1AForm
            rows={rows}
            setRows={setRows}
            highlight={HIGHLIGHT}
            tableBg={TABLE_BG}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={gesResults}
            setGesResults={setGesResults}
          />
        )}
      </Box>
    </Box>
  );
}

// import React, { useState, useEffect } from "react";
// import { Box, Heading, Spinner, Text } from "@chakra-ui/react";
// import { Source1AForm, Source1ARow } from "../poste1/SourceA1Form";
// import { supabase } from '../../../lib/supabaseClient';

// const POSTE_LABEL = "1A1 – Chauffage des bâtiments et équipements fixes";

// export default function Poste1A1Page() {
//   const [rows, setRows] = useState<Source1ARow[]>([
//     {
//       equipment: "",
//       description: "",
//       date: "",
//       site: "",
//       product: "",
//       reference: "",
//       usageAndFuel: "",
//       qty: "",
//       unit: "",
//     },
//   ]);
//   const [posteSourceId, setPosteSourceId] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [gesResults, setGesResults] = useState<any[]>([]);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       // 1. Get user
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         setLoading(false);
//         return;
//       }
//       setUserId(user.id);

//       // 2. Fetch source visibility config for this user
//       const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
//       const data = await res.json();

//       // 3. Find posteId for Poste 1 (label containing "1")
//       let poste1Id: string | null = null;
//       if (data.posteLabels) {
//         for (const [id, label] of Object.entries(data.posteLabels)) {
//           if (typeof label === "string" && label.toLowerCase().includes("1")) {
//             poste1Id = id;
//             break;
//           }
//         }
//       }

//       // 4. Find source.id for source_code "1A1" in Poste 1
//       if (poste1Id && data.sources?.[poste1Id]) {
//         const found = data.sources[poste1Id].find((src: any) => src.source_code === "1A1");
//         if (found) setPosteSourceId(found.id);
//       }

//       setLoading(false);
//     })();
//   }, []);

//   const handleSubmit = async (posteSourceId: string) => {
//     setLoading(true);
//     try {
//       const res = await fetch("/api/1a1submit", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           user_id: userId,
//           poste_source_id: posteSourceId,
//           source_code: "1A1",
//           data: { rows },
//         }),
//       });
//       const result = await res.json();
//       if (!res.ok) throw new Error(result.error || "Erreur lors de la soumission");
//       setGesResults(Array.isArray(result.results) ? result.results : []);
//       alert("Soumission réussie !");
//     } catch (err) {
//       alert("Erreur : " + (err as any).message);
//     }
//     setLoading(false);
//   };

//   return (
//     <Box minH="100vh" bg="#f3f6ef" py={10} px={{ base: 2, md: 10 }}>
//       <Box maxW="7xl" mx="auto">
//         <Heading as="h1" size="xl" color="#245a7c" textAlign="center" mb={6} fontWeight="bold">
//           {POSTE_LABEL}
//         </Heading>
//         {loading ? (
//           <Box display="flex" alignItems="center" justifyContent="center" minH="50vh">
//             <Spinner color="#245a7c" size="xl" />
//           </Box>
//         ) : !posteSourceId || !userId ? (
//           <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
//             Source ou utilisateur introuvable.
//           </Text>
//         ) : (
//           <Source1AForm
//   rows={rows}
//   setRows={setRows}
//   posteSourceId={posteSourceId}
//   userId={userId}
//   gesResults={gesResults}
//   setGesResults={setGesResults}
// />

//         )}
//       </Box>
//     </Box>
//   );
// }
