'use client';

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  HStack,
  VStack,
  Heading,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { FiHelpCircle as HelpCircle } from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";

import SidebarRail from "./SidebarRail";

import NewDashboard from "#components/newdashboard";
import DashboardPage from "#components/postes/dash";

import Categorie1Page from "#components/postes/Categorie1/main";
import Categorie2EnergiePage from "#components/postes/-Categorie2-poste6/main";
import Categorie3Page from "#components/postes/Categorie 3/main";

import NotificationsPage from "#components/postes/entreprise";
import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";

const pageBg = "#F3F6EF";
const cardShadow = "0 10px 28px rgba(0,0,0,0.07)";
const COL = {
  textBody: "#213A2E",
  textMuted: "#51645B",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF1EC",
  border: "#E1E7E3",
  greenPill: "#264a3b",
  greenBar: "#214B3A",
};

type PosteRow = { id: string; label: string; num?: number };
type TopKey = "dashboard" | "bilan" | "rapport";

type GroupKey =
  | "direct"
  | "energie_importee"
  | "transports"
  | "produits_utilises"
  | "utilisation_produits"
  | "autres_indirects";

type IsoCategoryKey = "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | "cat6";

/**
 * ✅ REMOVED old p7..p23 logic for Cat 3
 * Cat 3 now uses only:
 * - p31 => 3.1 Transport en amont
 * - p32 => 3.2 Transport en aval
 * - p33 => 3.3 Navettage des employés
 * - p34 => 3.4 Déplacement des clients
 * - p35 => 3.5 Déplacement d'affaires
 */
const menuToIsoCategory = (menuKey: string): IsoCategoryKey => {
  if (["combustion_fixes", "combustion_mobiles", "procedes", "refrigerants", "sols"].includes(menuKey)) return "cat1";
  if (["products", "autre_energie"].includes(menuKey)) return "cat2";
  if (["p31", "p32", "p33", "p34", "p35"].includes(menuKey)) return "cat3";
  if (["p9", "p10", "p11", "p14"].includes(menuKey)) return "cat4";
  if (["p18", "p21", "p19", "p15", "p20"].includes(menuKey)) return "cat5";
  return "cat6";
};

const defaultMenuForCategory: Record<IsoCategoryKey, string> = {
  cat1: "combustion_fixes",
  cat2: "products",
  cat3: "p31",
  cat4: "p9",
  cat5: "p18",
  cat6: "p23",
};

const isoToGroup = (cat: IsoCategoryKey): GroupKey => {
  if (cat === "cat1") return "direct";
  if (cat === "cat2") return "energie_importee";
  if (cat === "cat3") return "transports";
  if (cat === "cat4") return "produits_utilises";
  if (cat === "cat5") return "utilisation_produits";
  return "autres_indirects";
};

const groupToIso = (g: GroupKey): IsoCategoryKey => {
  if (g === "direct") return "cat1";
  if (g === "energie_importee") return "cat2";
  if (g === "transports") return "cat3";
  if (g === "produits_utilises") return "cat4";
  if (g === "utilisation_produits") return "cat5";
  return "cat6";
};

/** ✅ DB TRUTH: categories map to poste.num */
const isoToPosteNum: Record<IsoCategoryKey, number> = {
  cat1: 1,
  cat2: 2,
  cat3: 3,
  cat4: 4,
  cat5: 5,
  cat6: 6,
};

const POSTE_META: Record<string, { groupTitle: string; posteTitle: string; description: string }> = {
  combustion_fixes: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Saisissez vos combustibles fixes (chaudières, fours, etc.).",
  },
  combustion_mobiles: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Saisissez vos véhicules / équipements mobiles.",
  },
  refrigerants: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Suivez les réfrigérants (fuites, remplissages, etc.).",
  },
  procedes: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Procédés — à venir.",
  },
  sols: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Usage des sols — à venir.",
  },

  products: {
    groupTitle: "Émissions indirects de l'énergie importée",
    posteTitle: "Poste 2",
    description: "Énergie importée (électricité).",
  },
  autre_energie: {
    groupTitle: "Émissions indirects de l'énergie importée",
    posteTitle: "Poste 2",
    description: "Autres énergies importées — à venir.",
  },

  // Cat 3 (new)
  p31: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.1 — Transport en amont.",
  },
  p32: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.2 — Transport en aval.",
  },
  p33: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.3 — Navettage des employés.",
  },
  p34: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.4 — Déplacement des clients.",
  },
  p35: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.5 — Déplacement d'affaires.",
  },
};

