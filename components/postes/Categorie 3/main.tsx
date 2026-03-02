'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  Spinner,
  Text,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";

/* ===================== IMPORT YOUR SOURCE FORMS ===================== */
import Source33A1Form, { Source33A1Row } from "./source3A1Transport";
import Source34A1Form, { Source34A1Row } from "./source4A1Visitors";
import Source34B1Form, { Source34B1Row } from "./source4B1VisitorsCommute";
import Source35A1Form, { Source35A1Row } from "./source5A1BusinessCar";

/* ===================== UI TOKENS ===================== */
const COL = {
  bg: "#f3f5f2",
  section: "#f7f9f6",
  greenBar: "#1f3f33",
  border: "rgba(0,0,0,0.08)",
};

const POSTE_LABEL_FALLBACK = "Catégorie 3 - Émissions indirectes des transports";

/* ===================== TYPES ===================== */
type SubKey = "p31" | "p32" | "p33" | "p34" | "p35";

type Props = {
  /** comes from Section.tsx (selected pill key) */
  activeSubKey: SubKey | string;
};

/**
 * ✅ New Cat 3 structure (NO p7..p22)
 * 3.3B1 / 3.3B2 are excluded (moved to 4.5)
 */
export const SUBKEY_TO_SOURCE_CODES: Record<SubKey, string[]> = {
  p31: ["3.1A1", "3.1A2"],
  p32: ["3.2A1", "3.2B1"],
  p33: ["3.3A1", "3.3A2", "3.3A3"], // + special alt match "3A1" (DB)
  p34: ["3.4A1", "3.4A2", "3.4A3", "3.4B1"],
  p35: [
    "3.5A1",
    "3.5A2",
    "3.5A3",
    "3.5B1",
    "3.5B2",
    "3.5C1",
    "3.5D1",
    "3.5E1",
    "3.5F1",
  ],
};

export const LABEL_BY_SUBKEY: Record<SubKey, string> = {
  p31: "3.1 – Transport en amont",
  p32: "3.2 – Transport en aval",
  p33: "3.3 – Navettage des employés",
  p34: "3.4 – Déplacement des clients",
  p35: "3.5 – Déplacement d'affaires",
};

/* ===================== NORMALIZATION HELPERS ===================== */
const norm = (s: any) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, "");

/**
 * ✅ DB weirdness fix:
 * - Navettage may be stored as "3A1" instead of "3.3A1"
 */
const isNavettageCode = (code: string) => {
  const c = norm(code);
  return c === "3A1" || c === "3.3A1";
};

const matchesAllowed = (code: string, allowed: string[]) => {
  const c = norm(code);

  // direct match
  if (allowed.some((a) => norm(a) === c)) return true;

  // special: 3A1 <-> 3.3A1 equivalence
  if (c === "3A1" && allowed.some((a) => norm(a) === "3.3A1")) return true;
  if (c === "3.3A1" && allowed.some((a) => norm(a) === "3A1")) return true;

  return false;
};

