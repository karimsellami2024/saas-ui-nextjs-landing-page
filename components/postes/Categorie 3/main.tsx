import React, { useEffect, useState } from "react";
import { Box, Heading, Spinner, Text } from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";

// ✅ import your Category 3 source form
import Source33A1Form, { Source33A1Row } from "./source3A1Transport";

const POSTE_LABEL = "3.3A1 – Navettage des employés";

// Same brand green as your example
const HIGHLIGHT = "#264a3b";
const TABLE_BG = "#f3f6ef";

export default function Poste33A1Page() {
  const [rows, setRows] = useState<Source33A1Row[]>([
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

  const [posteSourceId, setPosteSourceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // results (optional, but useful for header / export later)
  const [gesResults, setGesResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // 2) Fetch source visibility config for this user
      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      /**
       * ✅ Adapted logic for category 3:
       * We try to find the posteId whose label contains "3"
       * (exact same logic as your Poste1 page, but for category 3)
       */
      let poste3Id: string | null = null;
      if (data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          if (typeof label === "string" && label.toLowerCase().includes("3")) {
            poste3Id = id;
            break;
          }
        }
      }

      /**
       * ✅ Find source.id for source_code "3.3A1" inside Poste 3
       */
      if (poste3Id && data.sources?.[poste3Id]) {
        const found = data.sources[poste3Id].find(
          (src: any) => src.source_code === "3.3A1"
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
          <Box display="flex" alignItems="center" justifyContent="center" minH="50vh">
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
          <Source33A1Form
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