export default function Section() {
  const [userId, setUserId] = useState<string | null>(null);
  const [posteVisibility, setPosteVisibility] = useState<Record<string, boolean>>({});
  const [postes, setPostes] = useState<PosteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMenu, setSelectedMenu] = useState<TopKey | string>("dashboard");
  const [activeTop, setActiveTop] = useState<TopKey>("dashboard");
  const [activeGroup, setActiveGroup] = useState<GroupKey | null>("direct");
  const [activeCategory, setActiveCategory] = useState<IsoCategoryKey>("cat1");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: postesData } = await supabase.from("postes").select("id, label, num");
        setPostes((postesData ?? []) as PosteRow[]);

        const { data: visRows } = await supabase
          .from("poste_visibility")
          .select("poste_id, is_hidden")
          .eq("user_id", userId);

        const visMap: Record<string, boolean> = {};
        (visRows ?? []).forEach((row: any) => { visMap[row.poste_id] = row.is_hidden; });
        setPosteVisibility(visMap);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (typeof selectedMenu !== "string") return;
    if (["dashboard", "bilan", "rapport", "notifications"].includes(selectedMenu)) return;

    const cat = menuToIsoCategory(selectedMenu);
    setActiveCategory(cat);
    if (activeTop !== "bilan") setActiveGroup(isoToGroup(cat));
  }, [selectedMenu, activeTop]);

  const posteIdForMenu = (menuKey: string) => {
    const cat = menuToIsoCategory(menuKey);
    const targetNum = isoToPosteNum[cat];
    const poste = postes.find((p) => Number(p.num) === targetNum);
    return poste?.id;
  };

  const renderOrPlaceholder = (menuKey: string, component: JSX.Element) => {
    const poste_id = posteIdForMenu(menuKey);
    const isHidden = poste_id ? posteVisibility[poste_id] : false;
    const label =
      postes.find((p) => p.id === poste_id)?.label ??
      `Poste ${isoToPosteNum[menuToIsoCategory(menuKey)]}`;

    if (poste_id && isHidden) return <HiddenPostePlaceholder label={label} />;
    return component;
  };

  const isPosteKey = (k: string) =>
    ["combustion_fixes", "combustion_mobiles", "refrigerants", "products", "autre_energie", "procedes", "sols"].includes(k) ||
    ["p31", "p32", "p33", "p34", "p35"].includes(k);

  const currentMeta = typeof selectedMenu === "string" ? POSTE_META[selectedMenu] : undefined;
  const groupTitle = currentMeta?.groupTitle ?? "Section";

  const currentPills = useMemo(() => {
    if (activeCategory === "cat1") {
      return [
        { key: "combustion_fixes", title: "1.1 Combustions fixes" },
        { key: "combustion_mobiles", title: "1.2 Combustions mobiles" },
        { key: "procedes", title: "1.3 Procédés", disabled: true },
        { key: "refrigerants", title: "1.4 Émissions fugitives" },
        { key: "sols", title: "1.5 Usage des sols", disabled: true },
      ];
    }
    if (activeCategory === "cat2") {
      return [
        { key: "products", title: "2.1 Énergie importée (électricité)" },
        { key: "autre_energie", title: "2.2 Autres énergies importées", disabled: true },
      ];
    }
    if (activeCategory === "cat3") {
      return [
        { key: "p31", title: "3.1 Transport en amont" },
        { key: "p32", title: "3.2 Transport en aval" },
        { key: "p33", title: "3.3 Navettage des employés" },
        { key: "p34", title: "3.4 Déplacement des clients" },
        { key: "p35", title: "3.5 Déplacement d'affaires" },
      ];
    }
    return [];
  }, [activeCategory]);

  const totalTco2e = 4.255;

  if (!userId && !loading) {
    return (
      <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="lg" color="gray.600">Veuillez vous connecter.</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  const isBilan = selectedMenu === "bilan" || activeTop === "bilan";
  const isDashboard = selectedMenu === "dashboard";

  return (
    <Box display="flex" bg={pageBg} minH="100vh">
      <SidebarRail
        activeGroup={isBilan ? null : activeGroup}
        activeTop={activeTop}
        onGroupChange={(g) => {
          setActiveTop("dashboard");
          setActiveGroup(g);
          const cat = groupToIso(g);
          setActiveCategory(cat);
          setSelectedMenu(defaultMenuForCategory[cat]);
        }}
        onTopSelect={(k) => {
          setActiveTop(k);
          if (k === "dashboard") setSelectedMenu("dashboard");
          if (k === "bilan") { setActiveGroup(null); setSelectedMenu("bilan"); }
          if (k === "rapport") setSelectedMenu("rapport");
        }}
        onNotificationsClick={() => {
          setActiveTop("dashboard");
          setActiveGroup(null);
          setSelectedMenu("notifications");
        }}
      />

      <Box
        flex={1}
        bg={pageBg}
        px={isDashboard ? 0 : { base: 4, md: 8 }}
        py={isDashboard ? 0 : { base: 6, md: 10 }}
        color={COL.textBody}
      >
        {isDashboard ? (
          <NewDashboard />
        ) : (
          <Stack maxW="1200px" mx="auto" spacing={6}>
            {!isBilan && typeof selectedMenu === "string" && isPosteKey(selectedMenu) && (
              <HStack justify="space-between" align="center">
                <Heading as="h1" size="lg">{groupTitle}</Heading>
                <HelpCircle size={18} />
              </HStack>
            )}

            {!isBilan && currentPills.length > 0 && (
              <HStack mt={2} spacing={4} wrap="wrap">
                {currentPills.map((tab) => {
                  const active = selectedMenu === tab.key;
                  const disabled = (tab as any).disabled;
                  return (
                    <Box
                      key={String(tab.key)}
                      as="button"
                      onClick={() => !disabled && setSelectedMenu(String(tab.key))}
                      px={4}
                      h="32px"
                      rounded="16px"
                      border="1px solid"
                      borderColor={active ? COL.greenPill : "#DAD7CD"}
                      bg={active ? COL.greenPill : "white"}
                      color={active ? "white" : COL.textBody}
                      fontWeight={active ? "bold" : "normal"}
                      fontSize="sm"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor={disabled ? "not-allowed" : "pointer"}
                      opacity={disabled ? 0.45 : 1}
                      _hover={!active && !disabled ? { borderColor: COL.greenPill } : {}}
                    >
                      {tab.title}
                    </Box>
                  );
                })}
              </HStack>
            )}

            {!isBilan && typeof selectedMenu === "string" && isPosteKey(selectedMenu) && (
              <HStack align="stretch" spacing={6}>
                <Box
                  flex="1"
                  bg={COL.surface}
                  rounded="2xl"
                  p={{ base: 5, md: 6 }}
                  border="1px solid"
                  borderColor={COL.border}
                  boxShadow={cardShadow}
                >
                  <VStack align="flex-start" spacing={2}>
                    <Heading as="h2" size="md">{currentMeta?.posteTitle ?? "Poste"}</Heading>
                    <Text color={COL.textMuted}>{currentMeta?.description ?? "Section — page à venir."}</Text>
                  </VStack>
                </Box>

                <Box
                  w={{ base: "100%", md: "380px" }}
                  bg={COL.surfaceMuted}
                  rounded="2xl"
                  p={{ base: 6, md: 7 }}
                  border="1px solid"
                  borderColor={COL.border}
                  boxShadow={cardShadow}
                >
                  <VStack spacing={4} align="stretch">
                    <Heading as="h3" size="sm">Votre consommation totale :</Heading>
                    <Heading as="p" size="lg" lineHeight="1.1" color={COL.greenBar}>
                      {Number(totalTco2e).toLocaleString("fr-CA", { maximumFractionDigits: 3 })} t de CO²e
                    </Heading>
                  </VStack>
                </Box>
              </HStack>
            )}

            {/* --------- Dynamic content --------- */}
            {selectedMenu === "notifications" && <NotificationsPage />}
            {selectedMenu === "bilan" && <DashboardPage />}

            {/* ✅ Cat 1 */}
            {["combustion_fixes","combustion_mobiles","refrigerants","procedes","sols"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie1Page activeSubKey={String(selectedMenu)} />
              )
            }

            {/* ✅ Cat 2 */}
            {["products","autre_energie"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie2EnergiePage activeSubKey={String(selectedMenu)} />
              )
            }

            {/* ✅ Cat 3 (NEW): always pass activeSubKey to main router */}
            {["p31","p32","p33","p34","p35"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie3Page activeSubKey={String(selectedMenu)} />
              )
            }

            {selectedMenu === "rapport" && (
              <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
                <Text>Rapport — page à venir.</Text>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

// 'use client';

// import { useEffect, useMemo, useState } from "react";
// import {
//   Box,
//   Stack,
//   HStack,
//   VStack,
//   Heading,
//   Text,
//   Spinner,
// } from "@chakra-ui/react";
// import { FiHelpCircle as HelpCircle } from "react-icons/fi";
// import { supabase } from "../../lib/supabaseClient";

// import SidebarRail from "./SidebarRail";

// import NewDashboard from "#components/newdashboard";
// import DashboardPage from "#components/postes/dash";

// import Categorie1Page from "#components/postes/Categorie1/main";
// import Categorie2EnergiePage from "#components/postes/-Categorie2-poste6/main";
// import Categorie3Page from "#components/postes/Categorie 3/main";

// import NotificationsPage from "#components/postes/entreprise";
// import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";

// const pageBg = "#F3F6EF";
// const cardShadow = "0 10px 28px rgba(0,0,0,0.07)";
// const COL = {
//   textBody: "#213A2E",
//   textMuted: "#51645B",
//   surface: "#FFFFFF",
//   surfaceMuted: "#EAF1EC",
//   border: "#E1E7E3",
//   greenPill: "#264a3b",
//   greenBar: "#214B3A",
// };

// type PosteRow = { id: string; label: string; num?: number };
// type TopKey = "dashboard" | "bilan" | "rapport";

// type GroupKey =
//   | "direct"
//   | "energie_importee"
//   | "transports"
//   | "produits_utilises"
//   | "utilisation_produits"
//   | "autres_indirects";

// type IsoCategoryKey = "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | "cat6";

// const menuToIsoCategory = (menuKey: string): IsoCategoryKey => {
//   if (["combustion_fixes", "combustion_mobiles", "procedes", "refrigerants", "sols"].includes(menuKey)) return "cat1";
//   if (["products", "autre_energie"].includes(menuKey)) return "cat2";
//   if (["p12", "p17", "p22", "p16", "p13"].includes(menuKey)) return "cat3";
//   if (["p9", "p10", "p11", "p14"].includes(menuKey)) return "cat4";
//   if (["p18", "p21", "p19", "p15", "p20"].includes(menuKey)) return "cat5";
//   return "cat6";
// };

// const defaultMenuForCategory: Record<IsoCategoryKey, string> = {
//   cat1: "combustion_fixes",
//   cat2: "products",
//   cat3: "p12",
//   cat4: "p9",
//   cat5: "p18",
//   cat6: "p23",
// };

// const isoToGroup = (cat: IsoCategoryKey): GroupKey => {
//   if (cat === "cat1") return "direct";
//   if (cat === "cat2") return "energie_importee";
//   if (cat === "cat3") return "transports";
//   if (cat === "cat4") return "produits_utilises";
//   if (cat === "cat5") return "utilisation_produits";
//   return "autres_indirects";
// };

// const groupToIso = (g: GroupKey): IsoCategoryKey => {
//   if (g === "direct") return "cat1";
//   if (g === "energie_importee") return "cat2";
//   if (g === "transports") return "cat3";
//   if (g === "produits_utilises") return "cat4";
//   if (g === "utilisation_produits") return "cat5";
//   return "cat6";
// };

// /** ✅ DB TRUTH: categories map to poste.num */
// const isoToPosteNum: Record<IsoCategoryKey, number> = {
//   cat1: 1, // Catégorie 1 = Poste 1
//   cat2: 2, // ✅ Catégorie 2 = Poste 2
//   cat3: 3, // Catégorie 3 = Poste 3
//   cat4: 4,
//   cat5: 5,
//   cat6: 6,
// };

// const POSTE_META: Record<string, { groupTitle: string; posteTitle: string; description: string }> = {
//   combustion_fixes: {
//     groupTitle: "Émissions directs",
//     posteTitle: "Poste 1",
//     description: "Saisissez vos combustibles fixes (chaudières, fours, etc.).",
//   },
//   combustion_mobiles: {
//     groupTitle: "Émissions directs",
//     posteTitle: "Poste 1",
//     description: "Saisissez vos véhicules / équipements mobiles.",
//   },
//   refrigerants: {
//     groupTitle: "Émissions directs",
//     posteTitle: "Poste 1",
//     description: "Suivez les réfrigérants (fuites, remplissages, etc.).",
//   },
//   procedes: {
//     groupTitle: "Émissions directs",
//     posteTitle: "Poste 1",
//     description: "Procédés — à venir.",
//   },
//   sols: {
//     groupTitle: "Émissions directs",
//     posteTitle: "Poste 1",
//     description: "Usage des sols — à venir.",
//   },

//   products: {
//     groupTitle: "Émissions indirects de l'énergie importée",
//     posteTitle: "Poste 2",
//     description: "Énergie importée (électricité).",
//   },
//   autre_energie: {
//     groupTitle: "Émissions indirects de l'énergie importée",
//     posteTitle: "Poste 2",
//     description: "Autres énergies importées — à venir.",
//   },

//   p12: {
//     groupTitle: "Émissions indirects des transports",
//     posteTitle: "Poste 3",
//     description: "Transport et distribution en amont.",
//   },
// };

// export default function Section() {
//   const [userId, setUserId] = useState<string | null>(null);
//   const [posteVisibility, setPosteVisibility] = useState<Record<string, boolean>>({});
//   const [postes, setPostes] = useState<PosteRow[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [selectedMenu, setSelectedMenu] = useState<TopKey | string>("dashboard");
//   const [activeTop, setActiveTop] = useState<TopKey>("dashboard");
//   const [activeGroup, setActiveGroup] = useState<GroupKey | null>("direct");
//   const [activeCategory, setActiveCategory] = useState<IsoCategoryKey>("cat1");

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       setUserId(user?.id ?? null);
//       setLoading(false);
//     })();
//   }, []);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       setLoading(true);
//       try {
//         const { data: postesData } = await supabase.from("postes").select("id, label, num");
//         setPostes((postesData ?? []) as PosteRow[]);

//         const { data: visRows } = await supabase
//           .from("poste_visibility")
//           .select("poste_id, is_hidden")
//           .eq("user_id", userId);

//         const visMap: Record<string, boolean> = {};
//         (visRows ?? []).forEach((row: any) => { visMap[row.poste_id] = row.is_hidden; });
//         setPosteVisibility(visMap);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   useEffect(() => {
//     if (typeof selectedMenu !== "string") return;
//     if (["dashboard", "bilan", "rapport", "notifications"].includes(selectedMenu)) return;

//     const cat = menuToIsoCategory(selectedMenu);
//     setActiveCategory(cat);
//     if (activeTop !== "bilan") setActiveGroup(isoToGroup(cat));
//   }, [selectedMenu, activeTop]);

//   const posteIdForMenu = (menuKey: string) => {
//     const cat = menuToIsoCategory(menuKey);
//     const targetNum = isoToPosteNum[cat];
//     const poste = postes.find((p) => Number(p.num) === targetNum);
//     return poste?.id;
//   };

//   const renderOrPlaceholder = (menuKey: string, component: JSX.Element) => {
//     const poste_id = posteIdForMenu(menuKey);
//     const isHidden = poste_id ? posteVisibility[poste_id] : false;
//     const label =
//       postes.find((p) => p.id === poste_id)?.label ??
//       `Poste ${isoToPosteNum[menuToIsoCategory(menuKey)]}`;

//     if (poste_id && isHidden) return <HiddenPostePlaceholder label={label} />;
//     return component;
//   };

//   const isPosteKey = (k: string) =>
//     ["combustion_fixes", "combustion_mobiles", "refrigerants", "products", "autre_energie", "procedes", "sols"].includes(k) ;

//   const currentMeta = typeof selectedMenu === "string" ? POSTE_META[selectedMenu] : undefined;
//   const groupTitle = currentMeta?.groupTitle ?? "Section";

//   const currentPills = useMemo(() => {
//     if (activeCategory === "cat1") {
//       return [
//         { key: "combustion_fixes", title: "1.1 Combustions fixes" },
//         { key: "combustion_mobiles", title: "1.2 Combustions mobiles" },
//         { key: "procedes", title: "1.3 Procédés", disabled: true },
//         { key: "refrigerants", title: "1.4 Émissions fugitives" },
//         { key: "sols", title: "1.5 Usage des sols", disabled: true },
//       ];
//     }
//     if (activeCategory === "cat2") {
//       return [
//         { key: "products", title: "2.1 Énergie importée (électricité)" },
//         { key: "autre_energie", title: "2.2 Autres énergies importées", disabled: true },
//       ];
//     }
//     if (activeCategory === "cat3") {
//       return [
//         { key: "p22", title: "3.1 Transport en amont" },
//         { key: "p12", title: "3.3 Navettage"},
//         { key: "p18", title: "3.4 Déplacement des clients" },
//       ];
//     }
//     return [];
//   }, [activeCategory]);

//   const totalTco2e = 4.255;

//   if (!userId && !loading) {
//     return (
//       <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
//         <Text fontSize="lg" color="gray.600">Veuillez vous connecter.</Text>
//       </Box>
//     );
//   }

//   if (loading) {
//     return (
//       <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
//         <Spinner size="xl" />
//       </Box>
//     );
//   }

//   const isBilan = selectedMenu === "bilan" || activeTop === "bilan";
//   const isDashboard = selectedMenu === "dashboard";

//   return (
//     <Box display="flex" bg={pageBg} minH="100vh">
//       <SidebarRail
//         activeGroup={isBilan ? null : activeGroup}
//         activeTop={activeTop}
//         onGroupChange={(g) => {
//           setActiveTop("dashboard");
//           setActiveGroup(g);
//           const cat = groupToIso(g);
//           setActiveCategory(cat);
//           setSelectedMenu(defaultMenuForCategory[cat]);
//         }}
//         onTopSelect={(k) => {
//           setActiveTop(k);
//           if (k === "dashboard") setSelectedMenu("dashboard");
//           if (k === "bilan") { setActiveGroup(null); setSelectedMenu("bilan"); }
//           if (k === "rapport") setSelectedMenu("rapport");
//         }}
//         onNotificationsClick={() => {
//           setActiveTop("dashboard");
//           setActiveGroup(null);
//           setSelectedMenu("notifications");
//         }}
//       />

//       <Box
//         flex={1}
//         bg={pageBg}
//         px={isDashboard ? 0 : { base: 4, md: 8 }}
//         py={isDashboard ? 0 : { base: 6, md: 10 }}
//         color={COL.textBody}
//       >
//         {isDashboard ? (
//           <NewDashboard />
//         ) : (
//           <Stack maxW="1200px" mx="auto" spacing={6}>
//             {!isBilan && typeof selectedMenu === "string" && isPosteKey(selectedMenu) && (
//               <HStack justify="space-between" align="center">
//                 <Heading as="h1" size="lg">{groupTitle}</Heading>
//                 <HelpCircle size={18} />
//               </HStack>
//             )}

//             {/* ✅ sub-category pills only */}
//             {!isBilan && currentPills.length > 0 && (
//               <HStack mt={2} spacing={4} wrap="wrap">
//                 {currentPills.map((tab) => {
//                   const active = selectedMenu === tab.key;
//                   const disabled = (tab as any).disabled;
//                   return (
//                     <Box
//                       key={String(tab.key)}
//                       as="button"
//                       onClick={() => !disabled && setSelectedMenu(String(tab.key))}
//                       px={4}
//                       h="32px"
//                       rounded="16px"
//                       border="1px solid"
//                       borderColor={active ? COL.greenPill : "#DAD7CD"}
//                       bg={active ? COL.greenPill : "white"}
//                       color={active ? "white" : COL.textBody}
//                       fontWeight={active ? "bold" : "normal"}
//                       fontSize="sm"
//                       display="flex"
//                       alignItems="center"
//                       justifyContent="center"
//                       cursor={disabled ? "not-allowed" : "pointer"}
//                       opacity={disabled ? 0.45 : 1}
//                       _hover={!active && !disabled ? { borderColor: COL.greenPill } : {}}
//                     >
//                       {tab.title}
//                     </Box>
//                   );
//                 })}
//               </HStack>
//             )}

//             {!isBilan && typeof selectedMenu === "string" && isPosteKey(selectedMenu) && (
//               <HStack align="stretch" spacing={6}>
//                 <Box
//                   flex="1"
//                   bg={COL.surface}
//                   rounded="2xl"
//                   p={{ base: 5, md: 6 }}
//                   border="1px solid"
//                   borderColor={COL.border}
//                   boxShadow={cardShadow}
//                 >
//                   <VStack align="flex-start" spacing={2}>
//                     <Heading as="h2" size="md">{currentMeta?.posteTitle ?? "Poste"}</Heading>
//                     <Text color={COL.textMuted}>{currentMeta?.description ?? "Section — page à venir."}</Text>
//                   </VStack>
//                 </Box>

//                 <Box
//                   w={{ base: "100%", md: "380px" }}
//                   bg={COL.surfaceMuted}
//                   rounded="2xl"
//                   p={{ base: 6, md: 7 }}
//                   border="1px solid"
//                   borderColor={COL.border}
//                   boxShadow={cardShadow}
//                 >
//                   <VStack spacing={4} align="stretch">
//                     <Heading as="h3" size="sm">Votre consommation totale :</Heading>
//                     <Heading as="p" size="lg" lineHeight="1.1" color={COL.greenBar}>
//                       {Number(totalTco2e).toLocaleString("fr-CA", { maximumFractionDigits: 3 })} t de CO²e
//                     </Heading>
//                   </VStack>
//                 </Box>
//               </HStack>
//             )}

//             {/* --------- Dynamic content --------- */}
//             {selectedMenu === "notifications" && <NotificationsPage />}
//             {selectedMenu === "bilan" && <DashboardPage />}

//             {/* ✅ Cat 1: map pills -> one page, filtered inside */}
//             {["combustion_fixes","combustion_mobiles","refrigerants","procedes","sols"].includes(String(selectedMenu)) &&
//               renderOrPlaceholder(
//                 String(selectedMenu),
//                 <Categorie1Page activeSubKey={String(selectedMenu)} />
//               )
//             }

//             {/* ✅ Cat 2: IMPORTANT => pass activeSubKey so page filters sources by pill */}
//             {["products","autre_energie"].includes(String(selectedMenu)) &&
//               renderOrPlaceholder(
//                 String(selectedMenu),
//                 <Categorie2EnergiePage activeSubKey={String(selectedMenu)} />
//               )
//             }

//             {/* ✅ Cat 3 */}
//             {selectedMenu === "p12" &&
//               renderOrPlaceholder("p12", <Categorie3Page />)}

//             {selectedMenu === "rapport" && (
//               <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
//                 <Text>Rapport — page à venir.</Text>
//               </Box>
//             )}
//           </Stack>
//         )}
//       </Box>
//     </Box>
//   );
// }