export default function Categorie3Main({ activeSubKey }: Props) {
  const pageBg = useColorModeValue(COL.bg, "#222e32");
  const subKey = (activeSubKey as SubKey) || "p31";
  const title = LABEL_BY_SUBKEY[subKey] ?? POSTE_LABEL_FALLBACK;

  /* ===================== GLOBAL CONFIG ===================== */
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL_FALLBACK);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  /* ===================== FORMS STATE ===================== */

  // 3.3A1 / 3A1
  const [rows33A1, setRows33A1] = useState<Source33A1Row[]>([
    {
      methodology: "Données réelles",
      equipment: "",
      description: "",
      date: "",
      month: "",
      site: "",
      product: "",
      reference: "",
      transportMode: "",
      oneWayDistanceKm: "",
      workDaysPerYear: "",
      employeesSameTrip: "",
    },
  ]);
  const [ges33A1, setGes33A1] = useState<any[]>([]);

  // 3.4A1
  const [rows34A1, setRows34A1] = useState<Source34A1Row[]>([
    {
      methodology: "Données réelles",
      equipment: "",
      description: "",
      date: "",
      month: "",
      site: "",
      product: "",
      reference: "",
      event: "",
      transportMode: "",
      consumptionLPer100Km: "",
      distanceKm: "",
      fuelKnownL: "",
      identicalTrips: "",
    },
  ]);
  const [ges34A1, setGes34A1] = useState<any[]>([]);

  // 3.4B1 (Avion/Train/Bus)
  const [rows34B1, setRows34B1] = useState<Source34B1Row[]>([
    {
      methodology: "Données réelles",
      equipment: "",
      description: "",
      date: "",
      month: "",
      site: "",
      product: "",
      reference: "",
      event: "",
      transportMode: "",
      distanceKm: "",
      roundTrip: "Oui",
      identicalTrips: "",
    },
  ]);
  const [ges34B1, setGes34B1] = useState<any[]>([]);

  // ✅ 3.5A1 (Déplacements d'affaires en voiture)
  const [rows35A1, setRows35A1] = useState<Source35A1Row[]>([
    {
      methodology: "Données réelles",
      equipment: "",
      description: "",
      date: "",
      month: "",
      site: "",
      product: "",
      reference: "",
      transportMode: "",
      consumptionLPer100Km: "",
      distanceKm: "",
      fuelKnownL: "",
      identicalTrips: "",
    },
  ]);
  const [ges35A1, setGes35A1] = useState<any[]>([]);

  /* ===================== LOAD USER + POSTE CONFIG ===================== */
  useEffect(() => {
    (async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      /**
       * ✅ IMPORTANT FIX:
       * We are checking POSTE 3 (poste.num === 3), NOT "catégorie 3" text.
       */
      let p3Id: string | null = null;
      if (data?.postes && Array.isArray(data.postes)) {
        const p3 = data.postes.find((p: any) => Number(p?.num) === 3);
        p3Id = p3?.id ?? null;
      }

      // fallback (if api doesn't return data.postes)
      if (!p3Id && data?.posteLabels) {
        for (const [id, label] of Object.entries(
          data.posteLabels as Record<string, unknown>
        )) {
          const s = typeof label === "string" ? label.toLowerCase() : "";
          if (
            s.includes("poste 3") ||
            s.includes("catégorie 3") ||
            s.includes("categorie 3")
          ) {
            p3Id = id;
            break;
          }
        }
      }

      setPosteId(p3Id);

      if (p3Id) {
        setPosteLabel(data.posteLabels?.[p3Id] || POSTE_LABEL_FALLBACK);
        setEnabledSources(data.sources?.[p3Id] || []);
        setSourceVisibility(data.sourceVisibility?.[p3Id] || {});
      } else {
        setPosteLabel(POSTE_LABEL_FALLBACK);
        setEnabledSources([]);
        setSourceVisibility({});
      }

      setLoading(false);
    })();
  }, []);

  /* ===================== FILTER SOURCES BY SUB-CATEGORY PILL ===================== */
  const filteredSources = useMemo(() => {
    const allowed = SUBKEY_TO_SOURCE_CODES[subKey as SubKey] ?? [];
    if (allowed.length === 0) return [];

    console.log(
      "[Poste3 sources]",
      (enabledSources || []).map((s: any) => s?.source_code)
    );

    return (enabledSources || []).filter((s: any) => {
      const code = String(s?.source_code ?? "");
      const c = norm(code);

      // exclude moved ones
      if (c === "3.3B1" || c === "3.3B2") return false;

      return matchesAllowed(code, allowed);
    });
  }, [enabledSources, subKey]);

  const availableCodes = useMemo(() => {
    return (enabledSources || [])
      .map((s: any) => String(s?.source_code ?? ""))
      .filter(Boolean);
  }, [enabledSources]);

  /* ===================== RENDER FORM PER SOURCE ===================== */
  const renderSource = (source: any) => {
    const code: string = String(source?.source_code ?? "");
    const posteSourceId: string | undefined = source?.id;
    if (!code || !userId || !posteSourceId) return null;

    // If hidden (by code)
    if (sourceVisibility?.[code]) {
      return (
        <Text
          key={posteSourceId}
          color="red.600"
          textAlign="center"
          fontWeight="bold"
          fontSize="lg"
          mt={6}
        >
          La source <b>{source?.label ?? code}</b> est masquée pour votre compte.
        </Text>
      );
    }

    // ✅ 3.3A1 (Navettage): DB can be "3A1" OR "3.3A1"
    if (isNavettageCode(code)) {
      return (
        <Box key={posteSourceId} mt={6}>
          <Source33A1Form
            rows={rows33A1}
            setRows={setRows33A1}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges33A1}
            setGesResults={setGes33A1}
          />
        </Box>
      );
    }

    // ✅ 3.4A1 — Déplacements visiteurs en voiture
    if (norm(code) === "3.4A1") {
      return (
        <Box key={posteSourceId} mt={6}>
          <Source34A1Form
            rows={rows34A1}
            setRows={setRows34A1}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges34A1}
            setGesResults={setGes34A1}
          />
        </Box>
      );
    }

    // ✅ 3.4B1 — Déplacements visiteurs avion/train/bus
    if (norm(code) === "3.4B1") {
      return (
        <Box key={posteSourceId} mt={6}>
          <Source34B1Form
            rows={rows34B1}
            setRows={setRows34B1}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges34B1}
            setGesResults={setGes34B1}
          />
        </Box>
      );
    }

    // ✅ 3.5A1 — Déplacements d'affaires en voiture
    if (norm(code) === "3.5A1") {
      return (
        <Box key={posteSourceId} mt={6}>
          <Source35A1Form
            rows={rows35A1}
            setRows={setRows35A1}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges35A1}
            setGesResults={setGes35A1}
          />
        </Box>
      );
    }

    // Everything else: placeholder (until you implement forms)
    return (
      <Box
        key={posteSourceId}
        mt={6}
        bg="white"
        p={6}
        rounded="lg"
        border="1px solid"
        borderColor="#E1E7E3"
      >
        <Text fontWeight="bold" mb={2} color={COL.greenBar}>
          Source {code}
        </Text>
        <Text color="gray.600">
          Formulaire à venir pour <b>{code}</b>.
        </Text>
      </Box>
    );
  };

  /* ===================== PAGE RENDER ===================== */
  const allowedForThisPill = SUBKEY_TO_SOURCE_CODES[subKey as SubKey] ?? [];

  return (
    <Box
      bg={pageBg}
      minH="100vh"
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 10 }}
    >
      <Stack maxW="1200px" mx="auto" spacing={6}>
        <Heading as="h1" size="lg" textAlign="center" color={COL.greenBar}>
          {posteLabel}
        </Heading>

        <Heading
          as="h2"
          size="md"
          textAlign="center"
          color={COL.greenBar}
          fontWeight="semibold"
        >
          {title}
        </Heading>

        {loading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="40vh"
          >
            <Spinner color={COL.greenBar} size="xl" />
          </Box>
        ) : !userId ? (
          <Text
            color="red.600"
            textAlign="center"
            fontWeight="bold"
            fontSize="lg"
            mt={6}
          >
            Veuillez vous connecter.
          </Text>
        ) : allowedForThisPill.length === 0 ? (
          <Text
            color="red.600"
            textAlign="center"
            fontWeight="bold"
            fontSize="lg"
            mt={6}
          >
            Aucun source_code défini pour cette sous-catégorie (
            <b>{String(subKey)}</b>).
          </Text>
        ) : filteredSources.length === 0 ? (
          <Box>
            <Text
              color="red.600"
              textAlign="center"
              fontWeight="bold"
              fontSize="lg"
              mt={6}
            >
              Aucun mode de saisie n&apos;est activé pour cette sous-catégorie.
            </Text>

            <Text mt={4} textAlign="center" color="gray.600">
              Attendu : <b>{allowedForThisPill.join(" · ")}</b>
            </Text>

            <Text mt={2} textAlign="center" color="gray.600">
              Sources disponibles sur Poste 3 :{" "}
              <b>{availableCodes.length ? availableCodes.join(" · ") : "—"}</b>
            </Text>
          </Box>
        ) : (
          filteredSources.map(renderSource)
        )}
      </Stack>
    </Box>
  );
}

// 'use client';

// import React, { useEffect, useMemo, useState } from "react";
// import {
//   Box,
//   Heading,
//   Spinner,
//   Text,
//   Stack,
//   useColorModeValue,
// } from "@chakra-ui/react";
// import { supabase } from "../../../lib/supabaseClient";

// /* ===================== IMPORT YOUR SOURCE FORMS ===================== */
// import Source33A1Form, { Source33A1Row } from "./source3A1Transport";
// import Source34A1Form, { Source34A1Row } from "./source4A1Visitors";
// import Source34B1Form, { Source34B1Row } from "./source4B1VisitorsCommute";

// /* ===================== UI TOKENS ===================== */
// const COL = {
//   bg: "#f3f5f2",
//   section: "#f7f9f6",
//   greenBar: "#1f3f33",
//   border: "rgba(0,0,0,0.08)",
// };

// const POSTE_LABEL_FALLBACK = "Catégorie 3 - Émissions indirectes des transports";

// /* ===================== TYPES ===================== */
// type SubKey = "p31" | "p32" | "p33" | "p34" | "p35";

// type Props = {
//   /** comes from Section.tsx (selected pill key) */
//   activeSubKey: SubKey | string;
// };

// /**
//  * ✅ New Cat 3 structure (NO p7..p22)
//  * 3.3B1 / 3.3B2 are excluded (moved to 4.5)
//  */
// const SUBKEY_TO_SOURCE_CODES: Record<SubKey, string[]> = {
//   p31: ["3.1A1", "3.1A2"],
//   p32: ["3.2A1", "3.2B1"],
//   p33: ["3.3A1", "3.3A2", "3.3A3"], // + special alt match "3A1" (DB)
//   p34: ["3.4A1", "3.4A2", "3.4A3", "3.4B1"],
//   p35: [
//     "3.5A1",
//     "3.5A2",
//     "3.5A3",
//     "3.5B1",
//     "3.5B2",
//     "3.5C1",
//     "3.5D1",
//     "3.5E1",
//     "3.5F1",
//   ],
// };

// const LABEL_BY_SUBKEY: Record<SubKey, string> = {
//   p31: "3.1 – Transport en amont",
//   p32: "3.2 – Transport en aval",
//   p33: "3.3 – Navettage des employés",
//   p34: "3.4 – Déplacement des clients",
//   p35: "3.5 – Déplacement d'affaires",
// };

// /* ===================== NORMALIZATION HELPERS ===================== */
// const norm = (s: any) => String(s ?? "").trim().toUpperCase().replace(/\s+/g, "");

// /**
//  * ✅ DB weirdness fix:
//  * - Navettage may be stored as "3A1" instead of "3.3A1"
//  * So we treat 3A1 as equivalent to 3.3A1 for matching AND rendering.
//  */
// const isNavettageCode = (code: string) => {
//   const c = norm(code);
//   return c === "3A1" || c === "3.3A1";
// };

// const matchesAllowed = (code: string, allowed: string[]) => {
//   const c = norm(code);

//   // direct match
//   if (allowed.some((a) => norm(a) === c)) return true;

//   // special: 3A1 <-> 3.3A1 equivalence
//   if (c === "3A1" && allowed.some((a) => norm(a) === "3.3A1")) return true;
//   if (c === "3.3A1" && allowed.some((a) => norm(a) === "3A1")) return true;

//   return false;
// };

// export default function Categorie3Main({ activeSubKey }: Props) {
//   const pageBg = useColorModeValue(COL.bg, "#222e32");
//   const subKey = (activeSubKey as SubKey) || "p31";
//   const title = LABEL_BY_SUBKEY[subKey] ?? POSTE_LABEL_FALLBACK;

//   /* ===================== GLOBAL CONFIG ===================== */
//   const [loading, setLoading] = useState(true);
//   const [userId, setUserId] = useState<string | null>(null);

//   const [posteId, setPosteId] = useState<string | null>(null);
//   const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL_FALLBACK);
//   const [enabledSources, setEnabledSources] = useState<any[]>([]);
//   const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

//   /* ===================== FORMS STATE ===================== */

//   // 3.3A1 / 3A1
//   const [rows33A1, setRows33A1] = useState<Source33A1Row[]>([
//     {
//       methodology: "Données réelles",
//       equipment: "",
//       description: "",
//       date: "",
//       month: "",
//       site: "",
//       product: "",
//       reference: "",
//       transportMode: "",
//       oneWayDistanceKm: "",
//       workDaysPerYear: "",
//       employeesSameTrip: "",
//     },
//   ]);
//   const [ges33A1, setGes33A1] = useState<any[]>([]);

//   // 3.4A1
//   const [rows34A1, setRows34A1] = useState<Source34A1Row[]>([
//     {
//       methodology: "Données réelles",
//       equipment: "",
//       description: "",
//       date: "",
//       month: "",
//       site: "",
//       product: "",
//       reference: "",
//       event: "",
//       transportMode: "",
//       consumptionLPer100Km: "",
//       distanceKm: "",
//       fuelKnownL: "",
//       identicalTrips: "",
//     },
//   ]);
//   const [ges34A1, setGes34A1] = useState<any[]>([]);

//   // ✅ 3.4B1 (Avion/Train/Bus)
//   const [rows34B1, setRows34B1] = useState<Source34B1Row[]>([
//     {
//       methodology: "Données réelles",
//       equipment: "",
//       description: "",
//       date: "",
//       month: "",
//       site: "",
//       product: "",
//       reference: "",
//       event: "",
//       transportMode: "",
//       distanceKm: "",
//       roundTrip: "Oui",
//       identicalTrips: "",
//     },
//   ]);
//   const [ges34B1, setGes34B1] = useState<any[]>([]);

//   /* ===================== LOAD USER + POSTE CONFIG ===================== */
//   useEffect(() => {
//     (async () => {
//       setLoading(true);

//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         setUserId(null);
//         setLoading(false);
//         return;
//       }
//       setUserId(user.id);

//       const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
//       const data = await res.json();

//       /**
//        * ✅ IMPORTANT FIX:
//        * We are checking POSTE 3 (poste.num === 3), NOT "catégorie 3" text.
//        */
//       let p3Id: string | null = null;
//       if (data?.postes && Array.isArray(data.postes)) {
//         const p3 = data.postes.find((p: any) => Number(p?.num) === 3);
//         p3Id = p3?.id ?? null;
//       }

//       // fallback (if api doesn't return data.postes)
//       if (!p3Id && data?.posteLabels) {
//         for (const [id, label] of Object.entries(
//           data.posteLabels as Record<string, unknown>
//         )) {
//           const s = typeof label === "string" ? label.toLowerCase() : "";
//           if (
//             s.includes("poste 3") ||
//             s.includes("catégorie 3") ||
//             s.includes("categorie 3")
//           ) {
//             p3Id = id;
//             break;
//           }
//         }
//       }

//       setPosteId(p3Id);

//       if (p3Id) {
//         setPosteLabel(data.posteLabels?.[p3Id] || POSTE_LABEL_FALLBACK);
//         setEnabledSources(data.sources?.[p3Id] || []);
//         setSourceVisibility(data.sourceVisibility?.[p3Id] || {});
//       } else {
//         setPosteLabel(POSTE_LABEL_FALLBACK);
//         setEnabledSources([]);
//         setSourceVisibility({});
//       }

//       setLoading(false);
//     })();
//   }, []);

//   /* ===================== FILTER SOURCES BY SUB-CATEGORY PILL ===================== */
//   const filteredSources = useMemo(() => {
//     const allowed = SUBKEY_TO_SOURCE_CODES[subKey as SubKey] ?? [];
//     if (allowed.length === 0) return [];

//     // Debug
//     console.log(
//       "[Poste3 sources]",
//       (enabledSources || []).map((s: any) => s?.source_code)
//     );

//     return (enabledSources || []).filter((s: any) => {
//       const code = String(s?.source_code ?? "");
//       const c = norm(code);

//       // exclude moved ones
//       if (c === "3.3B1" || c === "3.3B2") return false;

//       return matchesAllowed(code, allowed);
//     });
//   }, [enabledSources, subKey]);

//   const availableCodes = useMemo(() => {
//     return (enabledSources || [])
//       .map((s: any) => String(s?.source_code ?? ""))
//       .filter(Boolean);
//   }, [enabledSources]);

//   /* ===================== RENDER FORM PER SOURCE ===================== */
//   const renderSource = (source: any) => {
//     const code: string = String(source?.source_code ?? "");
//     const posteSourceId: string | undefined = source?.id;
//     if (!code || !userId || !posteSourceId) return null;

//     // If hidden (by code)
//     if (sourceVisibility?.[code]) {
//       return (
//         <Text
//           key={posteSourceId}
//           color="red.600"
//           textAlign="center"
//           fontWeight="bold"
//           fontSize="lg"
//           mt={6}
//         >
//           La source <b>{source?.label ?? code}</b> est masquée pour votre compte.
//         </Text>
//       );
//     }

//     // ✅ 3.3A1 (Navettage): DB can be "3A1" OR "3.3A1"
//     if (isNavettageCode(code)) {
//       return (
//         <Box key={posteSourceId} mt={6}>
//           <Source33A1Form
//             rows={rows33A1}
//             setRows={setRows33A1}
//             posteSourceId={posteSourceId}
//             userId={userId}
//             gesResults={ges33A1}
//             setGesResults={setGes33A1}
//           />
//         </Box>
//       );
//     }

//     // ✅ 3.4A1 — Déplacements visiteurs en voiture
//     if (norm(code) === "3.4A1") {
//       return (
//         <Box key={posteSourceId} mt={6}>
//           <Source34A1Form
//             rows={rows34A1}
//             setRows={setRows34A1}
//             posteSourceId={posteSourceId}
//             userId={userId}
//             gesResults={ges34A1}
//             setGesResults={setGes34A1}
//           />
//         </Box>
//       );
//     }

//     // ✅ 3.4B1 — Déplacements visiteurs avion/train/bus
//     if (norm(code) === "3.4B1") {
//       return (
//         <Box key={posteSourceId} mt={6}>
//           <Source34B1Form
//             rows={rows34B1}
//             setRows={setRows34B1}
//             posteSourceId={posteSourceId}
//             userId={userId}
//             gesResults={ges34B1}
//             setGesResults={setGes34B1}
//           />
//         </Box>
//       );
//     }

//     // Everything else: placeholder (until you implement forms)
//     return (
//       <Box
//         key={posteSourceId}
//         mt={6}
//         bg="white"
//         p={6}
//         rounded="lg"
//         border="1px solid"
//         borderColor="#E1E7E3"
//       >
//         <Text fontWeight="bold" mb={2} color={COL.greenBar}>
//           Source {code}
//         </Text>
//         <Text color="gray.600">
//           Formulaire à venir pour <b>{code}</b>.
//         </Text>
//       </Box>
//     );
//   };

//   /* ===================== PAGE RENDER ===================== */
//   const allowedForThisPill = SUBKEY_TO_SOURCE_CODES[subKey as SubKey] ?? [];

//   return (
//     <Box
//       bg={pageBg}
//       minH="100vh"
//       px={{ base: 4, md: 8 }}
//       py={{ base: 6, md: 10 }}
//     >
//       <Stack maxW="1200px" mx="auto" spacing={6}>
//         <Heading as="h1" size="lg" textAlign="center" color={COL.greenBar}>
//           {posteLabel}
//         </Heading>

//         <Heading
//           as="h2"
//           size="md"
//           textAlign="center"
//           color={COL.greenBar}
//           fontWeight="semibold"
//         >
//           {title}
//         </Heading>

//         {loading ? (
//           <Box
//             display="flex"
//             alignItems="center"
//             justifyContent="center"
//             minH="40vh"
//           >
//             <Spinner color={COL.greenBar} size="xl" />
//           </Box>
//         ) : !userId ? (
//           <Text
//             color="red.600"
//             textAlign="center"
//             fontWeight="bold"
//             fontSize="lg"
//             mt={6}
//           >
//             Veuillez vous connecter.
//           </Text>
//         ) : allowedForThisPill.length === 0 ? (
//           <Text
//             color="red.600"
//             textAlign="center"
//             fontWeight="bold"
//             fontSize="lg"
//             mt={6}
//           >
//             Aucun source_code défini pour cette sous-catégorie (
//             <b>{String(subKey)}</b>).
//           </Text>
//         ) : filteredSources.length === 0 ? (
//           <Box>
//             <Text
//               color="red.600"
//               textAlign="center"
//               fontWeight="bold"
//               fontSize="lg"
//               mt={6}
//             >
//               Aucun mode de saisie n&apos;est activé pour cette sous-catégorie.
//             </Text>

//             <Text mt={4} textAlign="center" color="gray.600">
//               Attendu : <b>{allowedForThisPill.join(" · ")}</b>
//             </Text>

//             <Text mt={2} textAlign="center" color="gray.600">
//               Sources disponibles sur Poste 3 :{" "}
//               <b>{availableCodes.length ? availableCodes.join(" · ") : "—"}</b>
//             </Text>
//           </Box>
//         ) : (
//           filteredSources.map(renderSource)
//         )}
//       </Stack>
//     </Box>
//   );
// }


